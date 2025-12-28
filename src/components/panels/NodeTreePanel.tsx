'use client';

/**
 * ============================================
 * NodeTreePanel.tsx - ノード構成ツリー
 * ============================================
 * 
 * 概要:
 * 左パネルに表示するフォルダ/ツリー構造のノード一覧
 * 
 * 機能:
 * - ツリー構造での思考構造表示
 * - 展開/折りたたみ
 * - ノード選択 → 中央パネル連動
 * 
 * アイコン:
 * - 目的: 🎯
 * - 選択肢: 📋
 * - リソース: 🔗
 * - 思考: 💭
 */

import React, { useCallback } from 'react';
import type { NodeTreeItem, NodeTreeType } from '@/lib/structure-generation-types';

// ============================================
// 型定義
// ============================================

interface NodeTreePanelProps {
  /** ノード一覧 */
  nodes: readonly NodeTreeItem[];
  /** 選択中のノードID */
  selectedNodeId: string | null;
  /** ノード選択ハンドラ */
  onNodeSelect: (nodeId: string) => void;
}

/** ノードタイプごとのアイコン */
const NODE_ICONS: Record<NodeTreeType, string> = {
  purpose: '🎯',   // 目的
  option: '📋',    // 選択肢
  resource: '🔗',  // リソース
  thought: '💭'    // 思考
};

// ============================================
// メインコンポーネント
// ============================================

export const NodeTreePanel: React.FC<NodeTreePanelProps> = ({
  nodes,
  selectedNodeId,
  onNodeSelect
}) => {
  // ============================================
  // State
  // ============================================
  const [localNodes, setLocalNodes] = React.useState(nodes);

  // 外部からのノード更新を反映
  React.useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  // ============================================
  // ハンドラ
  // ============================================
  
  /** ノードの展開/折りたたみをトグル */
  const handleToggle = useCallback((nodeId: string) => {
    const toggleNode = (items: readonly NodeTreeItem[]): NodeTreeItem[] => {
      return items.map(item => {
        if (item.id === nodeId) {
          return { ...item, collapsed: !item.collapsed };
        }
        if (item.children.length > 0) {
          return { ...item, children: toggleNode(item.children) };
        }
        return { ...item };
      });
    };
    setLocalNodes(prev => toggleNode(prev));
  }, []);

  // ============================================
  // レンダリング
  // ============================================
  return (
    <div className="h-full flex flex-col">
      {/* ============================================ */}
      {/* ヘッダー */}
      {/* ============================================ */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          ノード構成
        </h2>
        {localNodes.length > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">
            {localNodes.length}件
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* ツリー */}
      {/* ============================================ */}
      <div className="flex-1 overflow-y-auto py-2">
        {localNodes.length === 0 ? (
          <div className="px-3 py-8 text-center text-slate-400 text-sm">
            <p>ノードなし</p>
            <p className="text-xs mt-1 text-slate-300">
              チャットで入力すると表示されます
            </p>
          </div>
        ) : (
          localNodes.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              selectedId={selectedNodeId}
              onSelect={onNodeSelect}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================
// サブコンポーネント: ツリーノード (再帰)
// ============================================

interface TreeNodeProps {
  node: NodeTreeItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  selectedId, 
  onSelect, 
  onToggle 
}) => {
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div className="select-none">
      {/* ノード行 */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm
          transition-colors duration-150
          ${isSelected 
            ? 'bg-blue-100 text-blue-800' 
            : 'hover:bg-slate-100 text-slate-700'}
        `}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* 展開/折りたたみボタン */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {node.collapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        {/* アイコン */}
        <span className="text-base" title={node.type}>
          {NODE_ICONS[node.type]}
        </span>
        
        {/* ラベル */}
        <span className="truncate flex-1">{node.label}</span>
      </div>

      {/* 子ノード (再帰) */}
      {!node.collapsed && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
