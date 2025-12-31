// ============================================
// Options Generator
// 選択肢生成モジュール
// GUIDE.md 4.3準拠: 意図検出→ノード抽出→選択肢生成→sandbox生成
// ============================================

import { llmClient } from '../llm/llm-client';

/**
 * 選択肢生成結果
 */
export interface GeneratedOptions {
  question_text: string;
  choices: Array<{ id: string; label: string; impact: string }>;
}

/**
 * 選択肢生成
 * 
 * 【責務】
 * 学習者の入力とノード構造に基づいて、診断的な問いと選択肢を生成
 * 
 * 【禁止事項】
 * - 特定の選択肢の推奨（「おすすめ」など）
 * - 正解・不正解の概念導入
 * - 誘導的な問いかけ
 */
export async function generateOptions(
  userInput: string,
  nodes: object,
  lostState?: string
): Promise<GeneratedOptions> {
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
    return await llmClient.chatCompletionJson<GeneratedOptions>(
      [{ role: 'user', content: prompt }],
      0.6
    );
  } catch (error) {
    console.error('generateOptions error:', error);
    return { question_text: '', choices: [] };
  }
}
