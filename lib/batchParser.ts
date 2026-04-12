import { BatchSlot, BatchParseResult, BatchParseError, BatchParseOutcome, Platform } from './types';

const DAYS_JP = ['日', '月', '火', '水', '木', '金', '土'];

// Slot schedule per platform
const X_SLOT_HOURS: number[] = [6, 22];
const THREADS_SLOT_HOURS: number[] = [7, 10, 19];

const MAX_SLOTS = 30;

// Ambiguous/relative expressions that must be rejected (error case 1)
const VAGUE_PATTERNS = [
  '来週', '今度', 'そのうち', '近いうち', '今週中', 'いつか', '数日後', '後日',
  '次週', '翌週', '週末', '近く', 'もうすぐ', '近日中', '近日',
];

// ── Internal helpers ─────────────────────────────────────────────────────────

function dayLabel(d: Date): string {
  return DAYS_JP[d.getDay()];
}

function slotLabel(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}月${day}日（${dayLabel(d)}）${h}:${min}`;
}

function confirmLabel(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}（${dayLabel(d)}）${h}:${min}`;
}

interface RawDate {
  year?: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Parse Japanese-style date string, e.g. "4月14日6時" or "2026年4月14日6時30分" */
function parseJpDate(src: string, isEnd: boolean): RawDate | null {
  const jpRe =
    /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:(?:午前|午後)?(\d{1,2})時(?:(\d{2})分)?)?/;
  const m = src.match(jpRe);
  if (m) {
    return {
      year: m[1] ? Number(m[1]) : undefined,
      month: Number(m[2]),
      day: Number(m[3]),
      hour: m[4] !== undefined ? Number(m[4]) : isEnd ? 22 : 6,
      minute: m[5] ? Number(m[5]) : 0,
    };
  }

  // Fallback: numeric YYYY/M/D H:MM or M/D H:MM
  const numRe = /(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/;
  const n = src.match(numRe);
  if (n) {
    return {
      year: n[1] ? Number(n[1]) : undefined,
      month: Number(n[2]),
      day: Number(n[3]),
      hour: n[4] !== undefined ? Number(n[4]) : isEnd ? 22 : 6,
      minute: n[5] ? Number(n[5]) : 0,
    };
  }

  return null;
}

function toDate(r: RawDate, fallbackYear: number): Date {
  return new Date(r.year ?? fallbackYear, r.month - 1, r.day, r.hour, r.minute, 0, 0);
}

// ── Slot generation ──────────────────────────────────────────────────────────

function generateSlots(start: Date, end: Date): BatchSlot[] {
  const slots: BatchSlot[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const daySlots: { hour: number; platform: Platform }[] = [
      ...X_SLOT_HOURS.map(h => ({ hour: h, platform: 'x' as Platform })),
      ...THREADS_SLOT_HOURS.map(h => ({ hour: h, platform: 'threads' as Platform })),
    ].sort((a, b) => a.hour - b.hour);

    for (const { hour, platform } of daySlots) {
      const slotDate = new Date(cursor);
      slotDate.setHours(hour, 0, 0, 0);
      if (slotDate >= start && slotDate <= end) {
        slots.push({ date: slotDate, platform, label: slotLabel(slotDate) });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}

// ── Main export ──────────────────────────────────────────────────────────────

export function parseBatchPeriod(input: string): BatchParseOutcome {
  const trimmed = input.trim();

  // Error case 6: empty input
  if (!trimmed) {
    return { ok: false, error: { error: 'empty', message: '期間を入力してください' } };
  }

  // Error case 1: vague/relative expressions
  for (const v of VAGUE_PATTERNS) {
    if (trimmed.includes(v)) {
      return {
        ok: false,
        error: {
          error: 'vague',
          message: '具体的な日付で入力してください（例：4月14日6時〜4月20日22時）',
        },
      };
    }
  }

  // Normalise separators → 〜
  const normalised = trimmed
    .replace(/から/g, '〜')
    .replace(/まで/g, '')
    .replace(/[～~]/g, '〜')
    .replace(/\s*[-→]\s*/g, '〜');

  const parts = normalised.split('〜');
  if (parts.length < 2) {
    return {
      ok: false,
      error: { error: 'invalid', message: '期間の区切り（〜）が見つかりません' },
    };
  }

  const startStr = parts[0].trim();
  const endStr = parts.slice(1).join('').trim();

  const currentYear = new Date().getFullYear();
  const rawStart = parseJpDate(startStr, false);
  const rawEnd = parseJpDate(endStr, true);

  if (!rawStart || !rawEnd) {
    return {
      ok: false,
      error: {
        error: 'invalid',
        message: '日付の形式が解析できません（例：4月14日6時〜4月20日22時）',
      },
    };
  }

  // Resolve years – handle year-crossover heuristic
  const startYear = rawStart.year ?? currentYear;
  const endYear =
    rawEnd.year ??
    (rawEnd.month < rawStart.month && !rawStart.year ? currentYear + 1 : currentYear);

  const startDate = toDate(rawStart, startYear);
  const endDate = toDate(rawEnd, endYear);

  // Error case 2: end before start
  if (endDate <= startDate) {
    return {
      ok: false,
      error: { error: 'end_before_start', message: '終了日が開始日より前です' },
    };
  }

  const warnings: string[] = [];
  let slots = generateSlots(startDate, endDate);

  // Error case 3: over 30 slots → auto-trim + warning
  if (slots.length > MAX_SLOTS) {
    slots = slots.slice(0, MAX_SLOTS);
    const lastSlot = slots[slots.length - 1];
    const xCount = slots.filter(s => s.platform === 'x').length;
    const tCount = slots.filter(s => s.platform === 'threads').length;
    warnings.push(
      `OVER_LIMIT:上限30枠のため、${slotLabel(lastSlot.date)}を自動調整します。X${xCount}枠 / Threads${tCount}枠`,
    );
  }

  // Error case 4: entirely in the past → confirmation required
  const now = new Date();
  if (endDate < now) {
    warnings.push('PAST_DATE:過去の日付です。このまま生成しますか？');
  }

  // Error case 5: year-crossover → explicit year in confirm message
  const crossYear = startDate.getFullYear() !== endDate.getFullYear();
  if (crossYear) {
    warnings.push(`YEAR_CROSS:${startDate.getFullYear()}-${endDate.getFullYear()}`);
  }

  const confirmMessage = `${confirmLabel(startDate)} 〜 ${confirmLabel(endDate)} と解釈しました。よろしいですか？`;

  return {
    ok: true,
    result: {
      slots,
      startDate,
      endDate: slots[slots.length - 1]?.date ?? endDate,
      confirmMessage,
      warnings,
    },
  };
}

// ── Cost estimation ──────────────────────────────────────────────────────────

export function estimateCost(slotCount: number): { usdStr: string; jpyStr: string } {
  // Rough per-slot: $0.01 Tavily + $0.025 Claude ≈ $0.035, ×1.2 margin
  const usd = slotCount * 0.035 * 1.2;
  const jpy = Math.round(usd * 150);
  return {
    usdStr: `$${usd.toFixed(2)}`,
    jpyStr: `¥${jpy.toLocaleString()}`,
  };
}
