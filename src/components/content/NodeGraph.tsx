'use client';

/**
 * ============================================
 * NodeGraph.tsx - 2Dノードグラフ
 * ============================================
 * 
 * 概要:
 * 2D空間上にノードを配置し、関係性を線で表現するグラフ
 * 
 * 機能:
 * - ノードを2D空間に配置
 * - 関係性を持つノード同士を線で接続
 * - 線の色は関係性タイプで区別
 * - ホバー時に詳細表示（ツールチップ）
 * - ノードサイズはLLM解析による規模を反映
 * - ズーム機能（ホイールで拡大/縮小）
 * - パン機能（背景ドラッグで移動）
 * - ノードクリックでドキュメントタブに遷移
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ProjectionMap, ProjectedDocument } from '@/lib/structure-generation-types';

// ============================================
// 型定義
// ============================================

interface NodeGraphProps {
  projectionMap: ProjectionMap;
  selectedNodeId: string | null;
  /** ノードクリック時のコールバック（ドキュメントタブに遷移するため） */
  onNodeClick?: (nodeId: string) => void;
}

/** ノードの2D位置 */
interface NodePosition {
  id: string;
  x: number;
  y: number;
  size: number;
}

/** 関係性の線 */
interface Edge {
  source: string;
  target: string;
  type: 'related' | 'contradicts' | 'depends';
  label?: string;
}

// ============================================
// 定数
// ============================================

const NODE_BASE_SIZE = 40;
const GRAPH_PADDING = 60;

/** ズーム設定 */
const ZOOM_CONFIG = {
  MIN: 0.5,
  MAX: 2.0,
  STEP: 0.1,
  DEFAULT: 1.0
} as const;

/** 関係性タイプごとの色 */
const EDGE_COLORS: Record<Edge['type'], string> = {
  related: '#3b82f6',     // 青: 関連
  contradicts: '#ef4444', // 赤: 矛盾
  depends: '#22c55e'      // 緑: 依存
};

// ============================================
// メインコンポーネント
// ============================================

