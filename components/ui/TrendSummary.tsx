'use client';

import { useState } from 'react';

interface Props {
  summary: string;
  query: string;
}

export function TrendSummary({ summary, query }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1.5 transition-colors"
      >
        <span className="text-zinc-700">{open ? '▼' : '▶'}</span>
        今回参照したトレンド
      </button>
      {open && (
        <div className="mt-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded text-xs leading-relaxed">
          <div className="text-zinc-600 mb-1.5">クエリ：{query}</div>
          <div className="text-zinc-500 whitespace-pre-wrap">{summary}</div>
        </div>
      )}
    </div>
  );
}
