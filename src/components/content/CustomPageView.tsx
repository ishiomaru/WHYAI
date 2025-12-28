'use client';

import React, { useRef, useEffect } from 'react';
import type { SandboxCode } from '@/lib/structure-generation-types';

interface CustomPageViewProps {
  sandboxCode: SandboxCode;
}

export const CustomPageView: React.FC<CustomPageViewProps> = ({
  sandboxCode
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // サンドボックス内にHTML/CSS/JSを注入
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              margin: 0; 
              padding: 16px;
              background: #f8fafc;
            }
            ${sandboxCode.css}
          </style>
        </head>
        <body>
          ${sandboxCode.html}
          <script>
            try {
              ${sandboxCode.js}
            } catch(e) {
              console.error('Sandbox JS Error:', e);
            }
          </script>
        </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();
  }, [sandboxCode]);

  return (
    <div className="h-full min-h-96 bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-500">
        カスタムページ (サンドボックス)
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="w-full h-full min-h-80 border-0"
        title="Sandbox Content"
      />
    </div>
  );
};
