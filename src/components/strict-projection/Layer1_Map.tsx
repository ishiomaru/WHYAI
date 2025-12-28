import React from 'react';
import { ProjectionMap } from '@/lib/structure-generation-types';

interface Layer1Props {
  data: ProjectionMap;
}

/**
 * Layer 1: Structural Space (Projection)
 * "事実"の投影層。ノードと矛盾点のみを表示する。
 */
export const Layer1_Map: React.FC<Layer1Props> = ({ data }) => {
  return (
    <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4 tracking-wider">
        Layer 1: Structural Map
      </h3>
      
      {/* ノード視覚化 (簡易グラフプレースホルダー) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {data.nodes.map((node) => (
          <div 
            key={node.id} 
            className={`
              p-3 rounded border flex items-center justify-between
              ${node.reliability === 'high' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
            `}
          >
            <span className="font-medium text-slate-700">{node.label}</span>
            <span className="text-xs px-2 py-1 rounded bg-white text-slate-400">
              {node.reliability}
            </span>
          </div>
        ))}
      </div>

      {/* 矛盾点 */}
      {data.contradictions && data.contradictions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-red-400">Structural Gaps Detected</h4>
          {data.contradictions.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-red-50 p-2 rounded">
              <span className="text-red-500">⚠</span>
              <span>{c.source} vs {c.target}: {c.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
