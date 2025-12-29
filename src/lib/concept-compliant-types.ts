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
// 5. グローバル禁止ルール
// CONCEPT_NOTES.md 準拠 - 思考代行の禁止
// ============================================

/**
 * 禁止カテゴリの定義
 */
export interface ProhibitionCategory {
  readonly id: string;
  readonly description: string;
  readonly examples: readonly string[];
}

/**
 * 禁止ルール全体
 */
export interface ProhibitionRules {
  readonly categories: readonly ProhibitionCategory[];
}

/**
 * グローバル禁止ルール
 * 
 * 設計書参照: CONCEPT_NOTES.md
 * - L599-608: AI禁止事項
 * - L180-186: 問いの違反例
 * - L1087-1094: 状態断定の禁止
 * - L1182-1186: サービス原則
 */
export const GLOBAL_PROHIBITION_RULES: ProhibitionRules = {
  categories: [
    {
      id: 'NO_IMPORTANCE_JUDGMENT',
      description: '重要度・優先度の判断を禁止',
      examples: [
        '「この情報は初心者向け」',
        '「重要度が高い」',
        '「これが一番大事」',
        '「優先すべきは〜」'
      ]
    },
    {
      id: 'NO_RECOMMENDATION',
      description: '推奨・指示の提示を禁止',
      examples: [
        '「次はこれをやるべき」',
        '「おすすめは〜」',
        '「〜した方がいい」',
        '「〜すべきです」'
      ]
    },
    {
      id: 'NO_JUDGMENT_DEMAND',
      description: '判断を要求する問いを禁止',
      examples: [
        '「どうしますか？」',
        '「何が問題ですか？」',
        '「別の基準を考えましょうか？」',
        '「何を選びますか？」'
      ]
    },
    {
      id: 'NO_STATE_ASSERTION',
      description: '状態の断定を禁止',
      examples: [
        '「あなたはいまM2です」',
        '「あなたは〜の状態です」',
        '「あなたは迷っています」'
      ]
    },
    {
      id: 'NO_EVALUATION',
      description: '正誤・良否の評価を禁止',
      examples: [
        '「それは間違っています」',
        '「その考えは正しい」',
        '「良い考えです」',
        '「その理解は違います」'
      ]
    }
  ]
};

// ============================================
// 6. 問いの意味構造（動的生成用）
// CONCEPT_NOTES.md 準拠 - 視点操作子の意図定義
// ============================================

/**
 * 問いの意味構造定義
 * 
 * semanticIntent: LLMに渡す「何を問うか」の説明
 * structuralGoal: 期待される構造変化（検証用）
 * requiredVariables: 文脈から取得すべき変数
 */
export interface QuestionSemantic {
  readonly semanticIntent: string;
  readonly structuralGoal: {
    readonly expectedNodeChange: 'increase' | 'decrease' | 'restructure' | 'none';
    readonly expectedRelationChange: 'increase' | 'decrease' | 'restructure' | 'none';
  };
  readonly requiredVariables: readonly string[];
}

/**
 * 視点操作子×問いの型ごとの意味構造
 * 
 * 設計書参照: CONCEPT_NOTES.md
 * - L941-1019: 視点操作子O0-O5の定義
 * - L149-177: 問いの型1-3の定義
 */
export const QUESTION_SEMANTICS: Record<
  ViewpointOperationType,
  Record<QuestionStructureType, QuestionSemantic>
