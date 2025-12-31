// ============================================
// Structural Fact Analyzer
// ログから客観的な事実（StructuralFact）を計算する
// ============================================

import {
  OperatorLogEntry,
  StructuralDeltaType,
  StructureNode
} from '../types';
import { StructuralFact } from '../concept-compliant-types';

/**
 * 構造的事実分析器
 * ログから客観的な事実（StructuralFact）を計算する
 */
export class StructuralFactAnalyzer {
  static analyze(
    logs: readonly OperatorLogEntry[],
    deltas: readonly StructuralDeltaType[],
    currentNodes: readonly StructureNode[] = []
  ): StructuralFact {
    const recent = logs.slice(-5); // 直近5件を分析対象
    
    // 繰り返し検出
    let sameOperatorRepeated = 0;
    if (recent.length >= 2) {
       const lastOp = recent[recent.length - 1].operatorId;
       for (let i = recent.length - 2; i >= 0; i--) {
         if (recent[i].operatorId === lastOp) sameOperatorRepeated++;
         else break;
       }
    }

    // 操作試行の検出 (AttemptTypeから判定)
    const sortingAttempted = recent.some(l => l.attemptType === 'REORDER_ATTEMPT');
    const exclusionAttempted = recent.some(l => l.attemptType === 'EXCLUDE_ATTEMPT');
    const groupingAttempted = recent.some(l => l.attemptType === 'GROUP_ATTEMPT');

    // 最後のDelta
    const lastDelta = deltas.length > 0 
      ? deltas[deltas.length - 1] 
      : { nodeDelta: 0, relationDelta: 0 };

    // 構造メトリクスの計算
    const nodeCount = currentNodes.length;
    // relationCountをログのDeltaから累積計算
    const relationCount = deltas.reduce((sum, d) => sum + (d.relationDelta || 0), 0); 
    
    // 最大深度
    const focusDepth = currentNodes.length > 0 
      ? Math.max(...currentNodes.map(n => n.depth)) 
      : 0;

    // 選択肢数 (RoleがOPTIONのもの)
    const choiceCount = currentNodes.filter(n => n.role === 'OPTION').length;

    return {
      nodeCount,
      relationCount,
      focusDepth,
      choiceCount,
      sortingAttempted,
      exclusionAttempted,
      groupingAttempted,
      sameOperatorRepeated,
      sameCriteriaUsed: false, // ログにCriteriaが含まれていれば判定可能
      lastDelta: {
        nodeDelta: lastDelta.nodeDelta,
        relationDelta: lastDelta.relationDelta
      }
    };
  }
}
