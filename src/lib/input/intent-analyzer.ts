// ============================================
// Intent Analyzer
// ユーザー入力と履歴から意図を分類
// semantic-bridge.ts + ai-service.classifyIntent の統合
// ============================================

import { llmClient } from '../llm/llm-client';
import { OperatorLogEntry } from '../types';

export type UserIntent = 'DEEP_DIVE' | 'BROAD_EXPLORATION' | 'SPECIFIC_NEED' | 'UNCLEAR';

export interface SemanticState {
  readonly intent: UserIntent;
  readonly drift: number; // 0.0 - 1.0 (1.0 = 完全に漂流)
  readonly detectedKeywords: string[];
}

/**
 * 意図分類結果
 */
interface ClassifyIntentResult {
  intent: UserIntent;
  driftScore: number;
}

/**
 * IntentAnalyzer
 * ユーザー入力と履歴から意図を分類する統合モジュール
 */
export class IntentAnalyzer {
  
  /**
   * 意図を解析する
   */
  static async analyze(input: string, history: OperatorLogEntry[]): Promise<SemanticState> {
    
    // AI Serviceを使用して意図とドリフトを解析
    const historySummary = history.map(h => `${h.operatorId}:${h.attemptType}`).join(', ');
    const aiResult = await IntentAnalyzer.classifyIntent(input, historySummary);
    
    // キーワード推定
    let keywords: string[] = [];
    if (aiResult.intent === 'DEEP_DIVE') keywords = ['deep', 'mechanism'];
    if (aiResult.intent === 'BROAD_EXPLORATION') keywords = ['broad', 'howto'];

    return {
      intent: aiResult.intent,
      drift: aiResult.driftScore,
      detectedKeywords: keywords
    };
  }

  /**
   * ユーザーの意図を分類
   * (Semantic Bridge用)
   * ※厳格にLLMを用いて推論を行う
   */
  static async classifyIntent(text: string, historySummary: string): Promise<ClassifyIntentResult> {
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
      return await llmClient.chatCompletionJson<ClassifyIntentResult>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        0.1 // Deterministic behavior
      );
    } catch (error) {
      console.error('Intent classification failed:', error);
      throw new Error(`Intent分類失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 互換性のためのエイリアス
export const IntentClassifier = IntentAnalyzer;
