// ============================================
// Structure Generation Pipeline
// メイン処理パイプライン - route.tsから抽出したビジネスロジック
// ============================================

import { IntentAnalyzer, SemanticState } from '../input/intent-analyzer';
import { ProjectionMapper } from '../input/projection-mapper';
import { DominantStrayStateEstimator, StructuralFactAnalyzer, determineOutputControl, HomeostaticController } from '../core';
import { generateSearchQuery, chunkWithoutMeaning } from '../external';
import { generateLearningStructure } from '../generation';
import { LearnerSupportService } from './learner-support-service';
import type { 
  OperatorLogEntry, 
  LearningStructureOutput, 
  SearchQuery,
  ExternalResource,
  StructureNode,
  LostStateEstimate
} from '../types';

/**
 * パイプライン入力
 */
export interface PipelineInput {
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
  currentNodes?: StructureNode[];
}

/**
 * パイプライン出力
 */
export interface PipelineOutput {
  /** 生成された学習構造 */
  structure: LearningStructureOutput;
  /** 使用された検索クエリ */
  searchQuery: SearchQuery;
  /** 迷子状態推定結果 */
  lostStateEstimate: LostStateEstimate;
}

/**
 * Structure Generation Pipeline
 * 
 * route.tsから抽出したビジネスロジックを統括するパイプライン。
 * 各サービスの呼び出し順序と責務を明確化。
 */
export class StructureGenerationPipeline {
  private estimator = new DominantStrayStateEstimator();

  /**
   * パイプラインを実行
   */
  async execute(input: PipelineInput): Promise<PipelineOutput> {
    // 【選択】プレフィックスの除去 (AIの誤解釈防止)
    const cleanedPurpose = input.purposeAlpha.replace(/^[【\[]選択[\]】]\s*/, '');

    // 1. 意味的解析 (Intent Analysis)
    const semanticState = await IntentAnalyzer.analyze(
      cleanedPurpose, 
      input.operatorLogs || []
    );

    // 2. 検索クエリ生成
    const searchQuery = generateSearchQuery(
      cleanedPurpose,
      input.purposeBetaHypothesis,
      input.axis1Tentative
    );

    // 3. 外部リソース取得
    let externalResources: ExternalResource[] = [];
    if (!input.externalHtml) {
      const { executeWebSearch } = await import('../external');
      externalResources = await executeWebSearch(searchQuery);
    }

    // 4. 迷子状態推定
    const lostStateEstimate = this.estimateLostState(input.operatorLogs || []);

    // 5. ホメオスタシス制御
    const homeostaticState = HomeostaticController.integrateState(lostStateEstimate, semanticState);
    const action = HomeostaticController.decideAction(homeostaticState, externalResources);

    // 6. 構造生成
    let structure = await this.generateStructure(
      action,
      lostStateEstimate,
      semanticState,
      externalResources,
      input,
      cleanedPurpose
    );

    // 7. Learner Support Extension
    structure = await this.applyLearnerSupport(
      structure,
      input,
      lostStateEstimate,
      cleanedPurpose,
      action === 'PROJECTION' ? externalResources : []
    );

    return {
      structure,
      searchQuery,
      lostStateEstimate
    };
  }

  /**
   * 迷子状態を推定
   */
  private estimateLostState(operatorLogs: OperatorLogEntry[]): LostStateEstimate {
    if (operatorLogs.length > 0) {
      const deltas = operatorLogs.map(log => log.structuralDelta);
      return this.estimator.estimate(operatorLogs, deltas);
    }

    // デフォルト推定（初学者扱い）
    return {
      dominantState: 'M0',
      confidence: 'LOW',
      isCritical: false,
      observationBasis: []
    };
  }

