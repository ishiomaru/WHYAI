'use client';

/**
 * ============================================
 * ProjectedDocView.tsx - 生成ドキュメント表示
 * ============================================
 * 
 * 概要:
 * すべてのノードの生成ドキュメントを一覧表示するコンポーネント
 * 
 * 機能:
 * - タイトルのみの一覧表示
 * - タップでポップアップ表示（詳細内容）
 * - バツボタンでポップアップを閉じる
 * - ポップアップは中央パネル内に表示
 * - selectedDocIdで外部からポップアップを制御可能
 */

import React, { useState, useEffect } from 'react';
import type { SupportPayload, ProjectedDocument } from '@/lib/structure-generation-types';

// ============================================
// 型定義
// ============================================

interface ProjectedDocViewProps {
  /** API応答のペイロード */
  payload: SupportPayload | null;
  /** 外部から指定されたドキュメントID（グラフからクリック時） */
  selectedDocId?: string | null;
  /** ドキュメント選択解除時のコールバック */
  onCloseDoc?: () => void;
}

// ============================================
// メインコンポーネント
// ============================================

export const ProjectedDocView: React.FC<ProjectedDocViewProps> = ({
  payload,
  selectedDocId,
  onCloseDoc
}) => {
  // ローカルでのポップアップ表示状態
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  
  // 外部からのselectedDocIdを反映
  useEffect(() => {
    if (selectedDocId) {
      setOpenDocId(selectedDocId);
    }
  }, [selectedDocId]);

  // ============================================
  // 全ノードの生成ドキュメントを構築
  // ============================================
  const documents: ProjectedDocument[] = React.useMemo(() => {
    if (!payload?.projection_map?.nodes) return [];
    
    return payload.projection_map.nodes.map(node => ({
      nodeId: node.id,
      projectedInfo: node.label,
      description: node.description,
      sourceContext: `信頼度: ${node.reliability}`
    }));
  }, [payload]);

  // 現在開いているドキュメント
  const openDocument = documents.find(d => d.nodeId === openDocId);

  // ポップアップを閉じる
  const handleClose = () => {
    setOpenDocId(null);
    onCloseDoc?.();
  };

  // ============================================
  // 空状態
  // ============================================
  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">生成ドキュメントなし</p>
          <p className="text-xs mt-1 text-slate-300">
            チャットで入力すると情報が投影されます
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // タイトル一覧 + ポップアップ
  // ============================================
  return (
    <div className="relative h-full">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 pb-2 mb-3">
        <h3 className="text-lg font-bold text-slate-800">
          生成ドキュメント
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {documents.length}件のノード情報（タップで詳細表示）
        </p>
      </div>

      {/* タイトル一覧 */}
      <div className="space-y-2">
        {documents.map((doc, index) => (
          <button
            key={doc.nodeId}
            onClick={() => setOpenDocId(doc.nodeId)}
            className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
              openDocId === doc.nodeId 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded text-xs flex items-center justify-center text-slate-500 font-mono">
                {index + 1}
              </span>
              <span className="font-medium text-slate-800 truncate">
                {doc.projectedInfo}
              </span>
              <span className="ml-auto text-slate-400 text-xs">
                {doc.sourceContext}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ポップアップ（中央パネル内） */}
      {openDocument && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30 rounded-lg">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80%] overflow-hidden">
            {/* ポップアップヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h4 className="font-bold text-slate-800">
                {openDocument.projectedInfo}
              </h4>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                title="閉じる"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4L12 12M4 12L12 4" />
                </svg>
              </button>
            </div>
            
            {/* ポップアップ内容 */}
            <div className="p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400">信頼度</span>
                  <p className="text-sm text-slate-600 mt-1">
                    {openDocument.sourceContext}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs text-slate-400">ノード説明</span>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                    {openDocument.description || "このノードに関する詳細な説明はありません。"}
                  </p>
                </div>

                {/* 関連する判断軸 */}
                {payload?.generated_options && (
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <span className="text-xs text-indigo-600">関連する判断軸</span>
                    <p className="text-sm text-indigo-800 mt-1 font-medium">
                      {payload.generated_options.axis_label}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
