// ============================================
// CONCEPT_NOTES完全準拠 - 視点操作型定義
// 「問いは生成しない。視点を設計する。表現だけを翻訳する。」
// ============================================

// ============================================
// 1. 視点操作型（生成しない、設計する）
// ============================================

/**
 * 視点操作の型
 * これは「問い」ではない。構造が次に許容する視点の移動パターン。
 */
export type ViewpointOperationType = 
  | 'PURPOSE_ELICITATION'      // 目的を言語化させる
  | 'STATE_EXPANSION'          // 状態空間を展開させる
  | 'CHOICE_REDUCTION'         // 選択肢を削減させる
  | 'CRITERIA_GENERATION'      // 判断軸を生成させる
  | 'MEANS_END_SEPARATION'     // 目的と手段を分離させる
  | 'PATH_VISUALIZATION';      // 経路を可視化させる

/**
 * 問いの型（構造内在型）
 * CONCEPT_NOTES: 型1, 型2, 型3
 */
export type QuestionStructureType = 
  | 'DIFFERENCE_ABSENT'        // 型1: 差分不在を前提にした問い
  | 'GRANULARITY_CHECK'        // 型2: 判断軸の粒度に向けた問い
  | 'OPERATION_TRIGGER';       // 型3: 操作型への接続問い

/**
 * 視点操作子の定義
 * questions: string[] は存在しない
 * 問いは構造×型から動的に導出される
 */
export interface ViewpointOperator {
  id: string;
  targetLostState: string;
  operationType: ViewpointOperationType;
  structuralTarget: string;           // 何を観測するか
  expectedStructuralChange: {         // 期待される構造変化
    nodeDelta: number;
    relationDelta: number;
    depthDelta: number;
  };
  // 問いの文章はここにはない（動的に導出される）
}

// ============================================
// 2. 視点操作子定数（CONCEPT準拠）
// ============================================

export const VIEWPOINT_OPERATORS: Record<string, ViewpointOperator> = {
  O0: {
    id: 'O0',
    targetLostState: 'M0',
    operationType: 'PURPOSE_ELICITATION',
    structuralTarget: 'purpose_node_absence',
    expectedStructuralChange: { nodeDelta: 1, relationDelta: 0, depthDelta: 0 }
  },
  O1: {
    id: 'O1',
    targetLostState: 'M1',
    operationType: 'STATE_EXPANSION',
    structuralTarget: 'intermediate_state_absence',
    expectedStructuralChange: { nodeDelta: 2, relationDelta: 1, depthDelta: 1 }
  },
  O2: {
    id: 'O2',
    targetLostState: 'M2',
    operationType: 'CHOICE_REDUCTION',
    structuralTarget: 'choice_overflow',
    expectedStructuralChange: { nodeDelta: 0, relationDelta: 0, depthDelta: 0 }
  },
  O3: {
    id: 'O3',
    targetLostState: 'M3',
    operationType: 'CRITERIA_GENERATION',
    structuralTarget: 'criteria_absence',
    expectedStructuralChange: { nodeDelta: 1, relationDelta: 1, depthDelta: 0 }
  },
  O4: {
    id: 'O4',
    targetLostState: 'M4',
    operationType: 'MEANS_END_SEPARATION',
    structuralTarget: 'means_end_fusion',
    expectedStructuralChange: { nodeDelta: 1, relationDelta: 2, depthDelta: 1 }
  },
  O5: {
    id: 'O5',
    targetLostState: 'M5',
    operationType: 'PATH_VISUALIZATION',
    structuralTarget: 'path_invisibility',
    expectedStructuralChange: { nodeDelta: 0, relationDelta: 1, depthDelta: 0 }
  }
};

// ============================================
// 3. 構造的事実（観測結果）
// ============================================

/**
 * 構造的事実
 * これが「問い」の意味構造を決定する
 */
export interface StructuralFact {
  // 構造の状態
  nodeCount: number;
  relationCount: number;
  focusDepth: number;
  choiceCount: number;
  
  // 構造的振る舞いの痕跡（CONCEPT_NOTES準拠）
  sortingAttempted: boolean;      // 並べ替えを試みたか
  exclusionAttempted: boolean;    // 除外を試みたか
  groupingAttempted: boolean;     // グルーピングを試みたか
  
