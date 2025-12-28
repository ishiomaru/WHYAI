'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import '@/styles/note-style.css'; // グローバルCSSとして読み込む (Next.jsの構成によってはlayout.tsxで読み込むべきだが、ここでは簡易的にimport)

interface ArticleProjectorProps {
  title?: string;
  sourceUrl?: string;
  content: string; // Markdown Content
  isLoading?: boolean;
}

/**
 * ArticleProjector
 * 
 * 外部ソースから取得したMarkdownコンテンツを
 * 「note風」の統一された美しいスタイルで投影（レンダリング）するコンポーネント。
 */
export const ArticleProjector: React.FC<ArticleProjectorProps> = ({
  title = 'No Title',
  sourceUrl,
  content,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="note-article-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-12"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // ドメイン表示用の簡易抽出
  const domain = sourceUrl ? new URL(sourceUrl).hostname : 'External Source';

  return (
    <div className="note-article-container">
      {/* Header Area */}
      <header className="note-article-header">
        <h1 className="note-article-title">{title}</h1>
        <div className="note-article-meta">
          <span className="source-domain">{domain}</span>
          {sourceUrl && (
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
            >
              元記事を開く ↗
            </a>
          )}
        </div>
      </header>
      
      {/* Body Area (Markdown Projection) */}
      <article className="note-body">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </article>

      {/* Footer / Disclaimer */}
      <footer className="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-500 text-center">
        <p>Projected by Adaptive System</p>
      </footer>
    </div>
  );
};
