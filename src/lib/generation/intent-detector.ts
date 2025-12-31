// ============================================
// Intent Detector
// ソート/フィルタ意図の検出
// ============================================

import { llmClient } from '../llm/llm-client';

/**
 * 意図検出結果
 */
export interface DetectedIntent {
  sort_intent?: { detected: boolean; criteria?: string; confidence: 'low' | 'mid' | 'high' };
  filter_intent?: { detected: boolean; criteria?: string; confidence: 'low' | 'mid' | 'high' };
}

/**
 * 意図検出
 * 
 * 【責務】
 * ユーザー入力からソート/フィルタ意図を検出
 * 
 * 【禁止事項】
 * - 意図の強制検出禁止（なければnullで返す）
 * - 推奨の暗示禁止
 */
export async function detectIntent(userInput: string): Promise<DetectedIntent> {
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
    return await llmClient.chatCompletionJson<DetectedIntent>(
      [{ role: 'user', content: prompt }],
      0.3
    );
  } catch (error) {
    console.error('detectIntent error:', error);
    return {};
  }
}