  // 繰り返しパターン
  sameOperatorRepeated: number;   // 同一操作子の繰り返し回数
  sameCriteriaUsed: boolean;      // 同一評価基準の再使用
  
  // 差分情報
  lastDelta: {
    nodeDelta: number;
    relationDelta: number;
  };
}

// ============================================
// 4. 問いの意味構造（動的に決定される）
// ============================================

/**
 * 問いの意味構造
 * 構造的事実 × 視点操作型 = 問いの意味
 * この構造が文章に「翻訳」される
 */
export interface QuestionSemantics {
  operationType: ViewpointOperationType;
  questionType: QuestionStructureType;
  structuralContext: {
    targetNode?: string;          // 対象ノードのラベル
    choiceLabels?: string[];      // 選択肢のラベル
    criteriaUsed?: string;        // 使用された評価基準
  };
  // 翻訳に必要な変数
  variables: Record<string, string>;
}

// ============================================
// 5. 翻訳テンプレート（表現のみ可変）
// ============================================

/**
 * 翻訳テンプレート
 * 意味構造を言語に変換するためのテンプレート
 * LLMはここにのみ関与できる（変数埋め込み＋自然な日本語化）
 */
export const TRANSLATION_TEMPLATES: Record<ViewpointOperationType, Record<QuestionStructureType, string>> = {
  PURPOSE_ELICITATION: {
    DIFFERENCE_ABSENT: '「{target}」を選んだとして、何が変わりそうですか？',
    GRANULARITY_CHECK: 'それは「やりたいこと」ですか、「できるようになりたいこと」ですか？',
    OPERATION_TRIGGER: 'もし一つだけ試せるとしたら、何を試しますか？'
  },
  STATE_EXPANSION: {
    DIFFERENCE_ABSENT: '「{target}」の一つ手前には、何がありそうですか？',
    GRANULARITY_CHECK: 'その段階は、もう少し分けられそうですか？',
    OPERATION_TRIGGER: '最初に手を動かすとしたら、何をしますか？'
  },
  CHOICE_REDUCTION: {
    DIFFERENCE_ABSENT: 'この中で「今は選ばなくてよいもの」はどれですか？',
    GRANULARITY_CHECK: '「{criteria}」という理由は、区別をつけるのに十分そうですか？',
    OPERATION_TRIGGER: 'これらを「今やる／後でやる」に分けるとしたら？'
  },
  CRITERIA_GENERATION: {
    DIFFERENCE_ABSENT: 'もしこの中から一つ選ぶとしたら、どんな理由があれば差が生まれそうですか？',
    GRANULARITY_CHECK: '今使っている基準では、どれも同じに見えていませんか？',
    OPERATION_TRIGGER: '「好き／嫌い」ではなく「できる／できない」で分けるとどうなりますか？'
  },
  MEANS_END_SEPARATION: {
    DIFFERENCE_ABSENT: '「{target}」は目的ですか、それとも手段ですか？',
    GRANULARITY_CHECK: 'それが「できた」としたら、その先に何がありますか？',
    OPERATION_TRIGGER: 'これを「目的」と「そのための手段」に分けてみてください'
  },
  PATH_VISUALIZATION: {
    DIFFERENCE_ABSENT: '今やっていることは、「{purpose}」のどこに効いていますか？',
    GRANULARITY_CHECK: '「{target}」と「{purpose}」の間には、何段階ありそうですか？',
    OPERATION_TRIGGER: '今の行動を、目的までの道筋に置いてみてください'
  }
};

// ============================================
// 6. 問いの導出関数（生成ではない）
// ============================================

/**
 * 構造的事実から問いの意味構造を導出する
 * LLMは使わない。純粋な構造的導出。
 */