  /**
   * 構造を生成
   */
  private async generateStructure(
    action: 'QUESTION' | 'PROJECTION',
    lostStateEstimate: LostStateEstimate,
    semanticState: SemanticState,
    externalResources: ExternalResource[],
    input: PipelineInput,
    cleanedPurpose: string
  ): Promise<LearningStructureOutput> {
    const rawChunks = input.externalHtml 
      ? chunkWithoutMeaning(input.externalHtml)
      : externalResources.flatMap(r => [...r.rawChunks]);

    if (action === 'PROJECTION') {
      return this.generateProjection(
        rawChunks, 
        lostStateEstimate, 
        semanticState, 
        externalResources, 
        input.currentNodes || []
      );
    } else {
      return this.generateIntervention(
        rawChunks, 
        lostStateEstimate, 
        cleanedPurpose, 
        input.currentNodes || []
      );
    }
  }

  /**
   * 投影モードの構造生成
   */
  private async generateProjection(
    rawChunks: any[],
    lostStateEstimate: LostStateEstimate,
    semanticState: SemanticState,
    externalResources: ExternalResource[],
    currentNodes: StructureNode[]
  ): Promise<LearningStructureOutput> {
    const baseStructure = generateLearningStructure(rawChunks, lostStateEstimate, {
      showLayerA: true, showLayerB: true, showLayerC: false,
      layerBEmphasis: false, sequenceFixed: false
    });

    const projectedNodes = HomeostaticController.executeProjection(
      semanticState, externalResources, currentNodes
    );

    const resourceChunks = projectedNodes.map(node => ({
      id: node.id,
      text: `[RESOURCE] ${node.sourceRef}`,
      collapsed: false,
      groupId: null
    }));

    return {
      ...baseStructure,
      layerA: {
        ...baseStructure.layerA,
        chunks: [...baseStructure.layerA.chunks, ...resourceChunks]
      }
    };
  }

  /**
   * 介入モードの構造生成
   */
  private async generateIntervention(
    rawChunks: any[],
    lostStateEstimate: LostStateEstimate,
    cleanedPurpose: string,
    currentNodes: StructureNode[]
  ): Promise<LearningStructureOutput> {
    if (lostStateEstimate.isCritical) {
      const { CriticalInterventionController } = await import('../core/intervention-controller');
      const criticalCtrl = new CriticalInterventionController();
      const sequence = await criticalCtrl.executeIntervention(
        lostStateEstimate, cleanedPurpose, currentNodes
      );

      return generateLearningStructure(rawChunks, lostStateEstimate, {
        showLayerA: true, showLayerB: true, showLayerC: true,
        layerBEmphasis: false, sequenceFixed: true
      }, sequence.layerC);
    }

    // 通常介入
    const outputControl = determineOutputControl(lostStateEstimate);

    let derivedQuestion: any;
    if (outputControl.showLayerC) {
      const { StrictInterventionController } = await import('../core/intervention-controller');
      const strictCtrl = new StrictInterventionController();
      derivedQuestion = await strictCtrl.deriveIntervention(
        lostStateEstimate, 
        { purposeAlpha: cleanedPurpose },
        currentNodes
      );
    }

    return generateLearningStructure(rawChunks, lostStateEstimate, outputControl, derivedQuestion);
  }

  /**
   * Learner Supportを適用
   */
  private async applyLearnerSupport(
    structure: LearningStructureOutput,
    input: PipelineInput,
    lostStateEstimate: LostStateEstimate,
    cleanedPurpose: string,
    externalResources: ExternalResource[]
  ): Promise<LearningStructureOutput> {
    const currentNodes = input.currentNodes || [];
    const logs = input.operatorLogs || [];
    const logsDeltas = logs.map(l => l.structuralDelta);
    const fact = StructuralFactAnalyzer.analyze(logs, logsDeltas, currentNodes);

    const supportPayload = await LearnerSupportService.execute(
      currentNodes,
      logs,
      lostStateEstimate.dominantState,
      fact,
      cleanedPurpose,
      externalResources
    );

    return {
      ...structure,
      support: supportPayload
    };
  }
}

// シングルトンインスタンス
export const structureGenerationPipeline = new StructureGenerationPipeline();
