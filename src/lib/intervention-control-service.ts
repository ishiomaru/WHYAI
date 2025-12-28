// ============================================
// Structure Generation Service - Intervention Control
// Based on IMPLEMENTATION_SPECIFICATION.md Section V
// ============================================

import {
  OperatorLogEntry,
  StructuralDeltaType,
  LostState,
  Confidence,
  LostStateEstimate,
  InterventionPhase,
  FactPresentation,
  StructuralConstraint,
  StructuralQuestion,
  StructuralQuestionType,
  CriticalInterventionSequence,
  isStagnantDelta,
  OperatorIdType
} from './structure-generation-types';

// ============================================
// 1. Lost State Estimator
// 迷子状態をデータモデルとして保持せず、後付けで同定
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
    // 学習者が状況・次の行動・理由を理解している状態
    if (
      operatorPattern.o0ResponseRate >= 0.5 &&  // 状況理解
      operatorPattern.o2ResponseRate >= 0.5 &&  // 選択可能
      operatorPattern.o3ResponseRate >= 0.5 &&  // 理由説明可能
      deltaPattern.stagnationCount === 0        // 停滞なし
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

// ============================================
// 2. Strict Derivation Flow (DESIGN COMPLIANT)
// ============================================

// ============================================
// 2. Strict Derivation Flow (DESIGN COMPLIANT)
// ============================================

import {
  StructuralFact,
  deriveQuestionSemantics,
  translateQuestionToLanguage,
  VIEWPOINT_OPERATORS,
  QuestionSemantics,
  ViewpointOperator
} from './concept-compliant-types';
import { aiService } from './ai-service';
import { StructureNode } from './structure-generation-types';

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

/**
 * 厳格な介入コントローラー
 * 
 * 【Pipeline】
 * 1. Analyze Fact (from Logs)
 * 2. Select Operator (O0-O5)
 * 3. Derive Semantics (Logic)
 * 4. Translate (AI/Template)
 */
export class StrictInterventionController {
  
  /**
   * 問いを生成（導出）する
   */
  async deriveIntervention(
    estimate: LostStateEstimate,
    context: { purposeAlpha: string },
    currentNodes: readonly StructureNode[] = []
  ): Promise<StructuralQuestion> {
    
    // 1. Fact Analysis
    // ログから事実を計算
    const logs = estimate.observationBasis as OperatorLogEntry[];
    const deltas = logs.map(l => l.structuralDelta);
    const fact = StructuralFactAnalyzer.analyze(logs, deltas, currentNodes);

    // 2. Select Operator
    // 迷子状態(M0-M5)に対応する操作子(O0-O5)を選択
    const stateToOpMap: Record<string, string> = {
      'M0': 'O0', 'M1': 'O1', 'M2': 'O2', 
      'M3': 'O3', 'M4': 'O4', 'M5': 'O5',
      'RESOLVED': 'O0'  // 迷子状態解消時は介入不要、デフォルトとしてO0を使用
    };
    const opId = stateToOpMap[estimate.dominantState] || 'O0';
    const operator = VIEWPOINT_OPERATORS[opId];

    if (!operator) {
      throw new Error(`Unknown operator for state ${estimate.dominantState}`);
    }

    // 3. Derive Semantics
    const focusCandidate = currentNodes.length > 0 
      ? currentNodes[currentNodes.length - 1].label 
      : undefined;

    // 構造から意味を決定 (Logic only)
    const semantics = deriveQuestionSemantics(fact, operator, {
      purposeAlpha: context.purposeAlpha,
      focusedNodeLabel: focusCandidate, 
      // choiceLabels はこのAPIのスコープ外(Client State)のため欠落
      // ※本来はClientから送られるSessionStateに入っているべき
    });

    // 4. Translate
    // AIを使って自然言語化 (Strict Translation)
    // ※テンプレート完全廃止 (User Constraint)
    const content = await aiService.translateToNaturalLanguage(semantics);

    return {
      type: 'STRUCTURAL_QUESTION',
      questionType: semantics.questionType,
      content,
      semantics // 検証用に内部構造を含める (Extending StructuralQuestion type needed)
    } as any; // Type assertion temporary
  }
}

// Retrofit for existing code compatibility
export class CriticalInterventionController {
   private strictCtrl = new StrictInterventionController();

   async executeIntervention(
     estimate: LostStateEstimate,
     purposeAlpha: string,
     currentNodes: readonly StructureNode[] = []
   ): Promise<CriticalInterventionSequence> {
     // 事実と制約は固定（安全装置）
     const layerA = { type: 'FACT' as const, content: '（構造的停滞が検出されました）' };
     const layerB = { type: 'CONSTRAINT' as const, content: '現在の視点では差分が生まれません。' };
     
     // 問いを動的導出
     const layerC = await this.strictCtrl.deriveIntervention(estimate, { purposeAlpha }, currentNodes);

     return { layerA, layerB, layerC };
   }
}

// ============================================
// 3. Output Control
// 状態別の出力制御
// ============================================

/**
 * 出力制御設定
 */
export interface OutputControl {
  showLayerA: boolean;
  showLayerB: boolean;
  showLayerC: boolean;
  layerBEmphasis: boolean;
  sequenceFixed: boolean;
}

/**
 * 迷子状態に基づく出力制御を決定
 */
export function determineOutputControl(estimate: LostStateEstimate): OutputControl {
  const { dominantState, isCritical } = estimate;
  
  // 臨界点では順序固定
  if (isCritical) {
    return {
      showLayerA: true,
      showLayerB: true,
      showLayerC: true,
      layerBEmphasis: false,
      sequenceFixed: true  // A → B → C の順序固定
    };
  }
  
  // 状態別制御
  switch (dominantState) {
    case 'M0':
      // レイヤーAのみ
      return {
        showLayerA: true,
        showLayerB: false,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
      
    case 'M1':
      // レイヤーA + B
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
      
    case 'M2':
      // レイヤーB強調
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: false,
        layerBEmphasis: true,
        sequenceFixed: false
      };
      
    case 'M3':
      // レイヤーC追加
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: true,
        layerBEmphasis: false,
        sequenceFixed: false
      };
    
    case 'M4':
      // 目的-手段癒着型: レイヤーC重視
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: true,
        layerBEmphasis: false,
        sequenceFixed: true
      };
    
    case 'M5':
      // 目的漂流型: リセット、レイヤーAのみ
      return {
        showLayerA: true,
        showLayerB: false,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
    
    case 'RESOLVED':
      // 迷子状態解消: 全レイヤー利用可能、sandbox生成可能
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: true,
        layerBEmphasis: false,
        sequenceFixed: false
      };
      
    default:
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
  }
}
