'use client';

import { useState } from 'react';
import { XTab } from '@/components/tabs/XTab';
import { ThreadsTab } from '@/components/tabs/ThreadsTab';
import { BatchTab } from '@/components/tabs/BatchTab';

type TabId = 'x' | 'threads' | 'batch';

const TABS: { id: TabId; label: string; icon: string; accent: string }[] = [
  { id: 'x', label: 'X', icon: '💎', accent: 'text-indigo-400 border-indigo-600' },
  { id: 'threads', label: 'Threads', icon: '💍', accent: 'text-amber-400 border-amber-600' },
  { id: 'batch', label: 'バッチ', icon: '📅', accent: 'text-zinc-300 border-zinc-500' },
];

export default function Home() {
  const [active, setActive] = useState<TabId>('x');

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-900 pb-5 pt-8 px-5 md:px-8 max-w-3xl mx-auto w-full">
        <h1 className="text-sm text-indigo-300 tracking-widest mb-1">
          静かな調律師
        </h1>
        <p className="text-xs text-zinc-600 tracking-wide">
          投稿生成スタジオ ver.4.1 — 40年の現場から出てくる、枯れた言葉の装置
        </p>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <nav className="border-b border-zinc-900 px-5 md:px-8 max-w-3xl mx-auto w-full">
        <div className="flex">
          {TABS.map(tab => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm border-b-2 transition-colors ${
                  isActive
                    ? `${tab.accent} border-b-2`
                    : 'text-zinc-600 border-transparent hover:text-zinc-400'
                }`}
              >
                <span className={isActive ? '' : 'grayscale opacity-50'}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
        {active === 'x' && <XTab />}
        {active === 'threads' && <ThreadsTab />}
        {active === 'batch' && <BatchTab />}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 px-5 py-4 max-w-3xl mx-auto w-full">
        <p className="text-xs text-zinc-700 text-center tracking-wide">
          AIが作りやすい綺麗な正論ではなく、現場から自然と出てくる枯れた言葉を。
        </p>
      </footer>
    </div>
  );
}
