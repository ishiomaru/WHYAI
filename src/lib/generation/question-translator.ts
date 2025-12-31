// ============================================
// Question Translator
// 問いの意味構造を自然言語に翻訳
// CONCEPT_NOTES.md準拠: 問いは「生成」しない、意味構造から「翻訳」する
// ============================================

import { llmClient } from '../llm/llm-client';
import { 
  QuestionSemantics, 
  getQuestionGenerationPrompt 
} from '../concept-compliant-types';

/**
 * 問いの意味構造を自然言語に翻訳
 * 
 * 設計書準拠: CONCEPT_NOTES.md
 * - 問いの意味は固定、表現は動的生成
 * - グローバル禁止ルールを注入
 * - LLMが失敗しないことが前提（モック/フォールバック禁止）
 */
export async function translateToNaturalLanguage(
  semantics: QuestionSemantics,
  targetLanguage: string = 'ja'
): Promise<string> {
  
  const questionPrompt = getQuestionGenerationPrompt(semantics, targetLanguage);
  
  const systemPrompt = `
あなたは「空間管理者（Space Manager）」です。教師でも助言者でもありません。
学習者の思考空間の構造を投影し、その構造から必然的に発生する「問い」を生成する装置です。

以下のプロンプトに従って、問いを1文だけ生成してください。
複数の文章、解説、例示は不要です。問い1文のみを返してください。

変数が空の場合は「それ」「これ」などの代名詞を使用してください。
「」の中が空になる表現は絶対に避けてください。
`;

  const content = await llmClient.chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: questionPrompt }
    ],
    { temperature: 0.7 }
  );
  
  const trimmed = content.trim();
  
  // バリデーション: 空、空括弧、短すぎる場合はエラー
  if (!trimmed || /「\s*」/.test(trimmed) || trimmed.length < 2) {
    throw new Error(`問い生成失敗: 無効なLLMレスポンス (content: ${trimmed})`);
  }
  
  return trimmed;
}
