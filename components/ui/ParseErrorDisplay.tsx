'use client';

import { useState } from 'react';

interface Props {
  raw: string;
  onRetry: () => void;
}

export function ParseErrorDisplay({ raw, onRetry }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="p-4 bg-zinc-900/80 border border-zinc-700 rounded space-y-3">
      <p className="text-sm text-zinc-400">
        出力のパースに失敗しました。セクション区切りが正しく生成されなかった可能性があります。
      </p>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onRetry}
          className="text-xs px-4 py-2 bg-zinc-800 border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
        >
          再生成してください
        </button>
        <button
          onClick={() => setShowRaw(v => !v)}
          className="text-xs px-4 py-2 border border-zinc-700 text-zinc-500 rounded hover:text-zinc-400 transition-colors"
        >
          {showRaw ? '生レスポンスを隠す' : '生レスポンスを確認'}
        </button>
      </div>
      {showRaw && (
        <pre className="mt-2 p-3 bg-black/40 border border-zinc-800 rounded text-xs text-zinc-600 whitespace-pre-wrap overflow-auto max-h-64">
          {raw}
        </pre>
      )}
    </div>
  );
}