export function deriveQuestionSemantics(
  fact: StructuralFact,
  operator: ViewpointOperator,
  context: { purposeAlpha?: string; focusedNodeLabel?: string; choiceLabels?: string[] }
): QuestionSemantics {
  
  // 問いの型を構造から決定
  let questionType: QuestionStructureType;
  
  if (fact.sameCriteriaUsed || fact.lastDelta.nodeDelta === 0) {
    // 差分が生まれていない → 型1
    questionType = 'DIFFERENCE_ABSENT';
  } else if (fact.sameOperatorRepeated >= 2) {
    // 同じ操作を繰り返している → 型2（粒度確認）
    questionType = 'GRANULARITY_CHECK';
  } else if (fact.sortingAttempted || fact.exclusionAttempted || fact.groupingAttempted) {
    // 操作を試みた痕跡がある → 型3（操作型接続）
    questionType = 'OPERATION_TRIGGER';
  } else {
    // デフォルト → 型1
    questionType = 'DIFFERENCE_ABSENT';
  }
  
  return {
    operationType: operator.operationType,
    questionType,
    structuralContext: {
      targetNode: context.focusedNodeLabel,
      choiceLabels: context.choiceLabels,
      criteriaUsed: undefined // 将来的に観測から取得
    },
    variables: {
      target: context.focusedNodeLabel || '',
      purpose: context.purposeAlpha || '',
      criteria: '' // 観測から取得
    }
  };
}

/**
 * 問いの意味構造を言語に翻訳する
 * これがLLMが関与できる唯一の場所（ただし意味は変えない）
 */
export function translateQuestionToLanguage(semantics: QuestionSemantics): string {
  const template = TRANSLATION_TEMPLATES[semantics.operationType]?.[semantics.questionType];
  
  if (!template) {
    // フォールバック
    return '次に何が見えますか？';
  }
  
  // 変数を埋め込み
  let result = template;
  for (const [key, value] of Object.entries(semantics.variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || 'それ');
  }
  
  return result;
}

// ============================================
// 7. 構造的振る舞いの観測
// ============================================

/**
 * ユーザーの構造的振る舞いを観測する
 * 内面（感情、理解度）は観測しない
 */
export interface StructuralBehaviorObservation {
  // 操作の痕跡
  operationType: 'SORT' | 'EXCLUDE' | 'GROUP' | 'SELECT' | 'EXPAND' | 'NONE';
  operationTarget?: string;
  
  // 繰り返しパターン
  isRepetition: boolean;
  repetitionCount: number;
  
  // 構造変化
  structuralChange: {
    nodesAdded: number;
    nodesRemoved: number;
    relationsAdded: number;
  };
}

/**
 * メッセージから構造的振る舞いを観測する
 * 感情分析は行わない
 */
export function observeStructuralBehavior(
  message: string,
  previousOperations: string[]
): StructuralBehaviorObservation {
  // キーワードベースで操作の種類を検出
  const sortKeywords = ['並べ', '順番', '優先', 'ランク', '比較'];
  const excludeKeywords = ['除外', 'いらない', '不要', 'なし', 'やめ', '選ばない'];
  const groupKeywords = ['グループ', '分類', 'カテゴリ', 'まとめ', '種類'];
  const expandKeywords = ['詳しく', 'もっと', '具体的', '分解', '細かく'];
  
  let operationType: StructuralBehaviorObservation['operationType'] = 'NONE';
  
  if (sortKeywords.some(k => message.includes(k))) {
    operationType = 'SORT';
  } else if (excludeKeywords.some(k => message.includes(k))) {
    operationType = 'EXCLUDE';
  } else if (groupKeywords.some(k => message.includes(k))) {
    operationType = 'GROUP';
  } else if (expandKeywords.some(k => message.includes(k))) {
    operationType = 'EXPAND';
  } else {
    operationType = 'SELECT';
  }
  
  // 繰り返し検出
  const lastOperation = previousOperations[previousOperations.length - 1];
  const isRepetition = lastOperation === operationType;
  const repetitionCount = isRepetition 
    ? previousOperations.filter(op => op === operationType).length 
    : 0;
  
  return {
    operationType,
    isRepetition,
    repetitionCount,
    structuralChange: {
      nodesAdded: 0, // 実際の処理で計算
      nodesRemoved: 0,
      relationsAdded: 0
    }
  };
}

// ============================================
// 8. レイヤー構造（CONCEPT準拠）
// ============================================

/**
 * レイヤーA: 事実の明示
 * 学習者の言葉を整理して返すだけ
 * 解釈・評価・判断は加えない
 */
