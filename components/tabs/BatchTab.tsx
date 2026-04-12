'use client';

import { useState } from 'react';
import { parseBatchPeriod, estimateCost } from '@/lib/batchParser';
import { BatchSlot, BatchParseResult, GenerateResultData } from '@/lib/types';
import { parseXResponse, parseThreadsResponse, getXQuality, getThreadsQuality } from '@/lib/parseResponse';
import { getUsedQueries, addUsedQuery, getPreviousPattern, setPreviousPattern } from '@/lib/localStorage';
import { extractPattern } from '@/lib/parseResponse';
import { CopyButton } from '@/components/ui/CopyButton';
import { TrendSummary } from '@/components/ui/TrendSummary';

// ── Warning banner ────────────────────────────────────────────────────────────

function WarningBanner({ warnings, onConfirmPast, onDismiss }: {
  warnings: string[];
  onConfirmPast?: () => void;
  onDismiss: () => void;
}) {
  const overLimit = warnings.find(w => w.startsWith('OVER_LIMIT:'));
  const pastDate = warnings.find(w => w.startsWith('PAST_DATE:'));
  const yearCross = warnings.find(w => w.startsWith('YEAR_CROSS:'));

  return (
    <div className="p-4 bg-zinc-900/80 border border-amber-900/50 rounded space-y-2 text-sm">
      {overLimit && (
        <p className="text-amber-400">{overLimit.replace('OVER_LIMIT:', '')}</p>
      )}
      {yearCross && (
        <p className="text-zinc-400">年をまたいでいます（{yearCross.replace('YEAR_CROSS:', '')}）</p>
      )}
      {pastDate && (
        <div className="flex gap-3 items-center flex-wrap">
          <p className="text-zinc-400">{pastDate.replace('PAST_DATE:', '')}</p>
          <button
            onClick={onConfirmPast}
            className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
          >
            このまま生成
          </button>
          <button
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 border border-zinc-700 text-zinc-500 rounded hover:text-zinc-400 transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}
      {!pastDate && (
        <button
          onClick={onConfirmPast}
          className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
        >
          確定して続ける
        </button>
      )}
    </div>
  );
}

// ── Slot result card ──────────────────────────────────────────────────────────

interface SlotResult {
  slot: BatchSlot;
  status: 'pending' | 'generating' | 'done' | 'error';
  data?: GenerateResultData;
  error?: string;
}

function SlotCard({ sr }: { sr: SlotResult }) {
  const { slot, status, data } = sr;
  const isX = slot.platform === 'x';
  const borderColor = isX ? 'border-indigo-900' : 'border-amber-900';
  const headerColor = isX ? 'text-indigo-400' : 'text-amber-400';

  const parsedX = isX && data ? parseXResponse(data.raw) : null;
  const parsedT = !isX && data ? parseThreadsResponse(data.raw) : null;

  return (
    <div className={`border ${borderColor} rounded p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`text-xs font-mono ${headerColor}`}>
            📅 {slot.label} ／ {isX ? 'X' : 'Threads'}
          </span>
          {data && (
            <p className="text-xs text-zinc-600 mt-0.5">
              冷徹 {data.coldness} / 泥臭さ {data.rawness}
            </p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            status === 'done'
              ? 'border-green-900 text-green-600'
              : status === 'generating'
              ? 'border-indigo-900 text-indigo-500'
              : status === 'error'
              ? 'border-red-900 text-red-500'
              : 'border-zinc-800 text-zinc-600'
          }`}
        >
          {status === 'done' ? '完了' : status === 'generating' ? '生成中…' : status === 'error' ? 'エラー' : '待機中'}
        </span>
      </div>

      {/* Trend */}
      {data && <TrendSummary summary={data.trendSummary} query={data.query} />}

      {/* X result */}
      {isX && parsedX?.success && (
        <>
          <div className="opacity-40 text-xs italic select-none pointer-events-none leading-relaxed">
            {parsedX.thinking}
          </div>
          <div className="relative bg-zinc-900/50 border border-zinc-800 rounded p-3">
            <div className="absolute top-2 right-2">
              <CopyButton text={parsedX.body} />
            </div>
            <pre className="whitespace-pre-wrap text-xs text-zinc-300 leading-loose font-sans pr-16">
              {parsedX.body}
            </pre>
          </div>
          <div className="relative bg-indigo-950 border border-indigo-700 rounded-none p-3 font-mono">
            <div className="absolute top-2 right-2">
              <CopyButton text={parsedX.meigen} />
            </div>
            <p className="text-xs text-indigo-700 select-none mb-1">
              💎 {data && getXQuality(data.coldness, data.rawness)}
            </p>
            <p className="text-indigo-200 text-xs tracking-wider pr-16">{parsedX.meigen}</p>
          </div>
        </>
      )}

      {/* Threads result */}
      {!isX && parsedT?.success && (
        <>
          <div className="opacity-40 text-xs italic select-none pointer-events-none leading-relaxed">
            {parsedT.thinking}
          </div>
          <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3">
            <div className="absolute top-2 right-2">
              <CopyButton text={parsedT.body} />
            </div>
            <pre className="whitespace-pre-wrap text-xs text-zinc-300 leading-loose font-sans pr-16">
              {parsedT.body}
            </pre>
          </div>
          <div className="relative bg-amber-950 border border-amber-700 rounded-2xl p-3 font-serif">
            <div className="absolute top-2 right-2">
              <CopyButton text={parsedT.omamori} />
            </div>
            <p className="text-xs text-amber-700 select-none mb-1">
              💍 {getThreadsQuality(parsedT.thinking)}
            </p>
            <p className="text-amber-200 text-xs pr-16">{parsedT.omamori}</p>
          </div>
        </>
      )}

      {sr.status === 'error' && (
        <p className="text-xs text-red-500">{sr.error}</p>
      )}
    </div>
  );
}

// ── Batch export helpers ───────────────────────────────────────────────────────

function buildExportText(slotResults: SlotResult[]): string {
  return slotResults
    .filter(sr => sr.status === 'done' && sr.data)
    .map(sr => {
      const { slot, data } = sr;
      const isX = slot.platform === 'x';
      const parsed = isX ? parseXResponse(data!.raw) : parseThreadsResponse(data!.raw);
      if (!parsed.success) return `# ${slot.label}\n（パースエラー）\n`;
      const footer = isX
        ? `💎 ${'meigen' in parsed ? parsed.meigen : ''}`
        : `💍 ${'omamori' in parsed ? parsed.omamori : ''}`;
      return `# ${slot.label}\n${parsed.body}\n${footer}\n`;
    })
    .join('\n---\n\n');
}

function buildCSV(slotResults: SlotResult[]): string {
  const header = 'date,platform,body,meigen_omamori,coldness,rawness,query';
  const rows = slotResults
    .filter(sr => sr.status === 'done' && sr.data)
    .map(sr => {
      const { slot, data } = sr;
      const isX = slot.platform === 'x';
      const parsed = isX ? parseXResponse(data!.raw) : parseThreadsResponse(data!.raw);
      if (!parsed.success) return '';
      const body = parsed.body.replace(/"/g, '""').replace(/\n/g, ' ');
      const extra = isX
        ? ('meigen' in parsed ? parsed.meigen : '').replace(/"/g, '""')
        : ('omamori' in parsed ? parsed.omamori : '').replace(/"/g, '""');
      return `"${slot.label}","${slot.platform}","${body}","${extra}",${data!.coldness},${data!.rawness},"${data!.query}"`;
    })
    .filter(Boolean);
  return [header, ...rows].join('\n');
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = 'input' | 'confirm' | 'running' | 'done';

export function BatchTab() {
  const [periodInput, setPeriodInput] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [parseResult, setParseResult] = useState<BatchParseResult | null>(null);
  const [parseErrMsg, setParseErrMsg] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [slotResults, setSlotResults] = useState<SlotResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [running, setRunning] = useState(false);

  // ── Parse input ───────────────────────────────────────────────────────────

  const handleParse = () => {
    setParseErrMsg('');
    const outcome = parseBatchPeriod(periodInput);

    if (!outcome.ok) {
      setParseErrMsg(outcome.error.message);
      return;
    }

    const { result } = outcome;
    setParseResult(result);

    const hasPast = result.warnings.some(w => w.startsWith('PAST_DATE:'));
    const hasWarning = result.warnings.length > 0;

    if (hasWarning) {
      setNeedsConfirm(true);
      setPhase('confirm');
    } else {
      setPhase('confirm');
    }
  };

  const confirmAndProceed = () => {
    if (!parseResult) return;
    setNeedsConfirm(false);
    setPhase('confirm');
  };

  const cancelBack = () => {
    setPhase('input');
    setParseResult(null);
    setNeedsConfirm(false);
  };

  // ── Execute batch ─────────────────────────────────────────────────────────

  const handleExecute = async () => {
    if (!parseResult || running) return;

    const initial: SlotResult[] = parseResult.slots.map(slot => ({
      slot,
      status: 'pending',
    }));
    setSlotResults(initial);
    setProgress({ done: 0, total: parseResult.slots.length });
    setPhase('running');
    setRunning(true);

    for (let i = 0; i < parseResult.slots.length; i++) {
      const slot = parseResult.slots[i];

      // Mark as generating
      setSlotResults(prev =>
        prev.map((sr, idx) => (idx === i ? { ...sr, status: 'generating' } : sr)),
      );

      try {
        const usedQueries = getUsedQueries();
        const previousPattern = getPreviousPattern();

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: slot.platform,
            hint: '',
            usedQueries,
            previousPattern,
            batch: true,
          }),
        });

        const json = await res.json();

        if (json.error) throw new Error(json.error);

        const data: GenerateResultData = json.results[0];

        addUsedQuery(data.query);
        setPreviousPattern(extractPattern(data.raw));

        setSlotResults(prev =>
          prev.map((sr, idx) => (idx === i ? { ...sr, status: 'done', data } : sr)),
        );
      } catch (e) {
        setSlotResults(prev =>
          prev.map((sr, idx) =>
            idx === i
              ? { ...sr, status: 'error', error: e instanceof Error ? e.message : String(e) }
              : sr,
          ),
        );
      }

      setProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }

    setRunning(false);
    setPhase('done');
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  const cost = parseResult ? estimateCost(parseResult.slots.length) : null;

  const doneCount = slotResults.filter(sr => sr.status === 'done').length;
  const allText = buildExportText(slotResults);
  const csvText = buildCSV(slotResults);

  return (
    <div className="space-y-6">
      {/* ── PHASE: input ──────────────────────────────────────────────────── */}
      {phase === 'input' && (
        <>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">生成期間</label>
            <input
              value={periodInput}
              onChange={e => setPeriodInput(e.target.value)}
              placeholder="例：4月14日6時〜4月20日22時"
              className="w-full bg-zinc-900/70 border border-zinc-800 rounded px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <p className="text-xs text-zinc-700 mt-1.5">
              X: 6:00・22:00 ／ Threads: 7:00・10:00・19:00 を自動割り当て
            </p>
          </div>

          {parseErrMsg && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded px-3 py-2">
              {parseErrMsg}
            </p>
          )}

          <button
            onClick={handleParse}
            className="w-full py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded hover:bg-zinc-700 transition-colors tracking-wide"
          >
            期間を解析
          </button>
        </>
      )}

      {/* ── PHASE: confirm ────────────────────────────────────────────────── */}
      {(phase === 'confirm') && parseResult && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900/60 border border-zinc-700 rounded text-sm text-zinc-300 leading-relaxed">
            {parseResult.confirmMessage}
          </div>

          {/* Slot summary */}
          <div className="text-xs text-zinc-500 space-y-0.5">
            <p>
              X: {parseResult.slots.filter(s => s.platform === 'x').length}枠 ／
              Threads: {parseResult.slots.filter(s => s.platform === 'threads').length}枠 ／
              合計: {parseResult.slots.length}枠
            </p>
            {cost && (
              <p className="text-zinc-600">
                概算コスト：{cost.usdStr}（{cost.jpyStr}）＋20%マージン込み
              </p>
            )}
          </div>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <WarningBanner
              warnings={parseResult.warnings}
              onConfirmPast={confirmAndProceed}
              onDismiss={cancelBack}
            />
          )}

          {/* Slot list preview */}
          <div className="max-h-48 overflow-y-auto space-y-1 text-xs text-zinc-600 bg-zinc-900/40 border border-zinc-800 rounded p-3">
            {parseResult.slots.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span
                  className={s.platform === 'x' ? 'text-indigo-600' : 'text-amber-700'}
                >
                  {s.platform === 'x' ? '💎' : '💍'}
                </span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExecute}
              className="flex-1 py-3 bg-zinc-800 border border-zinc-600 text-zinc-300 text-sm rounded hover:bg-zinc-700 transition-colors"
            >
              生成を開始
            </button>
            <button
              onClick={cancelBack}
              className="px-5 py-3 border border-zinc-700 text-zinc-500 text-sm rounded hover:text-zinc-400 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {/* ── PHASE: running / done ─────────────────────────────────────────── */}
      {(phase === 'running' || phase === 'done') && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>
                {progress.done} / {progress.total} 枠完了
              </span>
              {phase === 'done' && <span className="text-green-600">すべて完了</span>}
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${(progress.done / (progress.total || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Export actions */}
          {phase === 'done' && doneCount > 0 && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => download(allText, 'batch-posts.txt', 'text/plain')}
                className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                テキストで一括ダウンロード
              </button>
              <button
                onClick={() => download(csvText, 'batch-posts.csv', 'text/csv')}
                className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                CSV ダウンロード
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(allText);
                }}
                className="text-xs px-4 py-2 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                全文コピー
              </button>
              <button
                onClick={() => {
                  setPhase('input');
                  setParseResult(null);
                  setSlotResults([]);
                  setPeriodInput('');
                }}
                className="text-xs px-4 py-2 border border-zinc-700 text-zinc-500 rounded hover:text-zinc-400 transition-colors"
              >
                新しい期間を入力
              </button>
            </div>
          )}

          {/* Slot cards */}
          <div className="space-y-4">
            {slotResults.map((sr, i) => (
              <SlotCard key={i} sr={sr} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
