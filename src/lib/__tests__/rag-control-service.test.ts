// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSearchQuery,
  chunkWithoutMeaning,
  CollectionGateController,
  createExternalResource,
  InvalidTransitionError
} from '../external';

// ============================================
// 1. SearchQuery Generation Tests
// ============================================

describe('generateSearchQuery', () => {
  it('TC-1: 重要度フィールドが存在しないこと', () => {
    // 前提条件: purposeAlpha="Python学習"
    const query = generateSearchQuery('Python学習');
    
    // 期待結果: tokensとbreadthのみ含む、priority/importanceなし
    expect(query).toHaveProperty('tokens');
    expect(query).toHaveProperty('breadth');
    expect(query).not.toHaveProperty('priority');
    expect(query).not.toHaveProperty('importance');
    expect(query).not.toHaveProperty('recommended');
  });

  it('トークンが正しく抽出されること', () => {
    const query = generateSearchQuery('Python 機械学習 入門');
    
    expect(query.tokens).toContain('Python');
    expect(query.tokens).toContain('機械学習');
    expect(query.tokens).toContain('入門');
  });

  it('breadthがトークン数に基づいて決定されること', () => {
    // トークン少 → breadth高（広く検索）
    const queryFew = generateSearchQuery('Python');
    expect(queryFew.breadth).toBeGreaterThanOrEqual(4);
    
    // トークン多 → breadth低（狭く検索）
    const queryMany = generateSearchQuery('Python 機械学習 入門 初心者 基礎 データ分析 NumPy Pandas');
    expect(queryMany.breadth).toBeLessThanOrEqual(2);
  });

  it('トークンが最大10個に制限されること', () => {
    const manyTokens = 'a b c d e f g h i j k l m n o p q r s t';
    const query = generateSearchQuery(manyTokens);
    
    expect(query.tokens.length).toBeLessThanOrEqual(10);
  });
});

// ============================================
// 2. Non-Semantic Chunking Tests
// ============================================

describe('chunkWithoutMeaning', () => {
  it('固定長で分割されること（意味的分割でない）', () => {
    const html = '<p>' + 'A'.repeat(1500) + '</p>';
    const chunks = chunkWithoutMeaning(html);
    
    // 500文字ごとに分割
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(500);
    expect(chunks[1].length).toBe(500);
    expect(chunks[2].length).toBe(500);
  });

  it('HTMLタグが除去されること', () => {
    const html = '<div><p>Hello</p><script>alert("bad")</script></div>';
    const chunks = chunkWithoutMeaning(html);
    
    expect(chunks[0].text).not.toContain('<');
    expect(chunks[0].text).not.toContain('>');
    expect(chunks[0].text).not.toContain('alert');
  });

  it('チャンクにsummary/keywords/importanceが含まれないこと', () => {
    const html = '<p>Test content</p>';
    const chunks = chunkWithoutMeaning(html);
    
    chunks.forEach(chunk => {
      expect(chunk).toHaveProperty('text');
      expect(chunk).toHaveProperty('length');
      expect(chunk).toHaveProperty('position');
      expect(chunk).not.toHaveProperty('summary');
      expect(chunk).not.toHaveProperty('keywords');
      expect(chunk).not.toHaveProperty('importance');
    });
  });
});

// ============================================
// 3. Collection Gate Controller Tests
// ============================================

describe('CollectionGateController', () => {
  let gate: CollectionGateController;

  beforeEach(() => {
    gate = new CollectionGateController();
  });

  it('TC-2: 操作子適用中は収集禁止', () => {
    // 初期状態では収集可能
    expect(gate.canCollect()).toBe(true);
    
    // ロック取得後は収集禁止
    gate.acquireLock();
    gate.transitionTo('OPERATOR_APPLYING');
    expect(gate.canCollect()).toBe(false);
  });

  it('FREE_INPUT_RECEIVED状態で収集可能', () => {
    expect(gate.currentPhase).toBe('FREE_INPUT_RECEIVED');
    expect(gate.canCollect()).toBe(true);
  });

  it('STRUCTURE_REORGANIZING状態で収集禁止', () => {
    gate.acquireLock();
    gate.transitionTo('OPERATOR_APPLYING');
    gate.transitionTo('STRUCTURE_REORGANIZING');
    
    expect(gate.canCollect()).toBe(false);
  });

  it('PRE_OPTION_GENERATION状態で収集可能', () => {
    gate.acquireLock();
    gate.transitionTo('OPERATOR_APPLYING');
    gate.transitionTo('STRUCTURE_REORGANIZING');
    gate.releaseLock();
    gate.transitionTo('PRE_OPTION_GENERATION');
    
    expect(gate.canCollect()).toBe(true);
  });

  it('不正なフェーズ遷移でエラー', () => {
    expect(() => {
      gate.transitionTo('STRUCTURE_REORGANIZING');
    }).toThrow(InvalidTransitionError);
  });

  it('withOperatorLockが正しく動作すること', async () => {
    let insidePhase: string | undefined;
    
    await gate.withOperatorLock(async () => {
      insidePhase = gate.currentPhase;
    });
    
    expect(insidePhase).toBe('OPERATOR_APPLYING');
    expect(gate.currentPhase).toBe('STRUCTURE_REORGANIZING');
  });
});

// ============================================
// 4. External Resource Creation Tests
// ============================================

describe('createExternalResource', () => {
  it('uiVisibilityが常にfalseであること', () => {
    const resource = createExternalResource('<p>Test</p>', 'https://example.com');
    
    expect(resource.uiVisibility).toBe(false);
  });

  it('sourceTraceが正しく設定されること', () => {
    const url = 'https://example.com/test';
    const resource = createExternalResource('<p>Test</p>', url, 200);
    
    expect(resource.sourceTrace.url).toBe(url);
    expect(resource.sourceTrace.httpStatus).toBe(200);
    expect(resource.sourceTrace.collectedAt).toBeDefined();
  });

  it('resourceに禁止プロパティが含まれないこと', () => {
    const resource = createExternalResource('<p>Test</p>', 'https://example.com');
    
    expect(resource).not.toHaveProperty('summary');
    expect(resource).not.toHaveProperty('importance');
    expect(resource).not.toHaveProperty('relevance');
  });
});
