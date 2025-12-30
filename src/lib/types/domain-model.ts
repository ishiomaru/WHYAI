// ============================================
// Domain Model Types - Core Types for WHYAI
// Based on CONCEPT_NOTES.md and IMPLEMENTATION_SPECIFICATION.md
// ============================================

// ============================================
// 1. Node Types (構成空間ノード)
// 制約: 内容・意味・正誤を持たない構造のみ
// ============================================

/**
 * NodeRole: 空間内での役割のみを表現
 * 意味的分類ではない
 */
export type NodeRole = 
  | 'PURPOSE_ALPHA'      // 表層目的（学習者入力）
  | 'PURPOSE_BETA_HYP'   // 生成的目的（仮説）
  | 'OPTION'             // 選択肢
  | 'RESOURCE_PROXY';    // 外部情報の投影点

/**
 * StructureNode: 構成空間ノード
 * 
 * 【重要制約】
 * - 内容・意味・正誤を持たない
 * - roleは「意味」ではなく「空間内での役割」
 * - Node同士の比較・評価は禁止
 * 
 * 【禁止プロパティ - 定義しない】
 * - content: string          // ❌ 内容を持たせない
 * - correctness: boolean     // ❌ 正誤判定しない
 * - importance: number       // ❌ 重要度を持たせない
 * - difficulty: string       // ❌ 難易度を持たせない
 * - understanding: number    // ❌ 理解度を評価しない
 */
export interface StructureNode {
  readonly id: string;
  readonly role: NodeRole;
  readonly label: string; // ノードの識別ラベル
  readonly depth: number;
  readonly createdAt: number;
  readonly sourceRef?: string; // RESOURCE_PROXYのみ
  readonly reliability?: 'low' | 'medium' | 'high'; // 投影信頼度
}

// ============================================
// 3. Operator Log Types
// 観測対象: 判断が「できたか」ではなく「判断軸を使おうとしたかどうか」
// ============================================

/**
 * 視点操作子ID
 */
// ドメインモデルを統一するためにconcept-compliant-typesから型を再エクスポート
export type {
  ViewpointOperationType,
  QuestionStructureType,
  ViewpointOperator,
  StructuralFact,
  QuestionSemantics
} from '../concept-compliant-types';

export type OperatorIdType = 'O0' | 'O1' | 'O2' | 'O3' | 'O4' | 'O5';


/**
 * 試行タイプ: 判断軸を使おうとした痕跡の分類
 */
export type AttemptType = 
  | 'REORDER_ATTEMPT'     // 並べ替えを試みた
  | 'EXCLUDE_ATTEMPT'     // 除外を試みた
  | 'GROUP_ATTEMPT'       // グルーピングを試みた
  | 'TIMELINE_ATTEMPT';   // 時間軸配置を試みた

/**
 * StructuralDeltaType: 構造差分（意味のない、完全に数値的な差分）
 */
export interface StructuralDeltaType {
  readonly nodeDelta: number;       // ノード数の変化
  readonly depthDelta: number;      // 深度の変化
  readonly choiceDelta: number;     // 選択肢数の変化
  readonly relationDelta: number;   // 関係数の変化
  readonly focusDelta: number;      // 焦点の変化
}

/**
 * OperatorLogEntry: 操作子ログエントリ
 */
export interface OperatorLogEntry {
  readonly id: string;
  readonly operatorId: OperatorIdType;
  readonly targetNodeIds: readonly string[];
  readonly timestamp: number;
  readonly structuralDelta: StructuralDeltaType;
  readonly attemptType: AttemptType;
}

// ============================================
// 5. Collection Gate Types
// 構造が不安定な状態での収集は禁止
// ============================================

/**
 * SystemPhase: システムフェーズ
 */
export type SystemPhase = 
  | 'FREE_INPUT_RECEIVED'      // 自由入力直後 → 収集可
  | 'OPERATOR_APPLYING'        // 操作子適用中 → 収集不可
  | 'STRUCTURE_REORGANIZING'   // 構造再編中 → 収集不可
  | 'PRE_OPTION_GENERATION';   // 次の選択肢生成前 → 収集可

/**
 * 収集可能フェーズ
 */
export const COLLECTION_ALLOWED_PHASES: readonly SystemPhase[] = [
  'FREE_INPUT_RECEIVED',
  'PRE_OPTION_GENERATION'
] as const;

// ============================================
// 7. Lost State Types
// 迷子状態をデータモデルとして保持せず、後付けで同定
// ============================================

/**
 * LostState: 迷子状態（推定結果として使用、保持はしない）
 */
export type LostState = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'RESOLVED';

/**
 * Confidence: 推定信頼度
 */
export type Confidence = 'LOW' | 'MID' | 'HIGH';

/**
 * LostStateEstimate: 迷子状態推定結果
 * 
 * 【重要制約】
 * - これは「推定」であり「断定」ではない
 * - データとして保持されず、都度計算される
 */
export interface LostStateEstimate {
  readonly dominantState: LostState;
  readonly confidence: Confidence;
  readonly isCritical: boolean;
  readonly observationBasis: readonly OperatorLogEntry[];
}
