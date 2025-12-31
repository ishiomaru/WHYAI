// ============================================
// Web Search Service
// DuckDuckGo + Jina Reader (Universal Projection)
// ============================================

import type { SearchQuery, ExternalResource } from '../structure-generation-types';
import { createExternalResource } from './rag-control-service';

// ============================================
// Types
// ============================================

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ============================================
// Configuration
// ============================================

const JINA_READER_PREFIX = 'https://r.jina.ai/';
const SEARCH_CONFIG = {
  baseUrl: 'https://api.duckduckgo.com/',
  timeout: 10000,
  maxResults: 5
};

// ============================================
// Main Export Functions
// ============================================

/**
 * Executes a web search and projects the results as ExternalResources.
 * Uses DuckDuckGo for discovery and Jina Reader for content extraction.
 */
export async function executeWebSearch(
  query: SearchQuery
): Promise<ExternalResource[]> {
  // 1. Discovery phase (DuckDuckGo)
  const results = await searchDuckDuckGo(query);
  if (results.length === 0) return [];

  // 2. Fetch phase (Jina Reader)
  // Process top N results in parallel
  const topResults = results.slice(0, 3);
  const resources: ExternalResource[] = [];

  const fetchPromises = topResults.map(async (result) => {
    try {
      const markdown = await fetchReadableContent(result.url);
      
      // Basic validation: ignore extremely short content
      if (markdown.length < 50) return null;

      // 3. Projection phase
      // Convert markdown to ExternalResource
      return createExternalResource(markdown, result.url, 200);
    } catch (e) {
      console.warn(`Failed to fetch/read content for ${result.url}:`, e);
      return null;
    }
  });

  const settled = await Promise.allSettled(fetchPromises);
  
  settled.forEach(outcome => {
    if (outcome.status === 'fulfilled' && outcome.value) {
      resources.push(outcome.value);
    }
  });

  return resources;
}

/**
 * Fetches content from a URL and converts it to a clean markdown format specifically for projection.
 */
export async function fetchAndCreateResource(url: string): Promise<ExternalResource | null> {
  try {
    const markdown = await fetchReadableContent(url);
    if (!markdown || markdown.length < 50) return null;
    return createExternalResource(markdown, url, 200);
  } catch (error) {
    console.error(`Failed to fetch and create resource from ${url}:`, error);
    return null;
  }
}

/**
 * Checks if the search service is operational.
 */
export async function checkSearchServiceHealth(): Promise<boolean> {
  try {
    const results = await searchDuckDuckGo({ tokens: ['test'], breadth: 1 });
    // It's healthy if the function executes without throwing, even if results are empty
    return Array.isArray(results); 
  } catch {
    return false;
  }
}

// ============================================
// Internal Implementation Functions
// ============================================

/**
 * Fetches readable content (Markdown) from a URL using Jina Reader.
 */
async function fetchReadableContent(targetUrl: string): Promise<string> {
  const url = `${JINA_READER_PREFIX}${targetUrl}`;
  
  const response = await fetch(url, {
    signal: AbortSignal.timeout(SEARCH_CONFIG.timeout)
  });
  
  if (!response.ok) {
    throw new Error(`Jina Reader fetch failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

/**
 * Searches DuckDuckGo for a query.
 * 
 * 【設計原則】
 * - モック/フォールバック禁止
 * - 結果がない場合は空配列を返す
 * - APIエラー時はエラーを投げる
 */
async function searchDuckDuckGo(query: SearchQuery): Promise<SearchResult[]> {
  const q = query.tokens.join('+');
  const url = `${SEARCH_CONFIG.baseUrl}?q=${q}&format=json&no_html=1&skip_disambig=1`;
  
  const response = await fetch(url, {
    signal: AbortSignal.timeout(SEARCH_CONFIG.timeout)
  });
  
  if (!response.ok) {
    throw new Error(`DuckDuckGo検索失敗: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const results: SearchResult[] = [];

  // Extract from RelatedTopics (DuckDuckGo Instant Answer API structure)
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics) {
      if (topic.FirstURL && topic.Text) {
        results.push({
          title: topic.Text.split(' - ')[0] || 'Result',
          url: topic.FirstURL,
          snippet: topic.Text
        });
      }
    }
  }
  
  return results.slice(0, SEARCH_CONFIG.maxResults);
}
