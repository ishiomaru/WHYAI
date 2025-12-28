// ============================================
// Structure Generation API Endpoint
// Next.js App Router API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSearchQuery,
  chunkWithoutMeaning,
  createExternalResource,
  CollectionGateController
} from '@/lib/rag-control-service';
import {
  generateLearningStructure
} from '@/lib/learning-structure-generator';
import {
  DominantStrayStateEstimator
} from '@/lib/intervention-control-service';
import type {
  OperatorLogEntry,
  LearningStructureOutput,
  SearchQuery
} from '@/lib/structure-generation-types';

// ============================================
// Request/Response Types
// ============================================

// ============================================
// Request/Response Types
// ============================================

interface GenerateStructureRequest {
  /** 表層目的（学習者入力） */
  purposeAlpha: string;
  /** 生成的目的（仮説） */
  purposeBetaHypothesis?: string;
  /** 判断軸1（仮） */
  axis1Tentative?: string;
  /** 操作子ログ（迷子状態推定用） */
  operatorLogs?: OperatorLogEntry[];
  /** 外部HTML（オプション、テスト用） */
  externalHtml?: string;
  /** 現在のノード構造（コンテキスト維持用） */
  currentNodes?: any[]; // StructureNode[] but using loose type for now to match API usage
}

interface GenerateStructureResponse {
  /** 生成された学習構造 */
  structure: LearningStructureOutput;
  /** 使用された検索クエリ */
  searchQuery: SearchQuery;
  /** 迷子状態推定結果 */
  lostStateEstimate?: {
    dominantState: string;
    confidence: string;
    isCritical: boolean;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
}

// ============================================
// Collection Gate (Singleton)
// ============================================

const collectionGate = new CollectionGateController();
const estimator = new DominantStrayStateEstimator();

// ============================================
// API Handler
// ============================================

/**
 * POST /api/structure-generation
 * 
 * 学習構造を生成するAPIエンドポイント
 * 
 * 【重要制約】
 * - 思考の代行禁止: 重要度判断、推奨、評価を行わない
 * - 意味付け禁止: コンテンツの要約、解釈を行わない
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストパース
    const body = await request.json() as GenerateStructureRequest;
    
    // バリデーション
    if (!body.purposeAlpha || typeof body.purposeAlpha !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'purposeAlpha is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // 【選択】プレフィックスの除去 (AIの誤解釈防止)
    // フロントエンドが送る "【選択】ユーザの回答" からマーカーを除去し、純粋な回答のみにする
    let cleanedPurpose = body.purposeAlpha.replace(/^[【\[]選択[\]】]\s*/, '');
    
    // 収集可否チェック
    if (!collectionGate.canCollect()) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Collection not allowed in current phase', code: 'COLLECTION_LOCKED' },
        { status: 503 }
      );
    }

    // 1. 意味的解析 (Semantic Bridge)
    // ユーザー入力から意図とドリフトを解析
    const { IntentClassifier } = await import('@/lib/semantic-bridge');
    const semanticState = await IntentClassifier.analyze(
      cleanedPurpose, 
      body.operatorLogs || []
    );

    
    // 2. 検索クエリ生成 & 外部リソース取得
    // 意図に基づいて検索を行う（役割上限遵守）
    const searchQuery = generateSearchQuery(
      cleanedPurpose,
      body.purposeBetaHypothesis,
      body.axis1Tentative
    );
    
    let rawChunks: import('@/lib/structure-generation-types').RawChunk[] = [];
    let externalResources: import('@/lib/structure-generation-types').ExternalResource[] = [];

    if (body.externalHtml) {
      rawChunks = chunkWithoutMeaning(body.externalHtml);
    } else {
      const { executeWebSearch } = await import('@/lib/web-search-service');
      // 検索実行
      externalResources = await executeWebSearch(searchQuery);
      rawChunks = externalResources.flatMap(r => [...r.rawChunks]);
    }
    
    // 3. 迷子状態推定 (DominantStrayStateEstimator)
    let lostStateEstimate: import('@/lib/structure-generation-types').LostStateEstimate | undefined;
    if (body.operatorLogs && body.operatorLogs.length > 0) {
      const deltas = body.operatorLogs.map(log => log.structuralDelta);
      lostStateEstimate = estimator.estimate(body.operatorLogs, deltas);
    }

    // デフォルト推定（初学者扱い）
    if (!lostStateEstimate) {
       lostStateEstimate = {
         dominantState: 'M0', // 初期状態
         confidence: 'LOW',
         isCritical: false,
         observationBasis: []
       };
    }
    
    // 4. 動的ホメオスタシス制御 (Homeostatic Controller)
    const { HomeostaticController } = await import('@/lib/homeostatic-controller');
    // 状態統合
    const homeostaticState = HomeostaticController.integrateState(lostStateEstimate, semanticState);
    
    // アクション決定 (問い vs 投影)
    const action = HomeostaticController.decideAction(homeostaticState, externalResources);
    
    let structure: LearningStructureOutput;

    if (action === 'PROJECTION') {
        // === 資源投影モード ===
        // 現在の学習構造（Layer A）を生成し、そこにリソースノードを追加する
        // ※ 本来は以前の構造を引き継ぐべきだが、簡易的に新規生成＋マージを行う
        const baseStructure = generateLearningStructure(rawChunks, lostStateEstimate, {
             showLayerA: true, showLayerB: true, showLayerC: false, // 問いは出さない
             layerBEmphasis: false, sequenceFixed: false
        });

        // リソースのマッピング
        // ※ Layer Aのchunksに仮想的に追加する、または専用のプロパティが必要検討
        // ここでは、LearningStructureGeneratorがResourceProxy対応していないため、
        // 暫定的に「ChunkData」としてテキスト化して追加する（UI側でリンクとして扱えるよう工夫が必要）
        // または、LayerAの拡張が必要。
        // ★以前のドキュメントの「構造的再編」概念を利用する
        // しかし、LearningStructureOutput型にリソース用フィールドがないため、
        // 暫定的に `layerA.chunks` に混ぜる（設計上の課題点だがブリッジとして実装）
        
        const { ProjectionMapper } = await import('@/lib/semantic-bridge');
        // 既存構造を引き継いでリソースノードを追加
        const projectedNodes = HomeostaticController.executeProjection(
            semanticState, externalResources, body.currentNodes || []
        );
        
        const resourceChunks = projectedNodes.map(node => ({
            id: node.id,
            text: `[RESOURCE] ${node.sourceRef}`, // UI側でこれを検知してリンク表示する想定
            collapsed: false,
            groupId: null
        }));

        structure = {
            ...baseStructure,
            layerA: {
                ...baseStructure.layerA,
                chunks: [...baseStructure.layerA.chunks, ...resourceChunks]
            }
        };

    } else {
        // === 介入モード (問い) ===
        // 既存のControl Logic + CriticalInterventionControllerの復活
        
        // 臨界点処理
        if (lostStateEstimate.isCritical) {
            const { CriticalInterventionController } = await import('@/lib/intervention-control-service');
            const criticalCtrl = new CriticalInterventionController();
            
            // 臨界点での問いを導出
            const sequence = await criticalCtrl.executeIntervention(lostStateEstimate, cleanedPurpose, body.currentNodes || []);
            
            // 型を正しく合わせる: LearningStructureOutputを生成
            // 臨界点では全レイヤーを表示、問いは導出されたものを使用
            structure = generateLearningStructure(rawChunks, lostStateEstimate, {
                showLayerA: true,
                showLayerB: true,
                showLayerC: true,
                layerBEmphasis: false,
                sequenceFixed: true  // 臨界点では順序固定
            }, sequence.layerC);
            
        } else {
            // 通常介入
            // OutputControlの決定
            const { determineOutputControl, StrictInterventionController } = await import('@/lib/intervention-control-service');
            const outputControl = determineOutputControl(lostStateEstimate);
            
            // 問いの厳格な導出 (Layer C)
            let derivedQuestion: import('@/lib/structure-generation-types').StructuralQuestion | undefined;
            if (outputControl.showLayerC) {
                const strictCtrl = new StrictInterventionController();
                // 厳格なルールに基づいて問いを生成
                derivedQuestion = await strictCtrl.deriveIntervention(
                    lostStateEstimate, 
                    { purposeAlpha: cleanedPurpose },
                    body.currentNodes || []
                );
            }

            structure = generateLearningStructure(rawChunks, lostStateEstimate, outputControl, derivedQuestion);
        }
    }

    // 5. Learner Support Extension (Section VI)
    // 学習者の迷子状態に合わせて、投影・地形・サンドボックスを生成
    
    // 現在のノード
    const currentNodes: any[] = body.currentNodes || []; 

    // StructuralFactの計算
    const { StructuralFactAnalyzer } = await import('@/lib/intervention-control-service');
    const logs = body.operatorLogs || [];
    const logsDeltas = logs.map((l: any) => l.structuralDelta);
    const fact = StructuralFactAnalyzer.analyze(logs, logsDeltas, currentNodes);
    

    const { LearnerSupportService } = await import('@/lib/learner-support-service');
    const supportPayload = await LearnerSupportService.execute(
        currentNodes,
        logs,
        lostStateEstimate.dominantState,
        fact,
        cleanedPurpose,  // 学習者入力を渡す
        action === 'PROJECTION' ? externalResources : [] // 投影モード時のみリソースを渡す
    );
    
    // Support Payloadを統合
    // LearningStructureOutput型にsupportを追加したため、型アサーション不要
    structure = {
        ...structure,
        support: supportPayload
    };
    
    // レスポンス構築
    const response: GenerateStructureResponse = {
      structure,
      searchQuery,
      lostStateEstimate: {
        dominantState: lostStateEstimate.dominantState,
        confidence: lostStateEstimate.confidence,
        isCritical: lostStateEstimate.isCritical
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Structure generation error:', error);
    
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/structure-generation
 * 
 * API情報を返す
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'Structure Generation API',
    version: '1.0.0',
    endpoints: {
      'POST /api/structure-generation': {
        description: '学習構造を生成',
        requestBody: {
          purposeAlpha: 'string (required)',
          purposeBetaHypothesis: 'string (optional)',
          axis1Tentative: 'string (optional)',
          operatorLogs: 'OperatorLogEntry[] (optional)',
          externalHtml: 'string (optional, for testing)'
        }
      }
    },
    constraints: [
      '思考の代行禁止: 重要度判断、推奨、評価を行わない',
      '意味付け禁止: コンテンツの要約、解釈を行わない'
    ]
  });
}
