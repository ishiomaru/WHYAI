'use client';

/**
 * ============================================
 * ChatPanel.tsx - チャットUI
 * ============================================
 * 
 * 概要:
 * 右パネルのチャットインターフェース
 * 
 * 機能:
 * - チャット履歴 (セッション選択)
 * - メッセージ履歴表示
 * - 入力フォーム
 * - 展開/折りたたみ
 * 
 * 【設計原則】
 * - ソート/フィルタUIは表示しない (LLMが暗黙的に解析)
 * - 会話コンテキストからの意図抽出は内部処理
 * 
 * 【将来の拡張予定】
 * - チャット履歴のローカルストレージ保存
 * - セッション切り替え機能
 * - メッセージ検索
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/structure-generation-types';

// ============================================
// 型定義
// ============================================

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isCollapsed: boolean;
  onSubmit: (message: string) => void;
  onToggleCollapse?: () => void;
}

/** 
 * チャット履歴エントリ
 * 【将来の拡張】ローカルストレージ/API連携予定
 */
interface ChatHistoryEntry {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
}

// ============================================
// メインコンポーネント
// ============================================

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  isCollapsed,
  onSubmit,
  onToggleCollapse
}) => {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 【将来の拡張】チャット履歴 (現在は仮実装)
  const [chatHistory] = useState<ChatHistoryEntry[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input);
    setInput('');
  };

  // ============================================
  // 折りたたみ状態
  // ============================================
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 bg-slate-50">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded transition-colors"
          title="チャットを展開"
        >
          ◀
        </button>
        <div 
          className="mt-4 text-xs text-slate-400 font-medium"
          style={{ writingMode: 'vertical-rl' }}
        >
          チャット
        </div>
      </div>
    );
  }

  // ============================================
  // メイン表示
  // ============================================
  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            チャット
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`
              text-xs px-2 py-0.5 rounded transition-colors
              ${showHistory 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}
            `}
            title="チャット履歴"
          >
            履歴
          </button>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            title="チャットを折りたたむ"
          >
            ▶
          </button>
        )}
      </div>

      {/* 【将来の拡張】チャット履歴パネル */}
      {showHistory && (
        <div className="border-b border-slate-200 bg-slate-50 p-2 max-h-32 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">
              履歴なし (将来実装予定)
            </p>
          ) : (
            <div className="space-y-1">
              {chatHistory.map(entry => (
                <button
                  key={entry.id}
                  className="w-full text-left text-xs p-2 rounded hover:bg-slate-100 transition-colors"
                >
                  <div className="font-medium text-slate-700 truncate">
                    {entry.title}
                  </div>
                  <div className="text-slate-400">
                    {entry.messageCount}件
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* メッセージ履歴 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            <p>メッセージなし</p>
            <p className="text-xs mt-2">学習意図を入力してください</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        
        {isLoading && (
          <div className="bg-slate-100 p-3 rounded-lg mr-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoadingSpinner />
              <span>生成中...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="学習意図を入力..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-slate-100"
          />
          {/* 送信ボタン (アイコン化) */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="送信"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================
// サブコンポーネント
// ============================================

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div
      className={`
        p-3 rounded-lg text-sm
        ${isUser 
          ? 'bg-blue-50 text-blue-900 ml-4' 
          : 'bg-slate-100 text-slate-700 mr-4'}
      `}
    >
      <div className="text-xs text-slate-400 mb-1">
        {isUser ? 'あなた' : 'システム'}
      </div>
      <div className="whitespace-pre-wrap">{message.content}</div>
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full" />
);
