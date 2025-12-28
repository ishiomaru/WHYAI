'use client';

/**
 * ============================================
 * ContentPanel.tsx - 中央パネル (コンテンツ表示)
 * ============================================
 * 
 * 概要:
 * タブ切替による複数コンテンツの表示を管理
 * 
 * 表示モード:
 * - デフォルト: タブ切替
 * - 同時表示: 選択肢+カスタムページ など (将来実装)
 * 
 * コンテンツ種類:
 * - カスタムページ (HTML/CSS/JS)
 * - 選択肢UI (条件付きソート/フィルタ)
 * - ノードグラフ (ホバー時にツールチップ)
 * - 生成ドキュメント (全ノード一覧)
 * - 記事投影 (Webコンテンツ)
 */

import React, { useState } from 'react';
import type { 
  ContentTabType, 
  SupportPayload,
  SortFilterUIState,
  LostState
} from '@/lib/structure-generation-types';
import { ChoiceUI } from '@/components/content/ChoiceUI';
import { NodeGraph } from '@/components/content/NodeGraph';
import { ProjectedDocView } from '@/components/content/ProjectedDocView';
import { CustomPageView } from '@/components/content/CustomPageView';
import { ArticleProjector } from '@/components/ArticleProjector';

// ============================================
// 型定義
// ============================================

interface ContentPanelProps {
  /** 現在アクティブなタブ */
  activeTab: ContentTabType;
  /** タブ変更ハンドラ */
  onTabChange: (tab: ContentTabType) => void;
  /** APIレスポンスのペイロード */
  payload: SupportPayload | null;
  /** 選択中のノードID (連動用) */
  selectedNodeId: string | null;
  /** 選択肢クリック時のコールバック */
  onChoiceSelect?: (choice: { label: string; impact: string }) => void;
  /** ローディング中かどうか */
  isLoading?: boolean;
  /** 迷子状態（共存表示ルール用） */
  lostState?: LostState;
}

/** タブ表示名 */
const TAB_LABELS: Record<ContentTabType, string> = {
  custom_page: 'カスタム',
  choices: '選択肢',
  node_graph: 'グラフ',
  document: 'ドキュメント',
  article: '記事'
};

// ============================================
// メインコンポーネント
// ============================================

