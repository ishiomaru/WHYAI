// ============================================
// Sandbox Generator
// RESOLVED時のカスタムHTML/CSS/JSページ生成
// ============================================

import { llmClient } from '../llm/llm-client';

/**
 * Sandboxコード
 */
export interface SandboxCode {
  html: string;
  css: string;
  js: string;
}

/**
 * sandbox生成（RESOLVED時のみ呼び出し）
 * カスタムHTML/CSS/JSページを生成
 */
export async function generateSandboxCode(
  userInput: string,
  nodes: object,
  options: object
): Promise<SandboxCode | null> {
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
    return await llmClient.chatCompletionJson<SandboxCode>(
      [{ role: 'user', content: prompt }],
      0.5
    );
  } catch (error) {
    console.error('generateSandboxCode error:', error);
    return null;
  }
}
