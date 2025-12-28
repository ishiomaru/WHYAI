import React from 'react';
import { SandboxCode } from '@/lib/structure-generation-types';

interface Layer3Props {
  data: SandboxCode;
}

/**
 * Layer 3: Projection Page Layer (Sandbox)
 * "視点"の転換層。HTML/CSS/JSを固定枠内に投影する。
 * NOTE: 厳格な制約により、ここは「生成されたDOM」をそのまま配置する場所となる。
 */
export const Layer3_Sandbox: React.FC<Layer3Props> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="border border-emerald-200 rounded-lg p-6 bg-emerald-50/30">
      <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">
          Layer 3: Projection Sandbox
        </h3>
        <span className="text-[10px] text-emerald-400">Read-Only View</span>
      </div>
      
      <div className="p-0">
        <div 
           className="sandbox-content"
           dangerouslySetInnerHTML={{ __html: data.html }} 
        />
        <style dangerouslySetInnerHTML={{ __html: data.css }} />
        {/* デモの安全性のためにJS実行は制限されていますが、構造上は許容されます */}
      </div>
    </div>
  );
};
