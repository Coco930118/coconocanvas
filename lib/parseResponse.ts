import { ParsedX, ParsedThreads, ParseError } from './types';

// ── Section parsers ──────────────────────────────────────────────────────────

export function parseXResponse(raw: string): ParsedX | ParseError {
  const thinking = extract(raw, 'THINKING', 'BODY');
  const body = extract(raw, 'BODY', 'MEIGEN');
  const meigen = extract(raw, 'MEIGEN', 'END');

  if (thinking === null || body === null || meigen === null) {
    return { success: false, raw };
  }
  return { success: true, thinking, body, meigen };
}

export function parseThreadsResponse(raw: string): ParsedThreads | ParseError {
  const thinking = extract(raw, 'THINKING', 'BODY');
  const body = extract(raw, 'BODY', 'OMAMORI');
  const omamori = extract(raw, 'OMAMORI', 'END');

  if (thinking === null || body === null || omamori === null) {
    return { success: false, raw };
  }
  return { success: true, thinking, body, omamori };
}

function extract(raw: string, from: string, to: string): string | null {
  const re = new RegExp(`===${from}===([\\s\\S]*?)===${to}===`);
  const m = raw.match(re);
  return m ? m[1].trim() : null;
}

// ── Quality labels ───────────────────────────────────────────────────────────

/** Returns 冷徹寄り / 泥臭さ寄り / バランス型 based on coldness/rawness scores */
export function getXQuality(coldness: number, rawness: number): string {
  if (coldness - rawness >= 3) return '冷徹寄り';
  if (rawness - coldness >= 3) return '泥臭さ寄り';
  return 'バランス型';
}

/** Returns （しずく）/（しらたま）/（ひより）by scanning the THINKING text */
export function getThreadsQuality(thinking: string): string {
  if (thinking.includes('しずく')) return '（しずく）';
  if (thinking.includes('しらたま')) return '（しらたま）';
  if (thinking.includes('ひより')) return '（ひより）';
  return '（しらたま）';
}

// ── Pattern extraction ───────────────────────────────────────────────────────

/** Extracts a rough syntactic pattern label from a meigen/omamori line */
export function extractPattern(raw: string): string {
  // Pull the meigen or omamori text from the raw response
  const meigen = extract(raw, 'MEIGEN', 'END');
  const omamori = extract(raw, 'OMAMORI', 'END');
  const target = meigen ?? omamori ?? '';

  if (/[？?]/.test(target)) return '問いかけ型';
  if (/より/.test(target)) return '対比型（より）';
  if (/ほど/.test(target)) return '逆説型（ほど）';
  if (/ない/.test(target)) return '否定型';
  if (/から/.test(target)) return '因果型';
  return '断言型';
}
