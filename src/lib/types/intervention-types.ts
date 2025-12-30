// ============================================
// Intervention Types - Intervention Control
// Based on CONCEPT_NOTES.md and IMPLEMENTATION_SPECIFICATION.md
// ============================================

// 依存型のインポート
import type { QuestionSemantics } from '../concept-compliant-types';

// ============================================
// Intervention Types
// 順序固定: 事実提示（A）→ 構造的制約（B）→ 問い（C）
// ============================================

/**
 * InterventionPhase: 介入フェーズ
 */
export type InterventionPhase = 'WAITING' | 'PHASE_A' | 'PHASE_B' | 'PHASE_C' | 'COMPLETE';

/**
 * FactPresentation: Layer A - 事実提示（評価を含まない）
 */
export interface FactPresentation {
  readonly type: 'FACT';
  readonly content: string;
}

/**
 * StructuralConstraint: Layer B - 構造的制約（示唆を含まない）
 */
export interface StructuralConstraint {
  readonly type: 'CONSTRAINT';
  readonly content: string;
}

/**
 * StructuralQuestionType: 構造内在型問いのタイプ
 */
export type StructuralQuestionType = 
  | 'DIFF_ABSENCE'        // 型1: 差分不在を前提にした問い
  | 'AXIS_GRANULARITY'    // 型2: 判断軸の粒度に向けた問い
  | 'OPERATION_CONNECTION'; // 型3: 操作型への接続問い

/**
 * StructuralQuestion: 問い（構造内在型）
 */
export interface StructuralQuestion {
  type: 'STRUCTURAL_QUESTION';
  questionType: StructuralQuestionType;
  content: string;
  semantics?: QuestionSemantics; // 検証/デバッグのみ
}

/**
 * CriticalInterventionSequence: 介入シーケンス
 */
export interface CriticalInterventionSequence {
  readonly layerA: FactPresentation;
  readonly layerB: StructuralConstraint;
  readonly layerC: StructuralQuestion;
}
