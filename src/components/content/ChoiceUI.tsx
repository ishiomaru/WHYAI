'use client';

/**
 * ============================================
 * ChoiceUI.tsx - 選択肢表示コンポーネント
 * ============================================
 * 
 * 機能:
 * - LLMが生成した選択肢を表示
 * - 選択肢クリックで内容を送信
 * - ソート/フィルタ（条件付き表示）
 */

import React from 'react';
import type { GeneratedOptions, SortFilterUIState } from '@/lib/structure-generation-types';

interface ChoiceUIProps {
  options: GeneratedOptions;
  sortFilterState: SortFilterUIState;
  onSortFilterChange: (state: SortFilterUIState) => void;
  /** 選択肢クリック時のコールバック */
  onChoiceSelect?: (choice: { label: string; impact: string }) => void;
  /** 思考中（ローディング中）かどうか */
  isLoading?: boolean;
}

export const ChoiceUI: React.FC<ChoiceUIProps> = ({
  options,
  sortFilterState,
  onSortFilterChange,
  onChoiceSelect,
  isLoading = false
}) => {
  // ソート/フィルタ適用後のオプション
  const processedOptions = React.useMemo(() => {
    let result = [...options.options];

    // フィルタ適用
    if (sortFilterState.activeFilters.length > 0) {
      result = result.filter(opt => 
        !sortFilterState.activeFilters.some(f => opt.label.includes(f))
      );
    }

    // ソート適用
    if (sortFilterState.sortBy) {
      result.sort((a, b) => {
        const multiplier = sortFilterState.sortOrder === 'asc' ? 1 : -1;
        return a.label.localeCompare(b.label) * multiplier;
      });
    }

    return result;
  }, [options.options, sortFilterState]);

  /** 選択肢クリックハンドラ */
  const handleClick = (opt: { label: string; impact: string }) => {
    if (isLoading) return; // 思考中は無視
    onChoiceSelect?.(opt);
  };

  return (
    <div className="space-y-4">
      {/* 軸ラベル */}
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
          判断軸: {options.axis_label}
        </span>
      </div>

      {/* 診断質問（存在する場合） */}
      {(options as any).diagnostic_question && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            🔍 {(options as any).diagnostic_question}
          </p>
        </div>
      )}

      {/* 条件付きソート/フィルタUI */}
      {sortFilterState.isVisible && (
        <div className="flex gap-2 items-center p-2 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">ソート:</span>
          <select
            value={sortFilterState.sortBy || ''}
            onChange={(e) => onSortFilterChange({
              ...sortFilterState,
              sortBy: e.target.value as any || null
            })}
            className="text-xs px-2 py-1 border border-slate-300 rounded"
          >
            <option value="">なし</option>
            <option value="priority">優先度</option>
            <option value="timestamp">時系列</option>
            <option value="relevance">関連度</option>
          </select>
          <button
            onClick={() => onSortFilterChange({
              ...sortFilterState,
              sortOrder: sortFilterState.sortOrder === 'asc' ? 'desc' : 'asc'
            })}
            className="text-xs px-2 py-1 bg-slate-200 rounded hover:bg-slate-300"
          >
            {sortFilterState.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      )}

      {/* 選択肢カード */}
      <div className="grid gap-4 md:grid-cols-2">
        {processedOptions.map((opt, i) => (
          <button 
            key={i}
            onClick={() => handleClick(opt)}
            disabled={isLoading}
            className={`
              text-left bg-white border rounded-lg p-4 transition-all 
              ${isLoading 
                ? 'border-slate-200 opacity-50 cursor-not-allowed' 
                : 'border-slate-200 hover:shadow-md hover:border-blue-300 cursor-pointer active:scale-[0.98]'
              }
            `}
          >
            <h4 className="font-bold text-slate-800 mb-2">{opt.label}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{opt.impact}</p>
          </button>
        ))}
      </div>

      {processedOptions.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          選択肢がフィルタリングされました
        </div>
      )}

      {/* ローディング状態表示 */}
      {isLoading && (
        <div className="text-center text-slate-400 text-sm">
          思考中... 選択肢は無効になっています
        </div>
      )}
    </div>
  );
};
