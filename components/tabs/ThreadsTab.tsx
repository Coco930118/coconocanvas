'use client';

import { useState } from 'react';
import { useGenerate } from '@/hooks/useGenerate';
import { parseThreadsResponse, getThreadsQuality } from '@/lib/parseResponse';
import { addToHistory, addToFavorites } from '@/lib/localStorage';
import { GenerateResultData } from '@/lib/types';
import { CopyButton } from '@/components/ui/CopyButton';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { CharCount } from '@/components/ui/CharCount';
import { TrendSummary } from '@/components/ui/TrendSummary';
import { ParseErrorDisplay } from '@/components/ui/ParseErrorDisplay';

// ── Single result card ────────────────────────────────────────────────────────

function ThreadsCard({
  result,
  patternLabel,
  onFavorite,
  onRetry,
}: {
  result: GenerateResultData;
  patternLabel?: string;
  onFavorite: () => void;
  onRetry: () => void;
}) {
  const parsed = parseThreadsResponse(result.raw);

  if (!parsed.success) return <ParseErrorDisplay raw={parsed.raw} onRetry={onRetry} />;

  return (
    <div className="space-y-3">
      {patternLabel && (
        <p className="text-xs text-zinc-600 select-none">{patternLabel}</p>
      )}

      {/* Character thought */}
      <div
        className="opacity-40 text-sm italic select-none pointer-events-none leading-relaxed px-1"
        aria-hidden="true"
      >
        {parsed.thinking}
      </div>

      {/* Body */}
      <div className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
        <div className="absolute top-3 right-3">
          <CopyButton text={parsed.body} />
        </div>
        <pre className="whitespace-pre-wrap text-sm text-zinc-200 leading-loose font-sans pr-20">
          {parsed.body}
        </pre>
        <CharCount text={parsed.body} platform="threads" />
      </div>

      {/* 💍 Omamori card */}
      <div className="relative bg-amber-950 border border-amber-500 rounded-2xl p-4 font-serif leading-loose">
        <div className="absolute top-3 right-3">
          <CopyButton text={parsed.omamori} />
        </div>
        <p className="text-xs text-amber-700 select-none mb-1.5">
          お守り言葉 —{' '}
          <span className="text-amber-600">{getThreadsQuality(parsed.thinking)}</span>
        </p>
        <p className="text-amber-200 text-sm pr-20">{parsed.omamori}</p>
      </div>

      {/* Favorite */}
      <div className="flex justify-end">
        <button
          onClick={onFavorite}
          className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-amber-400 hover:border-amber-800 transition-colors"
        >
          お気に入りに保存
        </button>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function ThreadsTab() {
  const [hint, setHint] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const { state, generate } = useGenerate();

  const isLoading = ['searching', 'extracting', 'generating'].includes(state.status);

  const startCooldown = () => {
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  const handleSingle = async () => {
    if (cooldown || isLoading) return;
    startCooldown();
    await generate({ platform: 'threads', hint: hint.trim() });
  };

  const handleTriple = async () => {
    if (cooldown || isLoading) return;
    startCooldown();
    await generate({ platform: 'threads', hint: hint.trim(), count: 3 });
  };

  const makeEntry = (result: GenerateResultData, idx: number) => {
    const parsed = parseThreadsResponse(result.raw);
    if (!parsed.success) return null;
    return {
      id: `threads-${Date.now()}-${idx}`,
      timestamp: Date.now(),
      platform: 'threads' as const,
      raw: result.raw,
      thinking: parsed.thinking,
      body: parsed.body,
      omamori: parsed.omamori,
      coldness: result.coldness,
      rawness: result.rawness,
      trendSummary: result.trendSummary,
      query: result.query,
    };
  };

  const is3Pattern = state.results.length >= 3;
  const showTrend = state.results.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">ヒント（任意）</label>
        <input
          value={hint}
          onChange={e => setHint(e.target.value)}
          placeholder="例：最近、連絡が途絶えた友人のこと"
          className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* ── Buttons ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleSingle}
          disabled={cooldown || isLoading}
          className="flex-1 min-w-32 py-3 bg-amber-950/60 border border-amber-800 text-amber-300 text-sm rounded hover:bg-amber-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors tracking-wide"
        >
          {isLoading && state.results.length < 3 ? '生成中…' : '投稿を生成'}
        </button>
        <button
          onClick={handleTriple}
          disabled={cooldown || isLoading}
          className="flex-1 min-w-40 py-3 bg-zinc-900 border border-amber-900/50 text-amber-600 text-sm rounded hover:border-amber-700 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors tracking-wide"
        >
          {isLoading && state.results.length >= 3 ? '生成中…' : '3パターン同時生成'}
        </button>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {isLoading && <LoadingDots message={state.statusMessage} color="amber" />}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {state.status === 'error' && (
        <div className="p-4 bg-red-950/40 border border-red-900/60 rounded text-sm text-red-400">
          {state.error}
          <button onClick={handleSingle} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
            再試行
          </button>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {state.status === 'complete' && state.results.length > 0 && (
        <div className="space-y-4">
          {showTrend && (
            <TrendSummary
              summary={state.results[0].trendSummary}
              query={state.results[0].query}
            />
          )}

          {is3Pattern ? (
            // 3 cards side-by-side on md+, stacked on mobile
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {state.results.map((result, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4"
                >
                  <ThreadsCard
                    result={result}
                    patternLabel={`パターン ${i + 1} / 3`}
                    onFavorite={() => {
                      const entry = makeEntry(result, i);
                      if (entry) { addToHistory(entry); addToFavorites(entry); }
                    }}
                    onRetry={handleSingle}
                  />
                </div>
              ))}
            </div>
          ) : (
            <ThreadsCard
              result={state.results[0]}
              onFavorite={() => {
                const entry = makeEntry(state.results[0], 0);
                if (entry) { addToHistory(entry); addToFavorites(entry); }
              }}
              onRetry={handleSingle}
            />
          )}

          {/* Re-generate row */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSingle}
              disabled={cooldown || isLoading}
              className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-300 hover:border-zinc-600 disabled:opacity-40 transition-colors"
            >
              別パターンを生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
