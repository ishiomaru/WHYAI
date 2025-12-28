import React from 'react';
import { GeneratedOptions } from '@/lib/structure-generation-types';

interface Layer2Props {
  data: GeneratedOptions;
}

/**
 * Layer 2: 力学/状態 (ランドスケープ)
 * "可能性"の提示層。判断軸と選択肢の分岐を表示する。
 */
export const Layer2_Landscape: React.FC<Layer2Props> = ({ data }) => {
  return (
    <div className="border border-indigo-100 rounded-lg p-6 bg-indigo-50/30">
      <h3 className="text-sm font-semibold text-indigo-400 uppercase mb-4 tracking-wider">
        Layer 2: Landscape & Axis
      </h3>
      
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
          Axis: {data.axis_label}
        </span>
      </div>

      <div className="flex gap-4">
        {data.options && data.options.map((opt, i) => (
          <div key={i} className="flex-1 bg-white p-4 rounded shadow-sm border border-indigo-100 hover:shadow-md transition-shadow cursor-pointer">
            <h4 className="font-bold text-slate-800 mb-2">{opt.label}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{opt.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