export const NodeGraph: React.FC<NodeGraphProps> = ({
  projectionMap,
  selectedNodeId,
  onNodeClick
}) => {
  // ============================================
  // State
  // ============================================
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // ズーム状態 (50%-200%)
  const [zoom, setZoom] = useState<number>(ZOOM_CONFIG.DEFAULT);
  
  // パン（背景ドラッグ）状態
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // ============================================
  // ズーム・パン操作
  // ============================================
  
  /** ホイールでズーム（カーソル位置を中心に） */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setZoom(prevZoom => {
      const delta = e.deltaY > 0 ? -ZOOM_CONFIG.STEP : ZOOM_CONFIG.STEP;
      const newZoom = Math.max(ZOOM_CONFIG.MIN, Math.min(ZOOM_CONFIG.MAX, prevZoom + delta));
      
      // カーソル位置を中心にズームするためのパン補正
      const zoomRatio = newZoom / prevZoom;
      setPan(prevPan => ({
        x: mouseX - (mouseX - prevPan.x) * zoomRatio,
        y: mouseY - (mouseY - prevPan.y) * zoomRatio
      }));
      
      return newZoom;
    });
  }, []);

  /** ドラッグ開始 */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // ノードクリックではなく背景クリックの場合のみ
    if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'g') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  /** ドラッグ中 */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  /** ドラッグ終了 */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /** ズームイン */
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(ZOOM_CONFIG.MAX, prev + ZOOM_CONFIG.STEP));
  }, []);

  /** ズームアウト */
  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(ZOOM_CONFIG.MIN, prev - ZOOM_CONFIG.STEP));
  }, []);

  /** ズームリセット（パンもリセット） */
  const zoomReset = useCallback(() => {
    setZoom(ZOOM_CONFIG.DEFAULT);
    setPan({ x: 0, y: 0 });
  }, []);

  // ============================================
  // ノード位置計算 (円形配置)
  // ============================================
  const nodePositions: NodePosition[] = useMemo(() => {
    const nodes = projectionMap.nodes;
    const count = nodes.length;
    if (count === 0) return [];

    const centerX = 200;
    const centerY = 150;
    const radius = Math.min(150, 50 + count * 15);

    return nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const sizeMultiplier = node.reliability === 'high' ? 1.5 : 
                            node.reliability === 'medium' ? 1.2 : 1.0;
      
      return {
        id: node.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        size: NODE_BASE_SIZE * sizeMultiplier
      };
    });
  }, [projectionMap.nodes]);

  // ============================================
  // エッジ生成
  // ============================================
  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    
    projectionMap.contradictions.forEach(c => {
      result.push({
        source: c.source,
        target: c.target,
        type: 'contradicts',
        label: c.reason
      });
    });
    
    const nodes = projectionMap.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      result.push({
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'related'
      });
    }
    
    return result;
  }, [projectionMap]);

  // ============================================
  // ツールチップ用
  // ============================================
  
  /** 文字列を指定長で省略 */
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
  const getProjectedDoc = (nodeId: string): ProjectedDocument | null => {
    const node = projectionMap.nodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    // ノードの詳細情報を生成（LLMからの情報があればそれを使用）
    const detail = `このノードは「${node.label}」を表しています。信頼度は${node.reliability}です。`;
    
    return {
      nodeId: node.id,
      projectedInfo: node.label,
      sourceContext: truncateText(detail, 50)  // 50文字で省略
    };
  };

  const handleNodeHover = (nodeId: string | null, e?: React.MouseEvent) => {
    setHoveredNodeId(nodeId);
    if (e && nodeId) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleEdgeHover = (edge: Edge | null, e?: React.MouseEvent) => {
    setHoveredEdge(edge);
    if (e && edge) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // ============================================
  // 空状態
  // ============================================
  if (projectionMap.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🕸️</div>
          <p className="text-sm">ノードグラフなし</p>
          <p className="text-xs mt-1 text-slate-300">
            チャットで入力すると表示されます
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // レンダリング
  // ============================================
  return (
    <div className="relative h-full min-h-96">
      {/* ズームコントロール */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/90 rounded-lg shadow p-1">
        <button
          onClick={zoomOut}
          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="ズームアウト"
          disabled={zoom <= ZOOM_CONFIG.MIN}
        >
          −
        </button>
        <button
          onClick={zoomReset}
          className="px-2 h-7 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors"
          title="リセット"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="ズームイン"
          disabled={zoom >= ZOOM_CONFIG.MAX}
        >
          +
        </button>
      </div>

      {/* SVGグラフ (ズーム・パン対応) */}
      <svg 
        ref={svgRef}
        className={`w-full h-full min-h-80 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        viewBox={`0 0 400 300`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* エッジ */}
          {edges.map((edge, i) => {
            const source = nodePositions.find(n => n.id === edge.source);
            const target = nodePositions.find(n => n.id === edge.target);
            if (!source || !target) return null;

            return (
              <line
                key={`edge-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={EDGE_COLORS[edge.type]}
                strokeWidth={edge === hoveredEdge ? 3 : 2}
                strokeOpacity={edge === hoveredEdge ? 1 : 0.6}
                strokeDasharray={edge.type === 'contradicts' ? '5,5' : 'none'}
                className="cursor-pointer transition-all"
                onMouseEnter={(e) => handleEdgeHover(edge, e)}
                onMouseLeave={() => handleEdgeHover(null)}
              />
            );
          })}

          {/* ノード */}
          {nodePositions.map((pos) => {
            const node = projectionMap.nodes.find(n => n.id === pos.id);
            if (!node) return null;
            
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNodeId;

            return (
              <g key={node.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.size / 2}
                  fill={isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#e2e8f0'}
                  stroke={isSelected ? '#1d4ed8' : '#94a3b8'}
                  strokeWidth={isSelected || isHovered ? 3 : 2}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleNodeHover(node.id, e)}
                  onMouseLeave={() => handleNodeHover(null)}
                  onClick={() => onNodeClick?.(node.id)}
                />
                
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill={isSelected ? 'white' : '#475569'}
                  className="pointer-events-none select-none"
                >
                  {node.label.slice(0, 6)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 凡例 */}
      <div className="absolute bottom-2 left-2 bg-white/90 rounded p-2 text-xs">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span className="text-slate-600">関連</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-4 h-0.5 bg-red-500 border-dashed" />
          <span className="text-slate-600">矛盾</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-green-500" />
          <span className="text-slate-600">依存</span>
        </div>
      </div>

      {/* ノードツールチップ */}
      {hoveredNodeId && (
        <div
          className="fixed z-50 bg-slate-800 text-white text-sm p-3 rounded-lg shadow-lg max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10
          }}
        >
          {(() => {
            const doc = getProjectedDoc(hoveredNodeId);
            if (!doc) return null;
            return (
              <>
                <div className="font-bold mb-1">{doc.projectedInfo}</div>
                <div className="text-slate-300 text-xs mb-2">{doc.sourceContext}</div>
                <div className="text-blue-300 text-xs italic">クリックで詳細を表示</div>
              </>
            );
          })()}
        </div>
      )}

      {/* エッジツールチップ */}
      {hoveredEdge && hoveredEdge.label && (
        <div
          className="fixed z-50 bg-slate-700 text-white text-xs p-2 rounded shadow-lg"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10
          }}
        >
          {hoveredEdge.label}
        </div>
      )}
    </div>
  );
};
