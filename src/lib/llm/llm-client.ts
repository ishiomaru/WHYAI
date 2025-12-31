// ============================================
// LLM Client
// OpenAI互換LLMクライアント (Local LLM / Cloud API両対応)
// ============================================

import OpenAI from 'openai';

// ===================================
// AI Backend Configuration (Local LLM)
// ===================================
// ユーザー要件: "API-keyなしで使える" (一般的なOpenAI互換のローカルエンドポイント Ollama/Llama.cpp などを使用)
// 指定がない場合はlocalhost:11434 (Ollama)をデフォルトとする
const BASE_URL = process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';
const MODEL_NAME = process.env.LOCAL_LLM_MODEL || 'llama3';
const API_KEY = process.env.LOCAL_LLM_API_KEY || 'ollama';

/**
 * LLMクライアント
 * 
 * 厳格な「Space Manager」ペルソナを持つAIサービス。
 * 特定の商用クラウドAPIキーに依存せず、Local LLMのエンドポイントを利用して機能する。
 */
export class LLMClient {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: BASE_URL,
      apiKey: API_KEY,
      dangerouslyAllowBrowser: false // Next.jsのみサーバーサイド
    });
    console.log(`LLM Client Initialized: Connected to ${BASE_URL} (Model: ${MODEL_NAME})`);
  }

  /**
   * OpenAIインスタンスを取得
   */
  get client(): OpenAI {
    return this.openai;
  }

  /**
   * モデル名を取得
   */
  get model(): string {
    return MODEL_NAME;
  }

  /**
   * テキストのEmbeddingを取得
   * (Semantic Drift分析用)
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: MODEL_NAME,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw new Error(`Embedding生成失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chat Completionを実行
   */
  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      responseFormat?: { type: 'json_object' | 'text' };
    } = {}
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: MODEL_NAME,
      messages,
      temperature: options.temperature ?? 0.7,
      response_format: options.responseFormat,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }
    return content;
  }

  /**
   * JSON形式でChat Completionを実行
   */
  async chatCompletionJson<T>(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature: number = 0.5
  ): Promise<T> {
    const content = await this.chatCompletion(messages, {
      temperature,
      responseFormat: { type: 'json_object' },
    });
    return JSON.parse(content) as T;
  }
}

// シングルトンインスタンス
export const llmClient = new LLMClient();
