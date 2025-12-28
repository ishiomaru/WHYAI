'use client';

/**
 * ============================================
 * MainLayout.tsx - 3パネルレイアウト制御
 * ============================================
 * 
 * 概要:
 * NotebookLM風の1.5:5:3.5レイアウトを管理するメインコンポーネント
 * 
 * パネル構成:
 * - 左パネル (15%): ノード構成ツリー
 * - 中央パネル (50%): コンテンツ表示
 * - 右パネル (35%): チャットUI
 * 
 * 主要機能:
 * - パネルリサイズ (スムーズなドラッグ)
 * - 左右パネルの折りたたみ
 * - API連携 (構造生成)
 * - チャット履歴管理
 * 
 * 【将来の拡張】
 * - レスポンシブ対応 (タブレット/モバイル)
 * - 同時表示モード
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeTreePanel } from '@/components/panels/NodeTreePanel';
import { ContentPanel } from '@/components/panels/ContentPanel';
import { ChatPanel } from '@/components/panels/ChatPanel';
import type { 
  NodeTreeItem, 
  ChatMessage, 
  SupportPayload,
  ContentTabType,
  PanelState,
  OperatorLogEntry
} from '@/lib/structure-generation-types';
import { generateId } from '@/lib/utils';

// ============================================
// 定数定義
// ============================================

/** 初期パネル比率: 1.5:5:3.5 (15%:50%:35%) */
const DEFAULT_PANEL_STATE: PanelState = {
  leftWidth: 15,
  centerWidth: 50,
  rightWidth: 35,
  isLeftCollapsed: false,
  isRightCollapsed: false
};

/** パネル幅の制約 */
const PANEL_CONSTRAINTS = {
  LEFT_MIN: 10,   // 左パネル最小10%
  LEFT_MAX: 25,   // 左パネル最大25%
  RIGHT_MIN: 15,  // 右パネル最小15%
  RIGHT_MAX: 45,  // 右パネル最大45%
  CENTER_MIN: 30  // 中央パネル最小30%
} as const;

// ============================================
// 型定義
// ============================================

interface MainLayoutProps {
  /** 初期ノード構成 */
  initialNodes?: readonly NodeTreeItem[];
}

// ============================================
// メインコンポーネント
// ============================================

