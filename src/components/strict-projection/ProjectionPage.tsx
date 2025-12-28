import React from 'react';
import { SupportPayload } from '@/lib/structure-generation-types';
import { Layer1_Map } from './Layer1_Map';
import { Layer2_Landscape } from './Layer2_Landscape';
import { Layer3_Sandbox } from './Layer3_Sandbox';

interface ProjectionPageProps {
  payload: SupportPayload;
}

/**
 * ProjectionPage: 厳格な投影型UIのルートコンポーネント
 * 
 * 役割:
 * - 各レイヤーコンポーネントの配置 (固定レイアウト)
 * - データの分配
 * - 「教える」要素の排除 (純粋なProjectionとしての振る舞い)
 */
export const ProjectionPage: React.FC<ProjectionPageProps> = ({ payload }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-8 space-y-8 font-sans">
      
      {/* ヘッダー: 状態インジケーター (中立) */}
      <div className="flex items-center gap-2 mb-8 pb-4 border-b">
        <div className="w-3 h-3 rounded-full bg-slate-400"></div>
        <span className="text-slate-400 text-xs font-mono uppercase">
          System State: {payload.target_lost_state}
        </span>
      </div>

      {/* Layer 1: データが存在すれば常に表示 */}
      {payload.projection_map && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Layer1_Map data={payload.projection_map} />
        </section>
      )}

      {/* Layer 2: 条件付き制約ランドスケープ */}
      {payload.generated_options && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <Layer2_Landscape data={payload.generated_options} />
        </section>
      )}

      {/* Layer 3: インタラクティブ投影 */}
      {payload.sandbox_code && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          <Layer3_Sandbox data={payload.sandbox_code} />
        </section>
      )}

      {/* フッター: 免責事項 */}
      <div className="text-center text-[10px] text-slate-300 mt-12">
        Projection Device v2.1.0 • No Teaching • Pure Structure Reflection
      </div>
    </div>
  );
};
