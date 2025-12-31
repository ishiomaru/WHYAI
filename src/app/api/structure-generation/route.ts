// ============================================
// Structure Generation API Endpoint
// Next.js App Router API Route
// ============================================
//
// リファクタリング後: ビジネスロジックはStructureGenerationPipelineに委譲
// route.tsはAPIエンドポイントの入出力処理のみを担当
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { CollectionGateController } from '@/lib/external';
import { structureGenerationPipeline } from '@/lib/orchestration/pipeline';
import type { OperatorLogEntry, LearningStructureOutput, SearchQuery } from '@/lib/structure-generation-types';

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
  currentNodes?: any[];
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

    // 収集可否チェック
    if (!collectionGate.canCollect()) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Collection not allowed in current phase', code: 'COLLECTION_LOCKED' },
        { status: 503 }
      );
    }

    // パイプライン実行（すべてのビジネスロジックを委譲）
    const result = await structureGenerationPipeline.execute({
      purposeAlpha: body.purposeAlpha,
      purposeBetaHypothesis: body.purposeBetaHypothesis,
      axis1Tentative: body.axis1Tentative,
      operatorLogs: body.operatorLogs,
      externalHtml: body.externalHtml,
      currentNodes: body.currentNodes
    });

    // レスポンス構築
    const response: GenerateStructureResponse = {
      structure: result.structure,
      searchQuery: result.searchQuery,
      lostStateEstimate: {
        dominantState: result.lostStateEstimate.dominantState,
        confidence: result.lostStateEstimate.confidence,
        isCritical: result.lostStateEstimate.isCritical
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

