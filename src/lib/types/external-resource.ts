// ============================================
// External Resource Types
// Based on CONCEPT_NOTES.md and IMPLEMENTATION_SPECIFICATION.md
// ============================================

// ============================================
// ExternalResourcePool Types
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
// Search Query Types (RAG用)
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