> = {
  PURPOSE_ELICITATION: {
    DIFFERENCE_ABSENT: {
      semanticIntent: '選択肢を選んだ場合の変化を言語化させる。差分が見えていない状態を解消する。対象ノードへの選択による影響を問う。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'increase' },
      requiredVariables: ['target']
    },
    GRANULARITY_CHECK: {
      semanticIntent: '目的の粒度を確認させる。「やりたいこと」と「できるようになりたいこと」の区別を促す。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'none' },
      requiredVariables: []
    },
    OPERATION_TRIGGER: {
      semanticIntent: '具体的な行動への接続を促す。思考から行動への橋渡し。「もし一つだけ試せるとしたら」という制約で具体化を促す。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'increase' },
      requiredVariables: []
    }
  },
  STATE_EXPANSION: {
    DIFFERENCE_ABSENT: {
      semanticIntent: '到達プロセスの中間状態を言語化させる。ゴールの一つ手前を問うことで状態空間を展開する。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'increase' },
      requiredVariables: ['target']
    },
    GRANULARITY_CHECK: {
      semanticIntent: '状態の分割可能性を確認させる。現在の粒度がさらに分けられるかを問う。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'none' },
      requiredVariables: []
    },
    OPERATION_TRIGGER: {
      semanticIntent: '最初の具体行動を想起させる。「最初に手を動かすとしたら」という制約で行動を引き出す。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'increase' },
      requiredVariables: []
    }
  },
  CHOICE_REDUCTION: {
    DIFFERENCE_ABSENT: {
      semanticIntent: '選択肢の除外可能性を問う。「今は選ばなくてよいもの」を特定させることで選択肢を縮退させる。',
      structuralGoal: { expectedNodeChange: 'decrease', expectedRelationChange: 'none' },
      requiredVariables: []
    },
    GRANULARITY_CHECK: {
      semanticIntent: '使用中の評価基準の粒度を確認させる。その基準で区別がつくかを問う。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'none' },
      requiredVariables: ['criteria']
    },
    OPERATION_TRIGGER: {
      semanticIntent: '時間軸での分割を促す。「今やる／後でやる」という軸で選択肢を分類させる。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'increase' },
      requiredVariables: []
    }
  },
  CRITERIA_GENERATION: {
    DIFFERENCE_ABSENT: {
      semanticIntent: '差を生む評価基準の生成を促す。「どんな理由があれば差が生まれそうか」を問う。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'increase' },
      requiredVariables: []
    },
    GRANULARITY_CHECK: {
      semanticIntent: '現在の評価基準の不十分さを気づかせる。「今使っている基準では同じに見えていないか」を問う。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'none' },
      requiredVariables: []
    },
    OPERATION_TRIGGER: {
      semanticIntent: '評価軸の切り替えを促す。「好き／嫌い」から「できる／できない」への視点変換を提案。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'restructure' },
      requiredVariables: []
    }
  },
  MEANS_END_SEPARATION: {
    DIFFERENCE_ABSENT: {
      semanticIntent: '目的と手段の区別を問う。対象が「目的か手段か」を言語化させる。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'increase' },
      requiredVariables: ['target']
    },
    GRANULARITY_CHECK: {
      semanticIntent: '目的の先にあるものを問う。「できたとしたら、その先に何があるか」で目的の階層を確認。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'none' },
      requiredVariables: []
    },
    OPERATION_TRIGGER: {
      semanticIntent: '目的と手段の分離操作を促す。現在の要素を「目的」と「そのための手段」に分類させる。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'increase' },
      requiredVariables: []
    }
  },
  PATH_VISUALIZATION: {
    DIFFERENCE_ABSENT: {
      semanticIntent: '現在の行動と目的の接続を問う。「今やっていることは目的のどこに効いているか」を言語化させる。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'increase' },
      requiredVariables: ['purpose']
    },
    GRANULARITY_CHECK: {
      semanticIntent: '目的までの距離感を確認させる。対象と目的の間の段階数を問う。',
      structuralGoal: { expectedNodeChange: 'increase', expectedRelationChange: 'none' },
      requiredVariables: ['target', 'purpose']
    },
    OPERATION_TRIGGER: {
      semanticIntent: '経路の再配置を促す。現在の行動を目的までの道筋に位置づけさせる。',
      structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'restructure' },
      requiredVariables: []
    }
  }
};

// ============================================
// 7. プロンプト生成関数
// ============================================

/**
 * 問い生成用のLLMプロンプトを組み立てる
 * 
 * @param semantic - 問いの意味構造
 * @param context - 現在の文脈（変数値）
 * @param rules - 禁止ルール
 * @param targetLanguage - 生成言語（デフォルト: ja）
 */
export function buildQuestionGenerationPrompt(
  semantic: QuestionSemantic,
  context: Record<string, string>,
  rules: ProhibitionRules = GLOBAL_PROHIBITION_RULES,
  targetLanguage: string = 'ja'
): string {
  
  const prohibitionSection = rules.categories.map(cat => 
    `### ${cat.description}\n禁止例: ${cat.examples.join(' / ')}`
  ).join('\n\n');
  
  const contextSection = Object.entries(context)
    .filter(([, v]) => v) // 空の値を除外
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  
  const languageInstruction = targetLanguage === 'ja' 
    ? '日本語で生成してください。' 
    : `${targetLanguage}で生成してください。`;
  
  return `
# 問い生成タスク

## 生成言語
${languageInstruction}

## 絶対禁止事項
以下の表現は絶対に使用しないでください:

${prohibitionSection}

## 生成する問いの意図
${semantic.semanticIntent}

## 現在の文脈
${contextSection || '（文脈情報なし）'}

## 出力形式
- 問いを1文で生成
- 学習者が自分で考えるきっかけになる表現
- 判断を求めず、視点を変えさせる
- 回答を誘導しない
`.trim();
}

// ============================================
// 8. 問いの導出関数（生成ではない）
// ============================================

// 判定閾値の定義
const DELTA_THRESHOLD = 0.3;  // nodeDeltaの変化判定閾値
const REPEAT_THRESHOLD = 2;   // 操作繰り返し判定閾値（要相談）

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
  
  // 差分判定を閾値ベースに変更
  const hasMinimalChange = Math.abs(fact.lastDelta.nodeDelta) < DELTA_THRESHOLD;
  
  if (fact.sameCriteriaUsed || hasMinimalChange) {
    // 差分が生まれていない → 型1
    questionType = 'DIFFERENCE_ABSENT';
  } else if (fact.sameOperatorRepeated >= REPEAT_THRESHOLD) {
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
 * 問いの意味構造をLLM用プロンプトとして返す
 * 
 * 注意: この関数は同期的にプロンプトを返すのみ。
 * 実際のLLM呼び出しはai-service.tsで行う。
 */
export function getQuestionGenerationPrompt(
  semantics: QuestionSemantics,
  targetLanguage: string = 'ja'
): string {
  const semantic = QUESTION_SEMANTICS[semantics.operationType]?.[semantics.questionType];
  
  if (!semantic) {
    // フォールバック: 基本的な視点操作を促す
    return buildQuestionGenerationPrompt(
      {
        semanticIntent: '現在の状況を別の角度から見させる問いを生成する。',
        structuralGoal: { expectedNodeChange: 'none', expectedRelationChange: 'none' },
        requiredVariables: []
      },
      semantics.variables,
      GLOBAL_PROHIBITION_RULES,
      targetLanguage
    );
  }
  
  return buildQuestionGenerationPrompt(
    semantic,
    semantics.variables,
    GLOBAL_PROHIBITION_RULES,
    targetLanguage
  );
}


