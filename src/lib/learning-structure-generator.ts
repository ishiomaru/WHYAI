// ============================================
// Structure Generation Service - Learning Structure Generator
// Based on IMPLEMENTATION_SPECIFICATION.md Section IV
// ============================================

import {
  RawChunk,
  ChunkData,
  UIOperator,
  UIOperatorType,
  StructurePresentation,
  OperabilityPresentation,
  LearningStructureOutput,
  StructuralQuestion,
  StructuralQuestionType,
  LostStateEstimate
} from './structure-generation-types';

// ============================================
// 1. Structure Presentation Generator (Layer A)
// 構造提示（事実のみ、評価なし）
// ============================================

/**
 * 一意なチャンクIDを生成
 */
function generateChunkId(index: number): string {
  // QA改善: Date.now()による衝突リスク回避のためUUIDを使用
  // crypto.randomUUID()はモダンな環境(Node 14.17+, Browsers)で利用可能
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `chunk-${crypto.randomUUID()}`;
  }
  // フォールバック (古い環境用)
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`;
}

/**
 * RawChunkをChunkDataに変換
 * 
 * 【重要制約】
 * - 生テキストのみ
 * - 禁止プロパティを追加しない
 */
function convertToChunkData(chunk: RawChunk, index: number): ChunkData {
  return {
    id: generateChunkId(index),
    text: chunk.text,
    collapsed: false,  // 初期は全て展開
    groupId: null      // 初期はグループなし
  };
}

/**
 * 構造表示を生成（Layer A）
 * チャンクを順不同で配置するのみ
 */
export function generateStructurePresentation(
  rawChunks: readonly RawChunk[]
): StructurePresentation {
  return {
    chunks: rawChunks.map((chunk, index) => convertToChunkData(chunk, index)),
    initialOrder: 'source_order'  // ソース順のみ許可
  };
}

// ============================================
// 2. Operability Presentation Generator (Layer B)
// 操作可能性提示（操作子のみ）
// ============================================

// QA改善: 文言定義の分離 (i18n準備)
export const UI_TEXTS = {
  OPERATORS: {
    REORDER: '並べ替え',
    COLLAPSE: '折りたたみ',
    GROUP: 'グルーピング',
    TIMELINE: '時間軸配置'
  },
  QUESTIONS: {
    DIFF_ABSENCE: 'もしこの中から一つだけ今すぐ選ぶ必要があるとしたら、どんな理由があれば差が生まれそうですか？',
    AXIS_GRANULARITY: '今使っている理由は、「区別する」ためには十分そうですか？',
    OPERATION_CONNECTION: 'これらを「後でやる／今やる」に分けるとしたら、何が必要でしょうか？'
  }
} as const;

/**
 * 操作子ラベル定義
 */
const OPERATOR_LABELS: Record<UIOperatorType, string> = UI_TEXTS.OPERATORS;

/**
 * 操作子を生成
 */
function createOperator(type: UIOperatorType): UIOperator {
  return {
    type,
    label: OPERATOR_LABELS[type]
  };
}

/**
 * 操作可能性表示を生成（Layer B）
 * 
 * 【重要制約】
 * - 許可される操作のみ: reorder, collapse, group, timeline
 * - 禁止される操作: highlight, recommend, prioritize, explain
 */
export function generateOperabilityPresentation(
  chunkCount: number
): OperabilityPresentation {
  const operators: UIOperator[] = [
    createOperator('REORDER')
  ];
  
  // チャンク数に応じて操作子を調整
  if (chunkCount >= 3) {
    operators.push(createOperator('COLLAPSE'));
  }
  if (chunkCount >= 5) {
    operators.push(createOperator('GROUP'));
  }
  operators.push(createOperator('TIMELINE'));
  
  return { availableOperators: operators };
}

// ============================================
// 3. Structural Question Generator (Layer C)
// 問い（構造内在型、判断を要求しない）
// ============================================

/**
 * 問いテンプレート
 * 
 * 【禁止】
 * - 「どうしますか？」(判断要求)
 * - 「何が問題ですか？」(評価要求)
 * - 「別の基準を考えましょうか？」(誘導)
 */
const QUESTION_TEMPLATES: Record<StructuralQuestionType, string> = UI_TEXTS.QUESTIONS;

/**
 * 構造内在型問いを生成（Layer C）
 */
export function generateStructuralQuestion(
  questionType: StructuralQuestionType = 'DIFF_ABSENCE'
): StructuralQuestion {
  return {
    type: 'STRUCTURAL_QUESTION',
    questionType,
    content: QUESTION_TEMPLATES[questionType]
  };
}

// ============================================
// 4. Learning Structure Output Generator
// カスタマイズ学習サポート構造生成
// ============================================

/**
 * 学習構造出力を生成
 * 
 * 【重要制約】
 * - 禁止される生成: 解説文、重要ポイント強調、学習順提示
 * - 許可される操作: 並べ替え、折りたたみ、時間軸配置、グルーピング
 */
/**
 * 出力制御インターフェース (intervention-control-serviceと一致させる)
 */
export interface OutputControl {
  showLayerA: boolean;
  showLayerB: boolean;
  showLayerC: boolean;
  layerBEmphasis: boolean;
  sequenceFixed: boolean;
}

/**
 * 学習構造出力を生成
 * 
 * 【重要制約】
 * - 禁止される生成: 解説文、重要ポイント強調、学習順提示
 * - 許可される操作: 並べ替え、折りたたみ、時間軸配置、グルーピング
 * - STATE_MAPPING: 迷子状態(M0-M5)に応じた出力制御（OutputControl）に従う
 */
export function generateLearningStructure(
  rawChunks: readonly RawChunk[],
  currentLostState: LostStateEstimate | null | undefined,
  outputControl: OutputControl, // 追加: 出力制御設定
  explicitQuestion?: StructuralQuestion // 追加: 外部導出された問い (StrictInterventionController由来)
): LearningStructureOutput {
  // Layer A: 構造提示（事実のみ、評価なし）
  // OutputControlに従って表示/非表示を切り替え（通常は常にTrueだが設計上制御可能にする）
  const layerA = outputControl.showLayerA 
    ? generateStructurePresentation(rawChunks)
    : { chunks: [] as ChunkData[], initialOrder: 'source_order' as const };
  
  // Layer B: 操作可能性提示（操作子のみ）
  // M0（初期状態）などでは非表示になる
  const layerB = outputControl.showLayerB
    ? generateOperabilityPresentation(rawChunks.length)
    : { availableOperators: [] as UIOperator[] }; // 非表示時は操作子なし
  
  // Layer C: 問い（臨界点時、またはM3などで表示）
  // OutputControlに従う（Critical判定はOutputControl生成時に考慮済みとする）
  let layerC: StructuralQuestion | undefined;
  if (outputControl.showLayerC) {
    if (explicitQuestion) {
      layerC = explicitQuestion;
    } else {
      // フォールバック: 外部問いがない場合はデフォルト生成（従来ロジック）
      layerC = generateStructuralQuestion();
    }
  }
  
  return { layerA, layerB, layerC };
}

// ============================================
// 5. Chunk Operations (操作子ロジック)
// 許可される操作のみ実装
// ============================================

/**
 * チャンクの並べ替え
 */
export function reorderChunks(
  chunks: readonly ChunkData[],
  newOrder: readonly string[]
): ChunkData[] {
  const chunkMap = new Map(chunks.map(c => [c.id, c]));
  return newOrder
    .map(id => chunkMap.get(id))
    .filter((c): c is ChunkData => c !== undefined);
}

/**
 * チャンクの折りたたみ/展開
 */
export function toggleChunkCollapse(
  chunks: readonly ChunkData[],
  chunkId: string
): ChunkData[] {
  return chunks.map(chunk => 
    chunk.id === chunkId
      ? { ...chunk, collapsed: !chunk.collapsed }
      : chunk
  );
}

/**
 * チャンクのグループ化
 */
export function groupChunks(
  chunks: readonly ChunkData[],
  chunkIds: readonly string[],
  groupId: string
): ChunkData[] {
  const idSet = new Set(chunkIds);
  return chunks.map(chunk =>
    idSet.has(chunk.id)
      ? { ...chunk, groupId }
      : chunk
  );
}

/**
 * チャンクのグループ解除
 */
export function ungroupChunks(
  chunks: readonly ChunkData[],
  groupId: string
): ChunkData[] {
  return chunks.map(chunk =>
    chunk.groupId === groupId
      ? { ...chunk, groupId: null }
      : chunk
  );
}

// ============================================
// 禁止される操作（実装しない）
// ============================================
// function highlightChunk(...): never { ... }      ❌ ハイライト禁止
// function recommendChunks(...): never { ... }     ❌ 推奨禁止
// function prioritizeChunks(...): never { ... }    ❌ 優先度付け禁止
// function explainChunk(...): never { ... }        ❌ 解説禁止
// function summarizeChunks(...): never { ... }     ❌ 要約禁止
