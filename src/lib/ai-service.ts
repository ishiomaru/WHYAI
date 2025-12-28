import OpenAI from 'openai';
import { 
  QuestionSemantics, 
  translateQuestionToLanguage
} from './concept-compliant-types';
import { SupportContext } from './support-context-assembler';
import {
  SupportPayload,
  LostState
} from './structure-generation-types';

// ===================================
// AI Backend Configuration (Local LLM)
// ===================================
// ユーザー要件: "API-keyなしで使える" (一般的なOpenAI互換のローカルエンドポイント Ollama/Llama.cpp などを使用)
// 指定がない場合はlocalhost:11434 (Ollama)をデフォルトとする
const BASE_URL = process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';
const MODEL_NAME = process.env.LOCAL_LLM_MODEL || 'llama3'; // 一般的なオープンモデルをデフォルトとする
const API_KEY = process.env.LOCAL_LLM_API_KEY || 'ollama'; // ローカルサーバーでは無視されることが多い

/**
 * AI Service
 * 
 * 厳格な「Space Manager」ペルソナを持つAIサービス。
 * 特定の商用クラウドAPIキーに依存せず、Local LLMのエンドポイントを利用して機能する。
 * "見かけ上の簡易的"ではなく、実際のLLM推論を用いて動的に分類・翻訳を行う。
 */
