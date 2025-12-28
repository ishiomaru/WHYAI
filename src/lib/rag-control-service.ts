// ============================================
// Structure Generation Service - RAG Control
// Based on IMPLEMENTATION_SPECIFICATION.md Section II
// ============================================

import {
  SearchQuery,
  BreadthLevel,
  RawChunk,
  ExternalResource,
  StructureHint,
  SourceTrace,
  SystemPhase,
  canCollect
} from './structure-generation-types';

// ============================================
// 1. Search Query Generation
// AIの役割上限: 文字列・トークン抽出 + breadth調整のみ
// ============================================

/**
 * トークン抽出: 純粋な文字列操作のみ
 * 
 * 【禁止】
 * - 重要度によるフィルタリング
 * - 意味的な選別
 */
function extractTokens(inputs: string[]): string[] {
  const tokens: string[] = [];
  for (const text of inputs) {
    // 純粋な分割のみ（意味的判断なし）
    const parts = text.split(/[\s,、。．・\n\t]+/);
    tokens.push(...parts.filter(p => p.length >= 2));
  }
  return tokens.slice(0, 10); // 上限10トークン（機械的制限）
}

/**
 * breadth決定: 機械的ルールのみ
 * 
 * 【禁止】
 * - 内容に基づく調整
 * - 重要度に基づく調整
 */
function determineBreadth(tokenCount: number): BreadthLevel {
  if (tokenCount <= 2) return 5;  // トークン少 → 広く検索
  if (tokenCount <= 4) return 4;
  if (tokenCount <= 6) return 3;
  if (tokenCount <= 8) return 2;
  return 1;                        // トークン多 → 狭く検索
}

/**
 * 検索クエリ生成
 * 
 * AIがやること:
 * - 文字列・トークン抽出
 * - breadth（探索の広さ）調整
 * 
 * AIがやらないこと:
 * - 重要度判断
 * - 初心者/上級者分類
 * - 有用性評価
 */
export function generateSearchQuery(
  purposeAlpha: string,
  purposeBetaHypothesis?: string | null,
  axis1Tentative?: string | null
): SearchQuery {
  // Step 1: トークン抽出（意味付けなし）
  const inputs: string[] = [purposeAlpha];
  if (purposeBetaHypothesis) {
    inputs.push(purposeBetaHypothesis);
  }
  if (axis1Tentative) {
    inputs.push(axis1Tentative);
  }
  
  const tokens = extractTokens(inputs);
  
  // Step 2: breadth決定（トークン数に基づく機械的決定）
  const breadth = determineBreadth(tokens.length);
  
  return { tokens, breadth };
}

// ============================================
// 2. Non-Semantic Chunking
// 要約・意味圧縮を行わない
// ============================================

const CHUNK_SIZE = 500; // 固定文字数（意味的分割ではない）

/**
 * HTMLタグ除去（純粋な変換のみ）
 */
