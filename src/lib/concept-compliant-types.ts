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


