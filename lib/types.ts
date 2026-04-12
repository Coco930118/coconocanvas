export type Platform = 'x' | 'threads';

export type GenerateStatus =
  | 'idle'
  | 'searching'
  | 'extracting'
  | 'generating'
  | 'complete'
  | 'error';

export interface GenerateRequest {
  platform: Platform;
  hint?: string;
  usedQueries?: string[];
  manualColdness?: number;
  manualRawness?: number;
  isManual?: boolean;
  previousPattern?: string;
  /** 3-pattern parallel generation for Threads */
  count?: number;
  /** Skip SSE, return plain JSON (used by BatchTab) */
  batch?: boolean;
}

// ── Parsed response shapes ──────────────────────────────────────────────────

export interface ParsedX {
  success: true;
  thinking: string;
  body: string;
  meigen: string;
}

export interface ParsedThreads {
  success: true;
  thinking: string;
  body: string;
  omamori: string;
}

export interface ParseError {
  success: false;
  raw: string;
}

// ── SSE event shapes ────────────────────────────────────────────────────────

export interface GenerateResultData {
  raw: string;
  query: string;
  trendSummary: string;
  coldness: number;
  rawness: number;
  platform: Platform;
}

export interface SSEProgress {
  type: 'progress';
  stage: 'searching' | 'extracting' | 'generating';
  message: string;
}

export interface SSEComplete {
  type: 'complete';
  results: GenerateResultData[];
  query: string;
  trendSummary: string;
}

export interface SSEError {
  type: 'error';
  message: string;
}

export type SSEEvent = SSEProgress | SSEComplete | SSEError;

// ── Batch types ─────────────────────────────────────────────────────────────

export interface BatchSlot {
  date: Date;
  platform: Platform;
  label: string;
}

export interface BatchParseResult {
  slots: BatchSlot[];
  startDate: Date;
  endDate: Date;
  confirmMessage: string;
  warnings: string[];
}

export interface BatchParseError {
  error: 'empty' | 'vague' | 'end_before_start' | 'invalid';
  message: string;
}

export type BatchParseOutcome =
  | { ok: true; result: BatchParseResult }
  | { ok: false; error: BatchParseError };

// ── localStorage types ───────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  timestamp: number;
  platform: Platform;
  raw: string;
  thinking: string;
  body: string;
  meigen?: string;
  omamori?: string;
  coldness: number;
  rawness: number;
  trendSummary: string;
  query: string;
}

export type FavoriteEntry = HistoryEntry & { note?: string };