export const MainLayout: React.FC<MainLayoutProps> = ({ initialNodes = [] }) => {
  // ============================================
  // State定義
  // ============================================

  // パネル状態
  const [panelState, setPanelState] = useState<PanelState>(DEFAULT_PANEL_STATE);
  
  // ノード構成
  const [nodes, setNodes] = useState<readonly NodeTreeItem[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // チャット状態
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // コンテンツ状態
  const [activeTab, setActiveTab] = useState<ContentTabType>('choices');
  const [payload, setPayload] = useState<SupportPayload | null>(null);

  // 操作ログ状態（状態推定用）
  const [operatorLogs, setOperatorLogs] = useState<OperatorLogEntry[]>([]);

  // リサイズ用ref
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; leftWidth: number; rightWidth: number } | null>(null);

  // レスポンシブ対応 (Mobile/Tablet detection)
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState<'structure' | 'content' | 'chat'>('content');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // スムーズなリサイズ処理
  // ============================================

  /**
   * 左パネルのリサイズ開始
   */
  const handleLeftResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      leftWidth: panelState.leftWidth,
      rightWidth: panelState.rightWidth
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const deltaX = ev.clientX - dragStartRef.current.x;
      const deltaPct = (deltaX / containerWidth) * 100;
      
      const newLeftWidth = Math.max(
        PANEL_CONSTRAINTS.LEFT_MIN,
        Math.min(PANEL_CONSTRAINTS.LEFT_MAX, dragStartRef.current.leftWidth + deltaPct)
      );
      
      const newCenterWidth = 100 - newLeftWidth - panelState.rightWidth;
      
      if (newCenterWidth >= PANEL_CONSTRAINTS.CENTER_MIN) {
        setPanelState(prev => ({
          ...prev,
          leftWidth: newLeftWidth,
          centerWidth: newCenterWidth
        }));
      }
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelState.leftWidth, panelState.rightWidth]);

  /**
   * 右パネルのリサイズ開始
   */
  const handleRightResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      leftWidth: panelState.leftWidth,
      rightWidth: panelState.rightWidth
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const deltaX = dragStartRef.current.x - ev.clientX;
      const deltaPct = (deltaX / containerWidth) * 100;
      
      const newRightWidth = Math.max(
        PANEL_CONSTRAINTS.RIGHT_MIN,
        Math.min(PANEL_CONSTRAINTS.RIGHT_MAX, dragStartRef.current.rightWidth + deltaPct)
      );
      
      const newCenterWidth = 100 - panelState.leftWidth - newRightWidth;
      
      if (newCenterWidth >= PANEL_CONSTRAINTS.CENTER_MIN) {
        setPanelState(prev => ({
          ...prev,
          rightWidth: newRightWidth,
          centerWidth: newCenterWidth
        }));
      }
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelState.leftWidth, panelState.rightWidth]);

  // ============================================
  // パネル折りたたみ
  // ============================================

  /** 左パネル (ノード構成) のトグル */
  const toggleLeftPanel = useCallback(() => {
    setPanelState(prev => {
      if (prev.isLeftCollapsed) {
        // 展開: 元の幅に戻す
        return {
          ...prev,
          isLeftCollapsed: false,
          leftWidth: 15,
          centerWidth: 100 - 15 - prev.rightWidth
        };
      } else {
        // 折りたたみ: 左パネル幅を中央に移す
        return {
          ...prev,
          isLeftCollapsed: true,
          centerWidth: prev.centerWidth + prev.leftWidth
        };
      }
    });
  }, []);

  /** 右パネル (チャット) のトグル */
  const toggleRightPanel = useCallback(() => {
    setPanelState(prev => {
      if (prev.isRightCollapsed) {
        // 展開
        return {
          ...prev,
          isRightCollapsed: false,
          rightWidth: 35,
          centerWidth: 100 - prev.leftWidth - 35
        };
      } else {
        // 折りたたみ
        return {
          ...prev,
          isRightCollapsed: true,
          centerWidth: prev.centerWidth + prev.rightWidth
        };
      }
    });
  }, []);

  // ============================================
  // ノード操作
  // ============================================

  /**
   * ログエントリを追加
   * 状態推定器に渡すための操作ログを蓄積
   */
  const addOperatorLog = useCallback((
    operatorId: 'O0' | 'O1' | 'O2' | 'O3' | 'O4' | 'O5',
    attemptType: 'REORDER_ATTEMPT' | 'EXCLUDE_ATTEMPT' | 'GROUP_ATTEMPT' | 'TIMELINE_ATTEMPT',
    targetNodeIds: string[] = []
  ) => {
    const entry: OperatorLogEntry = {
      id: generateId(),
      operatorId,
      attemptType,
      targetNodeIds,
      timestamp: Date.now(),
      structuralDelta: {
        nodeDelta: 0,
        depthDelta: 0,
        choiceDelta: 0,
        relationDelta: 0,
        focusDelta: 0
      }
    };
    setOperatorLogs(prev => [...prev.slice(-9), entry]); // 最新10件を保持
  }, []);

  /** ノード選択時の処理 */
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab('node_graph');
    // 選択操作をログ記録
    addOperatorLog('O0', 'EXCLUDE_ATTEMPT', [nodeId]);
  }, [addOperatorLog]);

  // ============================================
  // チャット・API連携
  // ============================================

  const handleChatSubmit = useCallback(async (message: string, submissionValue?: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/structure-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purposeAlpha: submissionValue || message, // Use clean value if provided, else message
          operatorLogs: operatorLogs,
          currentNodes: nodes
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.structure?.support) {
        setPayload(data.structure.support);
        
        if (data.structure.support.projection_map?.nodes) {
          const newNodes: NodeTreeItem[] = data.structure.support.projection_map.nodes.map(
            (n: any) => ({
              id: n.id,
              label: n.label,
              type: 'option' as const,
              children: [],
              collapsed: false,
              depth: 0
            })
          );
          setNodes(newNodes);
        }

        const question = data.structure.support.generated_options?.axis_label 
          || data.structure.support.diagnostic_question 
          || `構造を投影しました。\n状態: ${data.structure.support.target_lost_state}`;

        const systemMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'system',
          content: question,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, systemMessage]);
        setActiveTab('choices');
      } else {
        throw new Error('構造データが取得できませんでした');
      }
      
    } catch (err: any) {
      console.error('API Error:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'system',
        content: `エラー: ${err.message || 'リクエストに失敗しました'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // モバイルレイアウト
  // ============================================
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
        <div className="flex-1 overflow-hidden relative">
          {activeMobileView === 'structure' && (
            <div className="h-full bg-slate-50 overflow-auto">
              <NodeTreePanel nodes={nodes} selectedNodeId={selectedNodeId} onNodeSelect={handleNodeSelect} />
            </div>
          )}
          {activeMobileView === 'content' && (
            <div className="h-full bg-white overflow-hidden">
              <ContentPanel
                activeTab={activeTab}
                onTabChange={setActiveTab}
                payload={payload}
                selectedNodeId={selectedNodeId}
                isLoading={isLoading}
                lostState={payload?.target_lost_state === 'DIAGNOSTIC' ? undefined : payload?.target_lost_state}
                onChoiceSelect={(choice) => {
                  addOperatorLog('O0', 'GROUP_ATTEMPT', []);
                  handleChatSubmit(`【選択】${choice.label}`, choice.label);
                  setActiveMobileView('chat');
                }}
              />
            </div>
          )}
          {activeMobileView === 'chat' && (
            <div className="h-full bg-white overflow-hidden">
               <ChatPanel
                 messages={messages}
                 isLoading={isLoading}
                 isCollapsed={false}
                 onSubmit={handleChatSubmit}
               />
            </div>
          )}
        </div>

        <div className="h-16 border-t border-slate-200 bg-white flex justify-around items-center px-2 shadow-lg z-50">
          <button 
            onClick={() => setActiveMobileView('structure')}
            className={`flex flex-col items-center p-2 rounded w-full transition-colors ${activeMobileView === 'structure' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">🌳</span>
            <span className="text-xs mt-1 font-medium">構造</span>
          </button>
          <button 
            onClick={() => setActiveMobileView('content')}
            className={`flex flex-col items-center p-2 rounded w-full transition-colors ${activeMobileView === 'content' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">📄</span>
            <span className="text-xs mt-1 font-medium">コンテンツ</span>
          </button>
          <button 
            onClick={() => setActiveMobileView('chat')}
            className={`flex flex-col items-center p-2 rounded w-full transition-colors ${activeMobileView === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">💬</span>
            <span className="text-xs mt-1 font-medium">対話</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // レンダリング
  // ============================================

  const leftWidth = panelState.isLeftCollapsed ? 0 : panelState.leftWidth;
  const rightWidth = panelState.isRightCollapsed ? 0 : panelState.rightWidth;
  const centerWidth = 100 - leftWidth - rightWidth;

  return (
    <div ref={containerRef} className="flex h-screen w-screen overflow-hidden bg-slate-100">
      
      {/* ============================================ */}
      {/* 左パネル折りたたみボタン (折りたたみ時) */}
      {/* ============================================ */}
      {panelState.isLeftCollapsed && (
        <div className="h-full w-10 bg-white border-r border-slate-200 flex flex-col items-center py-4">
          <button
            onClick={toggleLeftPanel}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            title="ノード構成を展開"
          >
            ▶
          </button>
          <div 
            className="mt-4 text-xs text-slate-400 font-medium"
            style={{ writingMode: 'vertical-rl' }}
          >
            ノード
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* 左パネル: ノード構成UI */}
      {/* ============================================ */}
      {!panelState.isLeftCollapsed && (
        <div 
          className="h-full border-r border-slate-200 bg-white overflow-hidden flex flex-col relative"
          style={{ width: `${leftWidth}%` }}
        >
          {/* 折りたたみボタン (ヘッダー内) */}
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={toggleLeftPanel}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="ノード構成を折りたたむ"
            >
              ◀
            </button>
          </div>
          
          <NodeTreePanel
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
          />
          
          {/* リサイズハンドル */}
          <div 
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors"
            onMouseDown={handleLeftResizeStart}
          />
        </div>
      )}

      {/* ============================================ */}
      {/* 中央パネル: コンテンツ */}
      {/* ============================================ */}
      <div 
        className="h-full overflow-hidden flex-1"
        style={{ width: `${centerWidth}%`, minWidth: `${PANEL_CONSTRAINTS.CENTER_MIN}%` }}
      >
        <ContentPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          payload={payload}
          selectedNodeId={selectedNodeId}
          isLoading={isLoading}
          lostState={payload?.target_lost_state === 'DIAGNOSTIC' ? undefined : payload?.target_lost_state}
          onChoiceSelect={(choice) => {
            // 選択操作をログ記録
            addOperatorLog('O0', 'GROUP_ATTEMPT', []);
            // 選択肢の内容をチャットメッセージとして送信
            // 第2引数(submissionValue)に純粋なラベルを渡すことで、APIには「【選択】」なしのテキストが送られる
            handleChatSubmit(`【選択】${choice.label}`, choice.label);
          }}
        />
      </div>

      {/* ============================================ */}
      {/* 右パネル: チャットUI */}
      {/* ============================================ */}
      <div 
        className="h-full border-l border-slate-200 bg-white overflow-hidden relative"
        style={{ width: panelState.isRightCollapsed ? '40px' : `${rightWidth}%` }}
      >
        {/* リサイズハンドル */}
        {!panelState.isRightCollapsed && (
          <div 
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-10"
            onMouseDown={handleRightResizeStart}
          />
        )}
        
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          isCollapsed={panelState.isRightCollapsed}
          onSubmit={handleChatSubmit}
          onToggleCollapse={toggleRightPanel}
        />
      </div>
    </div>
  );
};
