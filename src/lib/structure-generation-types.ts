// ============================================
// Structure Generation Service - Core Types
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
// 2. ExternalResourcePool Types
// 制約: UI非表示・検証用データプールとして隔離
// ============================================

/**
 * 構造形式（意味ではない）
 */
export type StructureForm = 'LIST' | 'PROCEDURE' | 'EXPLANATION';

/**
 * 粒度（重要度ではない）
 */
export type Granularity = 'LOW' | 'MID' | 'HIGH';

/**
 * RawChunk: 生データチャンク
 * 
 * 【重要制約】
 * - 要約・意味圧縮は禁止
 * - 原文テキストと位置情報のみ
 * 
 * 【禁止プロパティ - 定義しない】
 * - summary: string       // ❌ 要約禁止
 * - keywords: string[]    // ❌ キーワード抽出禁止
 * - importance: number    // ❌ 重要度禁止
 * - relevance: number     // ❌ 関連度禁止
 */
export interface RawChunk {
  readonly text: string;      // 原文そのまま
  readonly length: number;    // バイト長
  readonly position: number;  // ソース内位置
}

/**
 * StructureHint: 非意味的構造ヒント
 * 「何が書いてあるか」ではなく「どういう形式か」のみ
 * 
 * 【禁止プロパティ - 定義しない】
 * - topic: string         // ❌ トピック禁止
 * - theme: string         // ❌ テーマ禁止
 * - relevance: number     // ❌ 関連度禁止
 */
export interface StructureHint {
  readonly form: StructureForm;
  readonly granularity: Granularity;
}

/**
 * SourceTrace: ソース追跡情報（検証用、UI表示用ではない）
 */
export interface SourceTrace {
  readonly url: string;
  readonly collectedAt: number;
  readonly httpStatus: number;
}

/**
 * ExternalResource: 外部リソース
 * 
 * 【重要制約】
 * - UI非表示・検証用データプールとして隔離
 * - 要約・意味圧縮は禁止
 * - URLは説明ではなく検証用
 */
export interface ExternalResource {
  readonly id: string;
  readonly rawChunks: readonly RawChunk[];
  readonly structureHint: StructureHint;
  readonly freshness: number;
  readonly sourceTrace: SourceTrace;
  readonly uiVisibility: false; // 常にfalse - UI非表示を強制
}

/**
 * ProjectionData: 投影用データ（UIに直接出力されない中間形式）
 */
export interface ProjectionData {
  readonly resourceId: string;
  readonly chunkTexts: readonly string[];
  readonly structureHint: StructureHint;
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
} from './concept-compliant-types';

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
// 4. Search Query Types (RAG用)
// AIの役割上限: トークン抽出 + breadth調整のみ
// ============================================

/**
 * BreadthLevel: 探索の広さ（重要度ではない）
 */
export type BreadthLevel = 1 | 2 | 3 | 4 | 5;

/**
 * SearchQuery: 検索クエリ
 * 
 * 【重要制約】
 * - トークンと広さのみ
 * - 重要度・優先度・対象レベルは持たない
 * 
 * 【禁止プロパティ - 定義しない】
 * - priority: number        // ❌ 優先度禁止
 * - importance: number      // ❌ 重要度禁止
 * - targetLevel: string     // ❌ 対象レベル禁止
 * - recommended: boolean    // ❌ 推奨フラグ禁止
 */
