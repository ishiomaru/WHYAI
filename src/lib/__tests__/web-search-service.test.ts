// ============================================
// Web Search Service Tests
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeWebSearch,
  checkSearchServiceHealth
} from '../web-search-service';
import type { SearchQuery } from '../structure-generation-types';

// ============================================
// Mock fetch
// ============================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================
// Tests
// ============================================

describe('executeWebSearch', () => {
  it('SearchQueryからWeb検索を実行できること', async () => {
    // Mock DuckDuckGo response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        AbstractText: 'Python is a programming language.',
        AbstractURL: 'https://example.com/python',
        AbstractSource: 'Example'
      })
    });
    
    const query: SearchQuery = {
      tokens: ['Python', '入門'],
      breadth: 3
    };
    
    const resources = await executeWebSearch(query);
    
    expect(resources.length).toBeGreaterThan(0);
    expect(resources[0].rawChunks).toBeDefined();
    expect(resources[0].uiVisibility).toBe(false);
  });

  it('emptyの検索結果でもエラーが発生しないこと', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });
    
    const query: SearchQuery = {
      tokens: ['unknown_query_xyz'],
      breadth: 1
    };
    
    const resources = await executeWebSearch(query);
    
    expect(resources).toBeInstanceOf(Array);
  });

  it('ネットワークエラー時に空配列を返すこと', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    const query: SearchQuery = {
      tokens: ['test'],
      breadth: 1
    };
    
    const resources = await executeWebSearch(query);
    
    expect(resources).toEqual([]);
  });

  it('breadthで結果数が制限されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        AbstractText: 'Result 1',
        AbstractURL: 'https://example.com/1',
        RelatedTopics: [
          { Text: 'Result 2', FirstURL: 'https://example.com/2' },
          { Text: 'Result 3', FirstURL: 'https://example.com/3' },
          { Text: 'Result 4', FirstURL: 'https://example.com/4' }
        ]
      })
    });
    
    const query: SearchQuery = {
      tokens: ['test'],
      breadth: 2
    };
    
    const resources = await executeWebSearch(query);
    
    expect(resources.length).toBeLessThanOrEqual(2);
  });
});

describe('checkSearchServiceHealth', () => {
  it('正常時にtrueを返すこと', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });
    
    const isHealthy = await checkSearchServiceHealth();
    
    expect(isHealthy).toBe(true);
  });

  it('エラー時にfalseを返すこと', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    const isHealthy = await checkSearchServiceHealth();
    
    expect(isHealthy).toBe(false);
  });
});