export interface LayerA {
  factualStatement: string;
  // 禁止: 評価、判断、誘導、推奨
}

/**
 * レイヤーB: 状態遷移の説明
 * 構造がどう変化したかを述べるだけ
 */
export interface LayerB {
  structuralChange: string;
  // 禁止: 「〜すべき」「〜がおすすめ」
}

/**
 * レイヤーC: 問い
 * 構造から導出された視点操作の言語化
 */
export interface LayerC {
  question: string;
  semantics: QuestionSemantics; // 問いの意味構造（検証用）
}

/**
 * レイヤーD: 補助情報（処理には影響しない）
 * 表示用の参考情報のみ
 */
export interface LayerD {
  // 感情は「観測」ではなく「推測」なので、処理には使わない
  estimatedEmotion?: string;
  // これは表示用の参考情報としてのみ使用
  displayOnly: true;
}

/**
 * 完全なレスポンス構造
 */
export interface ConceptCompliantResponse {
  layerA: LayerA;
  layerB?: LayerB;
  layerC: LayerC;
  layerD?: LayerD; // 処理には影響しない
}

// ============================================
// 9. 選択肢（誘導しない）
// ============================================

/**
 * CONCEPT準拠の選択肢
 * description は「サービスの行動」ではなく「学習者の視点操作」を示唆
 */
export interface ConceptCompliantChoice {
  id: string;
  label: string;
  // description は「私がやること」ではなく「あなたが試す視点」
  viewpointHint: string;
  description: string; // フロントエンド互換性のため追加（内容はviewpointHintと同じ）
  // サービスが何かを「する」とは言わない
  isEscape: boolean;
}

/**
 * 選択肢を生成する（誘導しない）
 */
export function generateNonDirectiveChoices(
  structuralFact: StructuralFact,
  operator: ViewpointOperator
): ConceptCompliantChoice[] {
  const choices: ConceptCompliantChoice[] = [];
  
  // 視点操作の提案（サービスの行動ではない）
  switch (operator.operationType) {
    case 'PURPOSE_ELICITATION':
      choices.push({
        id: `choice-${Date.now()}-1`,
        label: 'この方向を試す',
        viewpointHint: 'この目的を仮置きして先に進む',
        description: 'この目的を仮置きして先に進む',
        isEscape: false
      });
      choices.push({
        id: `choice-${Date.now()}-2`,
        label: '別の言い方がある',
        viewpointHint: '目的を別の角度から言語化する',
        description: '目的を別の角度から言語化する',
        isEscape: false
      });
      break;
      
    case 'STATE_EXPANSION':
      choices.push({
        id: `choice-${Date.now()}-1`,
        label: 'もう一段細かく',
        viewpointHint: 'この段階をさらに分解して見る',
        description: 'この段階をさらに分解して見る',
        isEscape: false
      });
      choices.push({
        id: `choice-${Date.now()}-2`,
        label: 'この粒度で十分',
        viewpointHint: '今の解像度で次に進む',
        description: '今の解像度で次に進む',
        isEscape: false
      });
      break;
      
    case 'CHOICE_REDUCTION':
      choices.push({
        id: `choice-${Date.now()}-1`,
        label: 'これは今は選ばない',
        viewpointHint: '選択肢から除外する',
        description: '選択肢から除外する',
        isEscape: false
      });
      break;
      
    case 'CRITERIA_GENERATION':
      choices.push({
        id: `choice-${Date.now()}-1`,
        label: '別の基準で見る',
        viewpointHint: '今とは違う視点で比較する',
        description: '今とは違う視点で比較する',
        isEscape: false
      });
      break;
      
    default:
      break;
  }
  
  // エスケープ選択肢（常に提供）
  choices.push({
    id: `choice-${Date.now()}-escape-1`,
    label: 'わからない',
    viewpointHint: '今の視点では判断できない',
    description: '今の視点では判断できない',
    isEscape: true
  });
  choices.push({
    id: `choice-${Date.now()}-escape-2`,
    label: '一旦戻る',
    viewpointHint: '前の状態に戻って考え直す',
    description: '前の状態に戻って考え直す',
    isEscape: true
  });
  
  return choices;
}