export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: BASE_URL,
      apiKey: API_KEY,
      dangerouslyAllowBrowser: false // Next.jsのみサーバーサイド
    });
    console.log(`AI Service Initialized: Connected to ${BASE_URL} (Model: ${MODEL_NAME})`);
  }

  /**
   * テキストのEmbeddingを取得
   * (Semantic Drift分析用)
   */
  async embedText(text: string): Promise<number[]> {
    try {
      // Local LLMがEmbeddingに対応していない場合があるため、互換性を考慮
      const response = await this.openai.embeddings.create({
        model: MODEL_NAME,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // モックなし: エラーをそのまま投げる
      throw new Error(`Embedding生成失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ユーザーの意図を分類
   * (Semantic Bridge用)
   * ※厳格にLLMを用いて推論を行う
   */
  async classifyIntent(text: string, historySummary: string): Promise<{
    intent: 'DEEP_DIVE' | 'BROAD_EXPLORATION' | 'SPECIFIC_NEED' | 'UNCLEAR';
    driftScore: number;
  }> {
    const systemPrompt = `
    Role: Intent Analyzer.
    Task: Classify the user's learning intent based on the input.
    
    Category Definitions:
    - DEEP_DIVE: Theoretical, structural, internal mechanism questions.
    - BROAD_EXPLORATION: How-to, tutorials, overview, starting out.
    - SPECIFIC_NEED: Bug fixes, specific errors, implementation blocks.
    - UNCLEAR: Vague or undefined inputs.

    Estimate "Drift Score" (0.0 - 1.0):
    - 0.0: Perfectly aligned with previous context.
    - 1.0: Completely irrelevant/random jump.

    Output JSON ONLY: { "intent": "string", "driftScore": number }
    `;

    const userPrompt = `
    Context: ${historySummary}
    Input: "${text}"
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1 // Deterministic behavior
      });

      const content = completion.choices[0].message.content;
      if (content) {
         return JSON.parse(content);
      }
      throw new Error('Empty response from LLM');
    } catch (error) {
      console.error('Intent classification failed:', error);
      // モックなし: エラーをそのまま投げる
      throw new Error(`Intent分類失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 問いの意味構造を自然言語に翻訳
   * (Translation Layer)
   * ※テンプレート完全廃止。動的生成だが、型（構造）を厳守する。
   */
  /**
   * 問いの意味構造を自然言語に翻訳
   * (Translation Layer)
   * ※テンプレート完全廃止。動的生成だが、型（構造）を厳守する。
   */
  async translateToNaturalLanguage(
    semantics: QuestionSemantics
  ): Promise<string> {
    
    // フォールバック用のテンプレート関数を使用 (static import)
    // const { translateQuestionToLanguage } = require('./concept-compliant-types');

    const systemPrompt = `
    Role: Space Manager (Cognitive Map Generation Engine)
    
    CRITICAL INSTRUCTION:
    You are a "Projection Device". You do NOT speak as a human.
    You strictly translate the provided "Meaning Structure" (Semantics) into a structural Japanese sentence.
    
    TABOOS (Strictly Prohibited):
    - NO Teaching / Explaining / Summarizing.
    - NO Recommendations / Judgments.
    - NO Empathy / Chatting.
    - NO EMPTY BRACKETS like 「」. If a variable is missing, use "それ" (it) or "これ" (this).
    
    Input:
    - Operation Type (O0-O5)
    - Question Type (Verification/Difference/Criteria, etc.)
    - Context Variables
    
    Output:
    - A single Japanese sentence that reflects the structure.
    - It must be DYNAMIC based on the specific variables, not a static template.
    
    Examples:
    Input: { operationType: 'PURPOSE_ELICITATION', questionType: 'DIFFERENCE_ABSENT', variables: { target: 'A' } }
    Output: 「A」を選んだとして、何が変わりそうですか？

    Input: { operationType: 'CRITERIA_GENERATION', questionType: 'GRANULARITY_CHECK', variables: { criteria: '好き嫌い' } }
    Output: 「好き嫌い」という基準では、どれも同じに見えていませんか？
    `;

    const userPrompt = `
    Semantics: ${JSON.stringify(semantics)}
    
    Translate this structure into a Space Manager's projection text.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7 
      });
      
      const content = completion.choices[0].message.content?.trim();
      
      // コンテンツが空、または「」を含む、またはエラーメッセージの場合はフォールバック
      // 正規表現強化: 文字列中に「」が含まれていたらNG (例: "「」はどうですか？")
      const hasEmptyBrackets = !content || /「\s*」/.test(content) || content.length < 2;
      
      if (hasEmptyBrackets) {
        console.warn('AI returned invalid content (contains empty brackets), falling back to template.', { content });
        return translateQuestionToLanguage(semantics);
      }
      
      return content;
      
    } catch (error) {
      console.error('Translation error:', error);
      // エラー時はテンプレートにフォールバック
      return translateQuestionToLanguage(semantics);
    }
  }

  // ============================================
  // 段階的LLM生成メソッド（Phase 5: LLMクエリ分離）
  // GUIDE.md 4.3準拠: 意図検出→ノード抽出→選択肢生成→sandbox生成
  // ============================================

  /**
   * Phase 1: 意図検出
   * 
   * 【責務】
   * ユーザー入力からソート/フィルタ意図を検出
   * 
   * 【禁止事項】
   * - 意図の強制検出禁止（なければnullで返す）
   * - 推奨の暗示禁止
   */
  async detectIntent(userInput: string): Promise<{
    sort_intent?: { detected: boolean; criteria?: string; confidence: 'low' | 'mid' | 'high' };
    filter_intent?: { detected: boolean; criteria?: string; confidence: 'low' | 'mid' | 'high' };
  }> {
    const prompt = `
あなたは空間管理者です。ユーザー入力を分析し、ソート/フィルタの意図を検出せよ。

【禁止事項】
- 意図がなければ無理に検出しない（detected: false）
- 推奨や評価を含めない

入力: "${userInput}"

JSON形式で回答:
{
  "sort_intent": { "detected": boolean, "criteria": "string or null", "confidence": "low|mid|high" },
  "filter_intent": { "detected": boolean, "criteria": "string or null", "confidence": "low|mid|high" }
}
`;
    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('detectIntent error:', error);
      return {};
    }
  }

  /**
   * Phase 2: ノード抽出（構造更新）
   * 
   * 【責務】
   * 現在のコンテキストとユーザー入力に基づいて、構造を「更新」する。
   * - 既存ノードの維持、統合、または削除
   * - 新規ノードの追加
   * 
   * 【禁止事項】
   * - 最低数の強制禁止
   * - 重要度の判断禁止
   * - ノードの評価禁止
   * - 単純な連番IDの使用禁止 (n1, n2...)
   */
  async extractNodes(userInput: string, intentResult: object, currentNodes: any[] = [], recentLogs: any[] = []): Promise<{
    nodes: Array<{ id: string; label: string; description?: string; reliability: 'low' | 'medium' | 'high' }>;
    edges: Array<{ from: string; to: string }>;
    contradictions: Array<{ source: string; target: string; reason: string }>;
  }> {
    const prompt = `
あなたは空間管理者です。現在の「思考の地図（ノード構造）」と、ユーザーからの新しい入力に基づいて、地図を更新せよ。

## 現在の構造 (Context)
${JSON.stringify(currentNodes)}

## 直近の会話/操作履歴 (History)
${JSON.stringify(recentLogs)}

## ユーザー入力 (New Input)
"${userInput}"

## 検出済み意図
${JSON.stringify(intentResult)}

## タスク: 構造の更新 (Structure Update)
1. **既存ノードの確認**: 入力に関連する既存ノードがあれば、それを維持または強化する。
2. **新規ノードの追加**: 新しい概念や視点があれば、新しいノードを作成する。
3. **矛盾・ギャップの検出**: ノード間の論理的な矛盾や、欠けている要素を特定する。

## ID生成ルール (Unique IDs)
- **既存ノード**: 必ず元のIDを維持すること。変更してはならない。
- **新規ノード**: 他と被らないユニークなIDを生成すること。
  - ❌ 禁止: "n1", "n2", "node1" (単純な連番は衝突するため禁止)
  - ✅ 推奨: "hash_<concept_name>", "node_<timestamp>_<random>"

## JSON形式で回答:
{
  "nodes": [
    { "id": "既存ID_または_新規ID", "label": "概念ラベル(必須・空文字禁止)", "description": "ノードの簡潔な説明(1-2文)", "reliability": "low|medium|high" }
  ],
  "edges": [{ "from": "id_a", "to": "id_b" }],
  "contradictions": [{ "source": "id_a", "target": "id_b", "reason": "矛盾理由" }]
}
`;
    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.5
      });
      const result = JSON.parse(response.choices[0].message.content || '{"nodes":[],"edges":[],"contradictions":[]}');
      
      // 空のラベルを持つノードを修正または除外
      result.nodes = result.nodes.map((n: any) => ({
        ...n,
        label: n.label || n.description || "不明な概念", // ラベルが空なら説明またはデフォルトを使用
      })).filter((n: any) => n.label && n.label.trim() !== "");

      return result;
    } catch (error) {
      console.error('extractNodes error:', error);
      return { nodes: [], edges: [], contradictions: [] };
    }
  }

  /**
   * Phase 3: 選択肢生成
   * 
   * 【責務】
   * 学習者の入力とノード構造に基づいて、診断的な問いと選択肢を生成
   * 
   * 【禁止事項】
   * - 特定の選択肢の推奨（「おすすめ」など）
   * - 正解・不正解の概念導入
   * - 誘導的な問いかけ
   */
  async generateOptions(
    userInput: string,
    nodes: object,
    lostState?: string
  ): Promise<{
    question_text: string;
    choices: Array<{ id: string; label: string; impact: string }>;
  }> {
    const prompt = `
あなたは空間管理者です。現在の「思考の地図（ノード構造）」と「学習者の入力」に基づいて、思考を深めるための診断的な「問い」と選択肢を生成せよ。

## 現在の構造 (Structure Context)
${JSON.stringify(nodes)}

## 学習者の入力 (User Input)
"${userInput}"

## 迷子状態 (State)
${lostState || 'DIAGNOSTIC'}

## 前提: ロジックによる判断基準
あなたは以下のロジックに従って問いを選択しなければならない：
- **構造が希薄な場合**: 探索範囲を広げる問い（概念の分解、関連付け）
- **矛盾がある場合**: 矛盾の解消を促す問い
- **構造が複雑な場合**: 優先順位や判断軸を問う問い

## タスク: 問いと選択肢の生成
1. **問いの生成**: ノード構造から導出される具体的な問いを作成する。
   - 【絶対禁止】ユーザー入力をそのまま「目的」として引用すること。（例: 「『${userInput}』という目的について...」は禁止）
   - 【推奨】ノード間の関係性、不足している視点、優先順位について問う。

2. **選択肢の生成**: 以下のルールに従って選択肢を生成する。
   - **数**: 状況に応じて **3〜5個** の間で動的に決定する（構造が複雑なら絞り、単純なら広げる）。
   - **内容**: ノード構造に基づいた具体的な概念や行動指針。
   - **必須**: 最後に「わからない」または「特にない」を含めること（逃げ道）。

JSON形式で回答:
{
  "question_text": "構造に基づいた具体的な問い",
  "choices": [
    { "id": "c1", "label": "選択肢1", "impact": "選択時の構造的影響" },
    { "id": "c2", "label": "選択肢2", "impact": "選択時の構造的影響" },
    ...
    { "id": "unknown", "label": "わからない", "impact": "スキップ" }
  ]
}
`;
    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6
      });
      return JSON.parse(response.choices[0].message.content || '{"question_text":"","choices":[]}');
    } catch (error) {
      console.error('generateOptions error:', error);
      return { question_text: '', choices: [] };
    }
  }

  /**
   * Phase 4: sandbox生成（RESOLVED時のみ呼び出し）
   * カスタムHTML/CSS/JSページを生成
   */
  async generateSandboxCode(
    userInput: string,
    nodes: object,
    options: object
  ): Promise<{
    html: string;
    css: string;
    js: string;
  } | null> {
    const prompt = `
あなたは「選択を終えた学習者」のために、最適な学習リソースページを生成するWebエンジニアです。
ユーザーは既に自分の学習目的を理解し、迷子状態を脱しています（State: RESOLVED）。

## 役割
彼らが求めているのは、自分の選択に基づいた「実質的な学習（Deep Dive）」が可能な、具体的で詳細な情報ページです。
単なる構造図ではなく、「読み物・資料」として価値のあるページを生成してください。

## 入力情報
入力: "${userInput}"
ノード: ${JSON.stringify(nodes)}
選択肢: ${JSON.stringify(options)}

## 許可される事項（RESOLVED限定）
- ✅ 詳細な解説・専門的な説明（教示的であっても良い）
- ✅ 具体的なコード例や実践的な手順の提示
- ✅ 「なぜ重要か」といった文脈の補足
- ✅ 構造の可視化（グラフや図解）も含む

## 禁止事項
- ❌ ユーザーの選択を否定すること
- ❌ 一般論でお茶を濁すこと（具体的であるべき）
- ❌ 意味のない装飾アニメーション

## 出力要件
- 単一のHTMLファイルとして機能するコード（HTML/CSS/JS）を出力してください。
- デザインは「Note-like Style」を踏襲し、白ベースで読みやすく、美しいタイポグラフィを使用してください。
- コンテンツは「導入」「詳細解説」「実践/例」「まとめ」のような構成で、学習者がそのページだけで一定の知識を得られるようにしてください。

JSON形式で回答:
{
  "html": "<div class='learning-page'>...</div>",
  "css": ".learning-page { ... }",
  "js": "// ... "
}
`;
    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.5
      });
      return JSON.parse(response.choices[0].message.content || 'null');
    } catch (error) {
      console.error('generateSandboxCode error:', error);
      return null;
    }
  }

  /**
   * 学習者サポート（Projection/Generation）を生成
   * (Section VI: Learner Support Extension)
   * 
   * 設計原則:
   * - 操作子自体を診断装置にする（問いへの反応で状態を明らかにする）
   * - 単発判定禁止（最低2段階以上）
   * - 状態を断定しない（「もし今◯◯なら、この問いが効く」構造）
   */
  async generateLearnerSupport(context: SupportContext): Promise<SupportPayload> {
    
    const systemPrompt = `
あなたは「空間管理者（Space Manager）」です。教師でも助言者でもありません。
学習者の思考空間の構造を投影し、その構造から必然的に発生する「問い」を返す装置です。

## 絶対禁止事項
- 教えること（概念説明、コード修正、答えの提供）
- 判断（「良い」「正しい」「間違い」の評価）
- 推奨（「Xをすべき」「〜がおすすめ」）
- 共感（「大丈夫」「わかります」「頑張って」）
- 要約（外部情報の内容を自分の言葉で言い換える）

## あなたの役割
1. 学習者の入力から「構造」を抽出（ノード化）- 最低3つ以上のノードを抽出
2. ソート/フィルタ意図を検出（比較語、除外表現を分析）
3. 状態を診断するための問いを生成（操作子 = 診断装置）
4. 問いへの反応パターンに応じた選択肢を提示

## ソート/フィルタ意図の検出ルール
- 「〜より」「〜らの」「どっちが」→ ソート意図（judgment_axis_1 or judgment_axis_2）
- 「〜以外」「〜だけ」「〜ではない」→ フィルタ意図（除外基準）
- 「まず」「最初に」「先に」→ ソート意図（timestamp）
- 意図が検出された場合は detected_intent に構造化して返す

## 出力ルール
- すべて日本語で出力
- ノードは最低3つ以上抽出（学習者入力から概念・行動・目的などを分解）
- 問いは具体的かつ構造的
- 選択肢には必ず「わからない」を含める（逃げ道 = 安全装置）

## sandbox_code生成条件（カスタムページ）
以下の場合に sandbox_code を生成する:
- ノード間関係が複雑で、グラフだけでは伝わらない場合
- 2つ以上の選択肢を並べて構造的差異を見せる場合
- 時系列や手順の構造を視覚化する場合

sandbox_code禁止事項:
- ❌ チュートリアル、解説
- ❌ 「おすすめ」表現
- ❌ 装飾的アニメーション

## JSON出力フォーマット（すべて必須）
{
  "target_lost_state": "DIAGNOSTIC | M0 | M1 | M2 | M3 | M4 | M5",
  "projection_map": {
    "nodes": [
      { "id": "1", "label": "概念A", "description": "概念Aの説明", "reliability": "high" },
      { "id": "2", "label": "概念B", "description": "概念Bの説明", "reliability": "mid" },
      { "id": "3", "label": "概念C", "description": "概念Cの説明", "reliability": "low" }
    ],
    "contradictions": []
  },
  "generated_options": {
    "axis_label": "判断軸（日本語）",
    "options": [
      { "label": "選択肢1", "impact": "構造的影響" },
      { "label": "選択肢2", "impact": "構造的影響" },
      { "label": "わからない", "impact": "さらに詳しい問いを投げる" }
    ]
  },
  "detected_intent": {
    "sort_intent": {
      "detected": true/false,
      "axis_type": "judgment_axis_1 | judgment_axis_2 | timestamp",
      "axis_label": "検出された軸",
      "confidence": "high | mid | low"
    },
    "filter_intent": {
      "detected": true/false,
      "exclude_criteria": ["除外基準"],
      "include_criteria": ["包含基準"],
      "confidence": "high | mid | low"
    }
  },
  "diagnostic_question": "状態を診断するための問い（日本語）",
  "structural_fact_summary": "観測された構造的事実の要約",
  "sandbox_code": {
    "html": "<div class='structure-map'>構造を表現するHTML</div>",
    "css": ".structure-map { display: grid; gap: 1rem; }",
    "js": "// 必要最小限のインタラクション（省略可）"
  }
}

注: sandbox_codeは構造的に必要な場合のみ生成。不要な場合は省略してよい。
`;

    const userPrompt = `
## 学習者の入力
「${context.purposeAlpha}」

## 現在の推定状態
${context.lostState}（確定ではない、仮説として扱う）

## 構造的事実（観測されたもの）
${JSON.stringify(context.structuralFact)}

## 直近の操作ログ
${context.recentLogs.length === 0 ? '（初回入力：操作履歴なし → target_lost_stateは"DIAGNOSTIC"にする）' : JSON.stringify(context.recentLogs)}

## タスク
1. 学習者の入力から3つ以上の構造（ノード）を抽出
2. ソート/フィルタ意図を分析し detected_intent に記載
3. 状態診断のための問いを1つ生成
4. その問いに対する選択肢を2〜3個 + 「わからない」を生成
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      if (content) {
         return JSON.parse(content) as SupportPayload;
      }
      throw new Error('Invalid JSON format from LLM');
    } catch (error) {
      console.error('Support generation error:', error);
      // モックなし: エラーをそのまま投げる
      throw new Error(`サポート生成失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const aiService = new AIService();