function stripHtml(html: string): string {
  // scriptタグの除去 (ES2017互換性のため 's' フラグなし)
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // styleタグの除去
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

/**
 * 非意味Chunking
 * 
 * 【重要制約】
 * - 固定長分割のみ（意味的分割禁止）
 * - 要約・圧縮禁止
 * - キーワード抽出禁止
 * 
 * 【禁止処理 - 実装しない】
 * - extractMainContent()     // ❌ 主要コンテンツ抽出
 * - summarize()              // ❌ 要約
 * - extractKeywords()        // ❌ キーワード抽出
 * - calculateImportance()    // ❌ 重要度計算
 */
export function chunkWithoutMeaning(rawHtml: string): RawChunk[] {
  // HTMLをテキストに変換（純粋な変換のみ）
  const text = stripHtml(rawHtml);
  
  // 固定長で分割（意味的分割ではない）
  const chunks: RawChunk[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunkText = text.slice(i, i + CHUNK_SIZE);
    chunks.push({
      text: chunkText,
      length: chunkText.length,
      position: i
    });
  }
  
  return chunks;
}

// ============================================
// 3. Collection Gate Controller
// 構造が不安定な状態での収集は禁止
// ============================================

/**
 * 許可される遷移
 */
const ALLOWED_TRANSITIONS: Record<SystemPhase, SystemPhase[]> = {
  'FREE_INPUT_RECEIVED': ['OPERATOR_APPLYING', 'PRE_OPTION_GENERATION'],
  'OPERATOR_APPLYING': ['STRUCTURE_REORGANIZING'],
  'STRUCTURE_REORGANIZING': ['PRE_OPTION_GENERATION'],
  'PRE_OPTION_GENERATION': ['FREE_INPUT_RECEIVED', 'OPERATOR_APPLYING']
};

/**
 * フェーズ遷移エラー
 */
export class InvalidTransitionError extends Error {
  constructor(fromPhase: SystemPhase, toPhase: SystemPhase) {
    super(`Invalid transition: ${fromPhase} -> ${toPhase}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * 収集ゲート管理
 * 
 * 【重要制約】
 * - 操作子適用中、構造再編中は収集禁止
 * - 構造が安定している瞬間だけ収集可能
 */
export class CollectionGateController {
  private phase: SystemPhase = 'FREE_INPUT_RECEIVED';
  private lockCount: number = 0;
  
  get currentPhase(): SystemPhase {
    return this.phase;
  }
  
  /**
   * 収集可否の判定
   */
  canCollect(): boolean {
    return canCollect(this.phase, this.lockCount);
  }
  
  /**
   * フェーズ遷移
   */
  transitionTo(newPhase: SystemPhase): void {
    const allowed = ALLOWED_TRANSITIONS[this.phase];
    if (!allowed.includes(newPhase)) {
      throw new InvalidTransitionError(this.phase, newPhase);
    }
    this.phase = newPhase;
  }
  
  /**
   * 操作子適用開始時のロック取得
   */
  acquireLock(): void {
    this.lockCount++;
  }
  
  /**
   * 操作子適用完了時のロック解放
   */
  releaseLock(): void {
    if (this.lockCount > 0) {
      this.lockCount--;
    }
  }
  
  /**
   * 操作子適用中のガード
   */
  async withOperatorLock<T>(fn: () => Promise<T>): Promise<T> {
    this.acquireLock();
    try {
      this.transitionTo('OPERATOR_APPLYING');
      const result = await fn();
      return result;
    } finally {
      this.releaseLock();
      this.transitionTo('STRUCTURE_REORGANIZING');
    }
  }
}

// ============================================
// 4. External Resource Creation
// ============================================

/**
 * 構造ヒント推定（非意味的）
 * 
 * 【禁止】
 * - トピック推定
 * - 関連度計算
 * - 重要度判断
 */
function estimateStructureHint(chunks: RawChunk[]): StructureHint {
  // 純粋に形式的な判断のみ
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  
  // 粒度は文字数のみで判断（内容は見ない）
  let granularity: 'LOW' | 'MID' | 'HIGH';
  if (totalLength < 500) {
    granularity = 'LOW';
  } else if (totalLength < 2000) {
    granularity = 'MID';
  } else {
    granularity = 'HIGH';
  }
  
  // 形式はデフォルト（内容を見て判断しない）
  return {
    form: 'EXPLANATION',
    granularity
  };
}

/**
 * 一意なIDを生成
 */
function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * ExternalResource作成
 */
export function createExternalResource(
  rawHtml: string,
  url: string,
  httpStatus: number = 200
): ExternalResource {
  const chunks = chunkWithoutMeaning(rawHtml);
  const structureHint = estimateStructureHint(chunks);
  const now = Date.now();
  
  const sourceTrace: SourceTrace = {
    url,
    collectedAt: now,
    httpStatus
  };
  
  return {
    id: generateId(),
    rawChunks: chunks,
    structureHint,
    freshness: now,
    sourceTrace,
    uiVisibility: false  // 常にfalse - UI非表示を強制
  };
}

// ============================================
// 5. Collection Flow Execution
// ============================================

/**
 * 収集フロー実行
 * 
 * 【重要制約】
 * - 収集可能フェーズでのみ実行
 * - 操作子適用中/構造再編中は即座にリターン
 */
export async function executeCollectionFlow(
  gate: CollectionGateController,
  query: SearchQuery,
  fetchFn: (url: string) => Promise<{ html: string; status: number }>
): Promise<ExternalResource[]> {
  // Step 1: 収集可否チェック
  if (!gate.canCollect()) {
    return []; // 収集不可フェーズでは何もしない
  }
  
  // Step 2: Web検索実行（外部関数に委譲）
  // 実際の実装ではWeb検索APIを呼び出す
  const searchUrls = generateSearchUrls(query);
  
  // Step 3: 各URLからデータ取得
  const resources: ExternalResource[] = [];
  for (const url of searchUrls) {
    try {
      const { html, status } = await fetchFn(url);
      const resource = createExternalResource(html, url, status);
      resources.push(resource);
    } catch {
      // 収集失敗は静かに無視（構造を乱さない）
      continue;
    }
  }
  
  return resources;
}

/**
 * 検索URLを生成（プレースホルダー）
 */
function generateSearchUrls(query: SearchQuery): string[] {
  // 実際の実装ではSearchQueryから適切な検索プロバイダのURLを生成する
  // 現在はweb-search-service.tsが実処理を担当しているため、この関数は参照実装として残置
  // throw new Error('Use web-search-service.ts for actual execution');
  const joined = query.tokens.join(' ');
  // DuckDuckGo API Template (Reference)
  return [
    `https://api.duckduckgo.com/?q=${encodeURIComponent(joined)}&format=json`
  ];
}
