// ============================================
// Lost State Estimator
// 迷子状態をデータモデルとして保持せず、後付けで同定
// Based on CONCEPT_NOTES.md M0-M5 definitions
// ============================================

import {
  OperatorLogEntry,
  StructuralDeltaType,
  LostState,
  Confidence,
  LostStateEstimate,
  isStagnantDelta,
  OperatorIdType
} from '../types';

// ============================================
// Internal Types
// ============================================

/**
 * deltaパターン分析結果
 */
interface DeltaPattern {
  nodeChangeRate: number;
  depthChangeRate: number;
  choiceChangeRate: number;
  stagnationCount: number;
}

/**
 * 操作子使用パターン分析結果
 */
interface OperatorPattern {
  o0ResponseRate: number;
  o1ResponseRate: number;
  o2ResponseRate: number;
  o3ResponseRate: number;
  o4ResponseRate: number;
  o5ResponseRate: number;
}

// ============================================
// Main Class
// ============================================

/**
 * 支配的迷子状態推定器
 * 
 * 【重要制約】
 * - 状態を「断定」しない
 * - StructuralDeltaと操作子ログのみを入力とする
 * - 内部に状態を保持しない
 */
export class DominantStrayStateEstimator {
  private static readonly REPRODUCTION_THRESHOLD = 2;
  
  /**
   * 支配的迷子状態を推定
   * データとして「状態」を持つのではなく、観測から推定のみ
   */
  estimate(
    recentLogs: readonly OperatorLogEntry[],
    structuralDeltas: readonly StructuralDeltaType[]
  ): LostStateEstimate {
    // Step 1: deltaパターン分析
    const deltaPattern = this.analyzeDeltaPattern(structuralDeltas);
    
    // Step 2: 操作子使用パターン分析
    const operatorPattern = this.analyzeOperatorPattern(recentLogs);
    
    // Step 3: パターンから迷子状態を推定
    const dominantState = this.estimateFromPatterns(deltaPattern, operatorPattern);
    
    // Step 4: 臨界点判定
    const isCritical = this.detectCriticalPoint(recentLogs, structuralDeltas);
    
    // Step 5: 信頼度決定
    const confidence = this.determineConfidence(recentLogs.length);
    
    return {
      dominantState,
      confidence,
      isCritical,
      observationBasis: recentLogs
    };
  }
  
  /**
   * deltaパターン分析
   */
  private analyzeDeltaPattern(deltas: readonly StructuralDeltaType[]): DeltaPattern {
    const n = deltas.length;
    if (n === 0) {
      return {
        nodeChangeRate: 0,
        depthChangeRate: 0,
        choiceChangeRate: 0,
        stagnationCount: 0
      };
    }
    
    const nodeChanges = deltas.filter(d => d.nodeDelta !== 0).length;
    const depthChanges = deltas.filter(d => d.depthDelta !== 0).length;
    const choiceChanges = deltas.filter(d => d.choiceDelta !== 0).length;
    const stagnations = deltas.filter(d => isStagnantDelta(d)).length;
    
    return {
      nodeChangeRate: nodeChanges / n,
      depthChangeRate: depthChanges / n,
      choiceChangeRate: choiceChanges / n,
      stagnationCount: stagnations
    };
  }
  
  /**
   * 操作子使用パターン分析
   */
  private analyzeOperatorPattern(logs: readonly OperatorLogEntry[]): OperatorPattern {
    if (logs.length === 0) {
      return {
        o0ResponseRate: 0,
        o1ResponseRate: 0,
        o2ResponseRate: 0,
        o3ResponseRate: 0,
        o4ResponseRate: 0,
        o5ResponseRate: 0
      };
    }
    
    const calculateResponseRate = (opId: OperatorIdType): number => {
      const opLogs = logs.filter(l => l.operatorId === opId);
      const responsive = opLogs.filter(l => !isStagnantDelta(l.structuralDelta)).length;
      return opLogs.length > 0 ? responsive / opLogs.length : 0;
    };
    
    return {
      o0ResponseRate: calculateResponseRate('O0'),
      o1ResponseRate: calculateResponseRate('O1'),
      o2ResponseRate: calculateResponseRate('O2'),
      o3ResponseRate: calculateResponseRate('O3'),
      o4ResponseRate: calculateResponseRate('O4'),
      o5ResponseRate: calculateResponseRate('O5')
    };
  }
  
  /**
   * パターンから迷子状態を推定
   */
  private estimateFromPatterns(
    deltaPattern: DeltaPattern,
    operatorPattern: OperatorPattern
  ): LostState {
    // RESOLVED: 迷子状態解消 - 全操作子に十分な反応があり、停滞なし
    if (
      operatorPattern.o0ResponseRate >= 0.5 &&
      operatorPattern.o2ResponseRate >= 0.5 &&
      operatorPattern.o3ResponseRate >= 0.5 &&
      deltaPattern.stagnationCount === 0
    ) {
      return 'RESOLVED';
    }
    
    // M0: 目的不明型 - O0に反応なし
    if (operatorPattern.o0ResponseRate < 0.2) {
      return 'M0';
    }
    
    // M1: 状態空間未形成型 - ノード変化が極端に少ない
    if (deltaPattern.nodeChangeRate < 0.1) {
      return 'M1';
    }
    
    // M2: 選択肢過多型 - 選択肢増加、O2使用少
    if (deltaPattern.choiceChangeRate > 0.5 && operatorPattern.o2ResponseRate < 0.1) {
      return 'M2';
    }
    
    // M3: 判断軸不在型 - O3に反応なし
    if (operatorPattern.o3ResponseRate < 0.2) {
      return 'M3';
    }
    
    // M4: 目的-手段癒着型 - O4に反応なし
    if (operatorPattern.o4ResponseRate < 0.2) {
      return 'M4';
    }
    
    // M5: 目的漂流型 - O5に反応なし
    if (operatorPattern.o5ResponseRate < 0.2) {
      return 'M5';
    }
    
    // デフォルト
    return 'M1';
  }
  
  /**
   * 臨界点検出
   * 「判断不能の再現性」を検出
   */
  private detectCriticalPoint(
    logs: readonly OperatorLogEntry[],
    deltas: readonly StructuralDeltaType[]
  ): boolean {
    let consecutiveStagnation = 0;
    let maxConsecutive = 0;
    
    for (const delta of deltas) {
      if (isStagnantDelta(delta)) {
        consecutiveStagnation++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveStagnation);
      } else {
        consecutiveStagnation = 0;
      }
    }
    
    return maxConsecutive >= DominantStrayStateEstimator.REPRODUCTION_THRESHOLD;
  }
  
  /**
   * 信頼度決定
   */
  private determineConfidence(logCount: number): Confidence {
    if (logCount >= 10) return 'HIGH';
    if (logCount >= 5) return 'MID';
    return 'LOW';
  }
}
