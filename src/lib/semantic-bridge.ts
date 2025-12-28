
import { 
  ExternalResource, 
  StructureNode, 
  NodeRole,
  OperatorLogEntry,
  StructuralDeltaType,
  LostState
} from './structure-generation-types';

// ============================================
// Semantic Bridge
// 数値的データと意味的意図の架け橋
// ============================================

export type UserIntent = 'DEEP_DIVE' | 'BROAD_EXPLORATION' | 'SPECIFIC_NEED' | 'UNCLEAR';

export interface SemanticState {
  readonly intent: UserIntent;
  readonly drift: number; // 0.0 - 1.0 (1.0 = 完全に漂流)
  readonly detectedKeywords: string[];
}

import { aiService } from './ai-service';

/**
 * IntentClassifier
 * ユーザー入力と履歴から意図を分類する
 */
export class IntentClassifier {
  
  /**
   * 意図を解析する
   */
  static async analyze(input: string, history: OperatorLogEntry[]): Promise<SemanticState> {
    
    // AI Serviceを使用して意図とドリフトを解析
    const historySummary = history.map(h => `${h.operatorId}:${h.attemptType}`).join(', ');
    const aiResult = await aiService.classifyIntent(input, historySummary);
    
    // Convert generic keywords (not provided by AI explicit list, but we can infer or leave empty)
    // AIのレスポンスに合わせて調整
    let keywords: string[] = [];
    if (aiResult.intent === 'DEEP_DIVE') keywords = ['deep', 'mechanism'];
    if (aiResult.intent === 'BROAD_EXPLORATION') keywords = ['broad', 'howto'];

    return {
      intent: aiResult.intent,
      drift: aiResult.driftScore,
      detectedKeywords: keywords
    };
  }
  // calculateDrift is removed as it is now handled by AI
}

/**
 * ProjectionMapper
 * 外部リソースを構造ノードへマッピングする
 */
export class ProjectionMapper {

  /**
   * 検索結果をResourceProxyノードに変換
   */
  static mapToNodes(
    resources: ExternalResource[], 
    currentDepth: number
  ): StructureNode[] {
    return resources.map((res, index) => ({
      id: `res-${res.id}`,
      role: 'RESOURCE_PROXY',
      label: `Resource ${res.id.slice(-4)}`, // Simple label for now
      depth: currentDepth + 1,
      createdAt: Date.now(),
      sourceRef: res.id,
      // Note: StructureNodeにはcontentやtitleを持たせない制約がある。
      // UI側では、sourceRefを通じてExternalResourcePoolから情報を引く形になる。
    }));
  }
  
  /**
   * 意図に基づいてリソースをフィルタリング・ソート
   * (High Granularity vs Low Granularity)
   */
  static filterResources(
    resources: ExternalResource[],
    intent: UserIntent
  ): ExternalResource[] {
    if (intent === 'DEEP_DIVE') {
      // 深掘りの場合、粒度の高い（細かい）情報を優先
      return resources.filter(r => r.structureHint.granularity === 'HIGH' || r.structureHint.granularity === 'MID');
    } else {
      // 探索の場合、粒度の低い（荒い、まとまった）情報を優先
      return resources.filter(r => r.structureHint.granularity === 'LOW' || r.structureHint.granularity === 'MID');
    }
  }
}
