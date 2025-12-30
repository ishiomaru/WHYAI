// ============================================
// Support Payload Types - Learner Support Extension
// Based on CONCEPT_NOTES.md and IMPLEMENTATION_SPECIFICATION.md
// ============================================

// 依存型のインポート
import type { LostState, StructuralDeltaType, SystemPhase } from './domain-model';
import type { ExternalResource } from './external-resource';
import { COLLECTION_ALLOWED_PHASES } from './domain-model';

// ============================================
// 学習者サポート拡張型 (セクションVI)
// ============================================

export interface ProjectionNode {
  readonly id: string;
  readonly label: string;
  readonly description?: string; // ノードの簡単な説明
  readonly reliability: 'low' | 'medium' | 'high';
}

export interface Contradiction {
  readonly source: string;
  readonly target: string;
  readonly reason: string;
}

export interface ProjectionMap {
  readonly nodes: readonly ProjectionNode[];
  readonly contradictions: readonly Contradiction[];
}

export interface GeneratedOption {
  readonly label: string;
  readonly impact: string;
}

export interface GeneratedOptions {
  readonly axis_label: string;
  readonly options: readonly GeneratedOption[];
}

export interface SandboxCode {
  readonly html: string;
  readonly css: string;
  readonly js: string;
}

// DetectedIntent の前方宣言（循環参照回避のため）
import type { DetectedIntent } from './ui-types';

export interface SupportPayload {
  readonly target_lost_state: LostState | 'DIAGNOSTIC';  // DIAGNOSTICは初回入力時
  readonly projection_map?: ProjectionMap;
  readonly generated_options?: GeneratedOptions;
  readonly sandbox_code?: SandboxCode;
  /** 投影された外部リソース（記事本文を含む） */
  readonly projected_resources?: readonly ExternalResource[];
  /** LLMが検出した意図（ソート/フィルタ/構造的振る舞い） */
  readonly detected_intent?: DetectedIntent;
  /** 状態診断のための問い（日本語） */
  readonly diagnostic_question?: string;
  /** 構造的事実の要約 */
  readonly structural_fact_summary?: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * 空のStructuralDeltaを作成
 */
export function createEmptyStructuralDelta(): StructuralDeltaType {
  return {
    nodeDelta: 0,
    depthDelta: 0,
    choiceDelta: 0,
    relationDelta: 0,
    focusDelta: 0
  };
}

/**
 * StructuralDeltaが停滞状態かどうかを判定
 */
export function isStagnantDelta(delta: StructuralDeltaType): boolean {
  return (
    delta.nodeDelta === 0 &&
    delta.depthDelta === 0 &&
    delta.choiceDelta === 0 &&
    delta.focusDelta === 0
  );
}

/**
 * 収集可能かどうかを判定
 */
export function canCollect(phase: SystemPhase, lockCount: number): boolean {
  return COLLECTION_ALLOWED_PHASES.includes(phase) && lockCount === 0;
}
