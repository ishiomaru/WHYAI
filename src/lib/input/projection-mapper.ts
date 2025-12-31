// ============================================
// Projection Mapper
// 外部リソースを構造ノードへマッピング
// ============================================

import { 
  ExternalResource, 
  StructureNode
} from '../types';
import { UserIntent } from './intent-analyzer';

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
    return resources.map((res) => ({
      id: `res-${res.id}`,
      role: 'RESOURCE_PROXY' as const,
      label: `Resource ${res.id.slice(-4)}`,
      depth: currentDepth + 1,
      createdAt: Date.now(),
      sourceRef: res.id,
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
