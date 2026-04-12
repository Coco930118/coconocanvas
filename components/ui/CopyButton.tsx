'use client';

import { useState } from 'react';

interface Props {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({ text, className = '', label = 'コピー' }: Props) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <button
      onClick={handle}
      className={`text-xs px-3 py-1.5 rounded border transition-colors whitespace-nowrap ${
        copied
          ? 'bg-green-950 border-green-800 text-green-400'
          : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
      } ${className}`}
    >
      {copied ? 'コピー完了' : label}
    </button>
  );
}
