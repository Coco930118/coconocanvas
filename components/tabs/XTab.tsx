'use client';

import { useState } from 'react';
import { useGenerate } from '@/hooks/useGenerate';
import { parseXResponse, getXQuality } from '@/lib/parseResponse';
import { addToHistory, addToFavorites } from '@/lib/localStorage';
import { OutputBlock } from '@/components/ui/OutputBlock';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { CharCount } from '@/components/ui/CharCount';
import { TrendSummary } from '@/components/ui/TrendSummary';
import { ParseErrorDisplay } from '@/components/ui/ParseErrorDisplay';

// slider: 0 = max cold, 10 = max raw
function toneToScores(tone: number) {
  return { coldness: 10 - tone, rawness: tone };
}

export function XTab() {
  const [hint, setHint] = useState('');
  const [tone, setTone] = useState(5);
  const [isManual, setIsManual] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const { state, generate } = useGenerate();

  const isLoading = ['searching', 'extracting', 'generating'].includes(state.status);
  const result = state.results[0] ?? null;
  const parsed = result ? parseXResponse(result.raw) : null;

  const handleGenerate = async () => {
    if (cooldown || isLoading) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
    const { coldness, rawness } = toneToScores(tone);
    await generate({
      platform: 'x',
      hint: hint.trim(),
      isManual,
      manualColdness: isManual ? coldness : undefined,
      manualRawness: isManual ? rawness : undefined,
    });
  };

  const handleFavorite = () => {
    if (!result || !parsed?.success) return;
    const entry = {
      id: `x-${Date.now()}`,
      timestamp: Date.now(),
      platform: 'x' as const,
      raw: result.raw,
      thinking: parsed.thinking,
      body: parsed.body,
      meigen: parsed.meigen,
      coldness: result.coldness,
      rawness: result.rawness,
      trendSummary: result.trendSummary,
      query: result.query,
    };
    addToHistory(entry);
    addToFavorites(entry);
  };

  const { coldness, rawness } = toneToScores(tone);

  return (
    <div className="space-y-6">
      {/* ── Input ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">ヒント（任意）</label>
          <input
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="例：採用面接で感じたこと"
            className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-zinc-500">トーン調整</label>
            {isManual && (
              <button
                onClick={() => { setTone(5); setIsManual(false); }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                リセット
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-600 whitespace-nowrap">冷徹寄り</span>
            <input
              type="range" min={0} max={10} value={tone}
              onChange={e => { setTone(Number(e.target.value)); setIsManual(true); }}
              className="flex-1 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-zinc-600 whitespace-nowrap">泥臭さ寄り</span>
          </div>
          <p className="text-xs text-zinc-700 mt-1">
            {isManual
              ? `冷徹 ${coldness}/10 ・ 泥臭さ ${rawness}/10（手動）`
              : 'スライダー操作で手動切替（デフォルトはサーバー側ランダム）'}
          </p>
        </div>
      </div>

      {/* ── Generate button ─────────────────────────────────────────────────── */}
      <button
        onClick={handleGenerate}
        disabled={cooldown || isLoading}
        className="w-full py-3 bg-indigo-950 border border-indigo-800 text-indigo-300 text-sm rounded hover:bg-indigo-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors tracking-wide"
      >
        {isLoading ? '生成中…' : '投稿を生成'}
      </button>

      {isLoading && <LoadingDots message={state.statusMessage} color="indigo" />}

      {state.status === 'error' && (
        <div className="p-4 bg-red-950/40 border border-red-900/60 rounded text-sm text-red-400">
          {state.error}
          <button onClick={handleGenerate} className="ml-3 text-xs underline opacity-70 hover:opacity-100">再試行</button>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {state.status === 'complete' && result && (
        <div className="space-y-5">
          <TrendSummary summary={result.trendSummary} query={result.query} />

          {parsed?.success ? (
            <>
              {/* ① Character thought — display only, never copied */}
              <div
                className="opacity-40 text-sm italic select-none pointer-events-none leading-relaxed border-l border-zinc-800 pl-3"
                aria-hidden="true"
              >
                {parsed.thinking}
              </div>

              {/* ② Body block */}
              <div>
                <OutputBlock
                  text={parsed.body}
                  label="本文"
                  copyLabel="本文コピー"
                />
                <CharCount text={parsed.body} platform="x" />
              </div>

              {/* ③ Meigen block */}
              <div>
                {/* Quality label: display only, outside the block */}
                <div className="flex items-center gap-2 mb-1.5 select-none">
                  <span className="text-xs text-indigo-500">一撃の名言</span>
                  <span className="text-xs text-indigo-800">
                    {getXQuality(result.coldness, result.rawness)}
                  </span>
                </div>
                <OutputBlock
                  text={parsed.meigen}
                  copyLabel="名言コピー"
                  blockClassName="bg-indigo-950 border border-indigo-600 rounded-none"
                  textClassName="text-indigo-200 text-sm font-mono tracking-wider"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap pt-1">
                <button
                  onClick={handleGenerate}
                  disabled={cooldown || isLoading}
                  className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-300 hover:border-zinc-600 disabled:opacity-40 transition-colors"
                >
                  別パターンを生成
                </button>
                <button
                  onClick={handleFavorite}
                  className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-amber-400 hover:border-amber-800 transition-colors"
                >
                  お気に入りに保存
                </button>
              </div>
            </>
          ) : parsed ? (
            <ParseErrorDisplay raw={parsed.raw} onRetry={handleGenerate} />
          ) : null}
        </div>
      )}
    </div>
  );
}
