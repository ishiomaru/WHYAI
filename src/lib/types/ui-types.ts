// ============================================
// UI Types - UI Component Types
// Based on CONCEPT_NOTES.md and IMPLEMENTATION_SPECIFICATION.md
// ============================================

// 依存型のインポート
import type { QuestionSemantics } from '../concept-compliant-types';
import type { StructuralQuestionType, StructuralQuestion } from './intervention-types';
import type { LostState } from './domain-model';
import type { SupportPayload } from './support-payload';

// ============================================
// Learning Structure Output Types
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
 * LearningStructureOutput: 構造生成出力
 */
export interface LearningStructureOutput {
  readonly layerA: StructurePresentation;
  readonly layerB: OperabilityPresentation;
  readonly layerC?: StructuralQuestion;
  readonly support?: SupportPayload; // セクションVI 拡張
}

// 再エクスポート（UI層で使用するため）
export type { StructuralQuestionType, StructuralQuestion };

// ============================================
// UI Component Types (セクションVII)
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
 * ContentTabType: 中央パネルのタブ種類
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