export const ContentPanel: React.FC<ContentPanelProps> = ({
  activeTab,
  onTabChange,
  payload,
  selectedNodeId,
  onChoiceSelect,
  isLoading = false,
  lostState
}) => {
  // ============================================
  // State
  // ============================================
  
  /**
   * 条件付きソート/フィルタUI状態
   */
  const [sortFilterState, setSortFilterState] = useState<SortFilterUIState>({
    isVisible: false,
    sortBy: null,
    sortOrder: 'asc',
    activeFilters: []
  });

  /**
   * detected_intentに基づいてソート/フィルタUIを自動表示
   */
  React.useEffect(() => {
    if (!payload?.detected_intent) return;

    const { sort_intent, filter_intent } = payload.detected_intent;
    
    // ソート意図またはフィルタ意図が検出された場合、UIを表示
    const shouldShow = 
      (sort_intent?.detected && sort_intent.confidence !== 'low') ||
      (filter_intent?.detected && filter_intent.confidence !== 'low');

    if (shouldShow) {
      setSortFilterState(prev => ({
        ...prev,
        isVisible: true
      }));
    }
  }, [payload?.detected_intent]);

  /**
   * ドキュメントポップアップで表示するノードID
   */
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  /**
   * グラフでノードがクリックされた時の処理
   */
  const handleNodeClick = (nodeId: string) => {
    // リソースノードかどうかの判定は、selectedArticleのロジックに任せるため
    // ここでは単にIDをセットしてタブ切替をしない（Effectに任せる）か、
    // あるいは明示的にドキュメントタブを開く（デフォルト挙動）
    
    // ここでは従来の挙動（ドキュメントポップアップ）をデフォルトとし、
    // ArticleTabへの切り替えはEffectで行う
    setSelectedDocId(nodeId);
    onTabChange('document');
  };

  /**
   * ドキュメントポップアップを閉じる
   */
  const handleCloseDoc = () => {
    setSelectedDocId(null);
  };

  /**
   * 選択中の記事リソース (for article tab)
   * グラフから「リソースノード」をクリックした際に設定される
   */
   const selectedArticle = React.useMemo(() => {
    if (!selectedNodeId || !payload?.projected_resources) return null;
    
    // 簡易的にIDマッチング
    return payload.projected_resources.find(r => 
      selectedNodeId.includes(r.id) || selectedNodeId.includes(encodeURIComponent(r.id))
    );
  }, [selectedNodeId, payload?.projected_resources]);

  /**
   * 記事が選択されたら自動的に記事タブへ切り替える副作用
   */
  React.useEffect(() => {
    if (selectedArticle) {
      onTabChange('article');
    }
  }, [selectedArticle, onTabChange]);

  // ============================================
  // 利用可能タブの動的判定
  // ============================================
  const availableTabs: ContentTabType[] = React.useMemo(() => {
    const tabs: ContentTabType[] = [];
    
    // 選択肢タブ
    if (lostState !== 'M5') {
      tabs.push('choices');
    }
    
    // グラフタブ
    if (lostState !== 'M0') {
      tabs.push('node_graph');
    }
    
    // ドキュメントタブ
    tabs.push('document');

    // 記事タブ (リソースが投影されている場合のみ)
    if (payload?.projected_resources && payload.projected_resources.length > 0) {
      tabs.push('article');
    }
    
    // カスタムページ
    if (lostState === 'RESOLVED' && payload?.sandbox_code) {
      tabs.unshift('custom_page');
    }
    
    return tabs;
  }, [payload?.sandbox_code, lostState, payload?.projected_resources]);

  // ============================================
  // コンテンツレンダリング
  // ============================================
  const renderContent = () => {
    switch (activeTab) {
      case 'custom_page':
        return payload?.sandbox_code ? (
          <CustomPageView sandboxCode={payload.sandbox_code} />
        ) : (
          <EmptyState message="カスタムページなし" />
        );

      case 'choices':
        return payload?.generated_options ? (
          <ChoiceUI 
            options={payload.generated_options}
            sortFilterState={sortFilterState}
            onSortFilterChange={setSortFilterState}
            onChoiceSelect={onChoiceSelect}
            isLoading={isLoading}
          />
        ) : (
          <EmptyState message="選択肢なし" icon="📋" />
        );

      case 'node_graph':
        return payload?.projection_map ? (
          <NodeGraph 
            projectionMap={payload.projection_map}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <EmptyState message="ノードグラフなし" icon="🕸️" />
        );

      case 'document':
        return (
          <ProjectedDocView 
            payload={payload} 
            selectedDocId={selectedDocId}
            onCloseDoc={handleCloseDoc}
          />
        );
      
      case 'article':
        // 選択中のノードに対応する記事があればそれを、なければリストを表示するか最初の記事を表示
        const targetArticle = selectedArticle || (payload?.projected_resources ? payload.projected_resources[0] : null);
        
        if (!targetArticle) {
           return <EmptyState message="表示する記事がありません" icon="📰" />;
        }
        
        // ExternalResourceの構造上、rawChunks[0].text に本文が入っていると想定
        const content = targetArticle.rawChunks.map(c => c.text).join('\n\n');
        
        return (
          <ArticleProjector 
            title={`Reference: ${targetArticle.id.length > 50 ? targetArticle.id.slice(0, 50) + '...' : targetArticle.id}`}
            sourceUrl={targetArticle.id}
            content={content}
            isLoading={isLoading}
          />
        );

      default:
        return <EmptyState message="コンテンツなし" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* タブバー */}
      <div className="border-b border-slate-200 bg-slate-50 px-2">
        <div className="flex gap-1">
          {availableTabs.map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`
                px-3 py-2 text-sm font-medium rounded-t transition-colors
                ${activeTab === tab 
                  ? 'bg-white text-blue-600 border-t border-x border-slate-200 -mb-px' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}
              `}
            >
              {TAB_LABELS[tab] || tab}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50/50"> 
        {renderContent()}
      </div>
    </div>
  );
};

// ============================================
// サブコンポーネント: 空状態
// ============================================

interface EmptyStateProps {
  message: string;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon = '📭' }) => (
  <div className="h-full flex items-center justify-center text-slate-400">
    <div className="text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm">{message}</p>
      <p className="text-xs mt-1 text-slate-300">
        チャットで入力すると表示されます
      </p>
    </div>
  </div>
);
