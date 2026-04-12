import { HistoryEntry, FavoriteEntry } from './types';

const PREFIX = 'quiet-tuning-';

const KEY = {
  history: `${PREFIX}history`,
  favorites: `${PREFIX}favorites`,
  usedQueries: `${PREFIX}used-queries`,
  previousPattern: `${PREFIX}previous-pattern`,
} as const;

// ── Safe read/write ──────────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded – silently ignore
  }
}

// ── Used queries ─────────────────────────────────────────────────────────────

export function getUsedQueries(): string[] {
  return safeGet<string[]>(KEY.usedQueries, []);
}

export function addUsedQuery(query: string): void {
  if (!query) return;
  // Keep last 20 to avoid excessive memory use
  const current = getUsedQueries();
  safeSet(KEY.usedQueries, [...current, query].slice(-20));
}

export function resetUsedQueries(): void {
  safeSet(KEY.usedQueries, []);
}

// ── Previous pattern ─────────────────────────────────────────────────────────

export function getPreviousPattern(): string {
  return safeGet<string>(KEY.previousPattern, '');
}

export function setPreviousPattern(pattern: string): void {
  safeSet(KEY.previousPattern, pattern);
}

// ── History ──────────────────────────────────────────────────────────────────

export function getHistory(): HistoryEntry[] {
  return safeGet<HistoryEntry[]>(KEY.history, []);
}

export function addToHistory(entry: HistoryEntry): void {
  const current = getHistory();
  safeSet(KEY.history, [entry, ...current].slice(0, 50));
}

// ── Favorites ────────────────────────────────────────────────────────────────

export function getFavorites(): FavoriteEntry[] {
  return safeGet<FavoriteEntry[]>(KEY.favorites, []);
}

export function isInFavorites(id: string): boolean {
  return getFavorites().some(f => f.id === id);
}

export function addToFavorites(entry: HistoryEntry): void {
  const current = getFavorites();
  if (current.some(f => f.id === entry.id)) return;
  safeSet(KEY.favorites, [entry, ...current].slice(0, 100));
}

export function removeFromFavorites(id: string): void {
  safeSet(KEY.favorites, getFavorites().filter(f => f.id !== id));
}