export interface SearchQuery {
  readonly tokens: readonly string[];
  readonly breadth: BreadthLevel;
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
// 6. Learning Structure Output Types
// 「解説文」「重要ポイント強調」「学習順提示」を禁止
// ============================================

/**
 * 許可される操作タイプのみ
 */
export type UIOperatorType = 'REORDER' | 'COLLAPSE' | 'GROUP' | 'TIMELINE';

/**
 * 操作子定義
 */
export interface UIOperator {
  readonly type: UIOperatorType;
  readonly label: string;
}

/**
 * ChunkData: チャンク表示データ（禁止プロパティなし）
 * 
 * 【禁止プロパティ - 定義しない】
 * - highlighted: boolean    // ❌ ハイライト禁止
 * - important: boolean      // ❌ 重要マーク禁止
 * - recommended: boolean    // ❌ 推奨マーク禁止
 */
export interface ChunkData {
  readonly id: string;
  readonly text: string;        // 生テキストのみ
  readonly collapsed: boolean;
  readonly groupId: string | null;
}

/**
 * StructurePresentation: 構造表示（Layer A）
 */
export interface StructurePresentation {
  readonly chunks: readonly ChunkData[];
  readonly initialOrder: 'source_order'; // ソース順のみ許可
}

/**
 * OperabilityPresentation: 操作可能性表示（Layer B）
 */
export interface OperabilityPresentation {
  readonly availableOperators: readonly UIOperator[];
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
import { QuestionSemantics } from './concept-compliant-types';

export interface StructuralQuestion {
  type: 'STRUCTURAL_QUESTION';
  questionType: StructuralQuestionType;
  content: string;
  semantics?: QuestionSemantics; // 検証/デバッグのみ
}

/**
 * LearningStructureOutput: 構造生成出力
 */
export interface LearningStructureOutput {
  readonly layerA: StructurePresentation;
  readonly layerB: OperabilityPresentation;
  readonly layerC?: StructuralQuestion;
  readonly support?: SupportPayload; // セクションVI 拡張
}

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

// ============================================
// 8. Intervention Types
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
 * CriticalInterventionSequence: 介入シーケンス
 */
export interface CriticalInterventionSequence {
  readonly layerA: FactPresentation;
  readonly layerB: StructuralConstraint;
  readonly layerC: StructuralQuestion;
}

// ============================================
// 9. Utility Functions
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

// ============================================
// 10. 学習者サポート拡張型 (セクションVI)
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
// 11. UI Component Types (セクションVII)
// レイアウト・パネル・インタラクション用
// ============================================

/**
 * NodeTreeItem: ノード構成ツリー用
 * 左パネルのフォルダ/ツリー表示に使用
 */
export type NodeTreeType = 'purpose' | 'option' | 'resource' | 'thought';

export interface NodeTreeItem {
  readonly id: string;
  readonly label: string;
  readonly type: NodeTreeType;
  readonly children: readonly NodeTreeItem[];
  readonly collapsed: boolean;
  readonly depth: number;
}

/**
 * ChatMessage: チャットUI用メッセージ
 * 右パネルの履歴表示に使用
 */
export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'system';
  readonly content: string;
  readonly timestamp: number;
  readonly relatedNodeIds?: readonly string[];
}

/**
 * ConversationIntent: LLM解析による会話意図
 * 
 * 【重要】
 * - UI表示用ではなく内部処理用
 * - ソート/フィルタ意図は会話から暗黙的に抽出
 */
export interface ConversationIntent {
  readonly implicitSortPriority: readonly string[];  // LLM解析による優先順位
  readonly implicitFilters: readonly string[];        // LLM解析によるフィルタ条件
  readonly confidence: 'low' | 'medium' | 'high';
}

/**
 * SortIntent: ソート意図の検出結果
 * 
 * CONCEPT_NOTESに従い:
 * - 判断軸1: 探索空間を縮約する軸
 * - 判断軸2: 選択を最適化する軸
 * - 時間軸的順序（timestamp）は選択肢の順序として許可
 */
export interface SortIntent {
  readonly detected: boolean;
  readonly axis_type?: 'judgment_axis_1' | 'judgment_axis_2' | 'timestamp';
  readonly axis_label?: string;  // 検出された軸のラベル（例: 「具体性」「難易度」）
  readonly confidence: 'high' | 'mid' | 'low';
}

/**
 * FilterIntent: フィルタ意図の検出結果
 */
export interface FilterIntent {
  readonly detected: boolean;
  readonly exclude_criteria?: readonly string[];  // 除外基準
  readonly include_criteria?: readonly string[];  // 包含基準
  readonly confidence: 'high' | 'mid' | 'low';
}

/**
 * StructuralBehavior: 観測された構造的振る舞い
 * 
 * CONCEPT_NOTESに従い、判断軸を使おうとした痕跡を記録:
 * - 並べ替えを試みたか
 * - 除外を試みたか
 * - グルーピングを試みたか
 */
export interface StructuralBehavior {
  readonly sorting_attempted: boolean;
  readonly exclusion_attempted: boolean;
  readonly grouping_attempted: boolean;
  readonly same_operator_repeated: number;
  readonly focus_shift_count: number;
}

/**
 * DetectedIntent: LLMが検出した意図の総合
 */
export interface DetectedIntent {
  readonly sort_intent?: SortIntent;
  readonly filter_intent?: FilterIntent;
  readonly structural_behavior?: StructuralBehavior;
}

/**
 * ProjectedDocument: 生成ドキュメント
 * ノードグラフホバー時の説明表示に使用
 */
export interface ProjectedDocument {
  readonly nodeId: string;
  readonly projectedInfo: string;   // LLM解析によるユーザー入力からの情報
  readonly description?: string;    // ノードの説明文
  readonly sourceContext: string;   // 元となったコンテキスト
}

/**
 * PanelState: パネル状態管理
 * 
 * 【重要】幅の範囲制約
 * - 左パネル: 10-25%
 * - 中央パネル: 30-70%
 * - 右パネル: 15-45%
 */
export interface PanelState {
  readonly leftWidth: number;    // 10-25%
  readonly centerWidth: number;  // 30-70%
  readonly rightWidth: number;   // 15-45%
  readonly isLeftCollapsed: boolean;
  readonly isRightCollapsed: boolean;
}

/**
 * ContentPanelMode: 中央パネルの表示モード
 */
export type ContentPanelMode = 
  | 'tabs'           // デフォルト: タブ切替
  | 'split';         // 同時表示 (比率可変)

/**
 * ContentTab: 中央パネルのタブ種類
 */
export type ContentTabType = 
  | 'custom_page'    // カスタムページ (HTML/CSS/JS)
  | 'choices'        // 選択肢UI
  | 'node_graph'     // ノードグラフ
  | 'document'       // 生成ドキュメント
  | 'article';       // [NEW] 外部記事投影

/**
 * SortFilterUIState: 条件付きソート/フィルタUI状態
 * 
 * 【重要】
 * - 通常は非表示
 * - チャット応答より効率的な場合のみ動的に表示
 */
export interface SortFilterUIState {
  readonly isVisible: boolean;
  readonly sortBy: 'priority' | 'timestamp' | 'relevance' | null;
  readonly sortOrder: 'asc' | 'desc';
  readonly activeFilters: readonly string[];
}
