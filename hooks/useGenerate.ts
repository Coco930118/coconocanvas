'use client';

import { useState, useCallback } from 'react';
import { GenerateRequest, GenerateResultData } from '@/lib/types';
import {
  getUsedQueries,
  addUsedQuery,
  getPreviousPattern,
  setPreviousPattern,
} from '@/lib/localStorage';
import { extractPattern } from '@/lib/parseResponse';

export type GenStatus = 'idle' | 'searching' | 'extracting' | 'generating' | 'complete' | 'error';

export interface GenState {
  status: GenStatus;
  statusMessage: string;
  results: GenerateResultData[];
  error: string | null;
}

const INITIAL: GenState = {
  status: 'idle',
  statusMessage: '',
  results: [],
  error: null,
};

export function useGenerate() {
  const [state, setState] = useState<GenState>(INITIAL);

  const generate = useCallback(
    async (params: Omit<GenerateRequest, 'usedQueries' | 'previousPattern'>) => {
      setState({ status: 'searching', statusMessage: 'トレンドを検索中…', results: [], error: null });

      try {
        const usedQueries = getUsedQueries();
        const previousPattern = getPreviousPattern();

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...params, usedQueries, previousPattern }),
        });

        if (!response.body) throw new Error('レスポンスボディが空です');
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err || `HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process all complete SSE messages (separated by double newlines)
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const line = event.trim();
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setState(prev => ({
                  ...prev,
                  status: data.stage as GenStatus,
                  statusMessage: data.message,
                }));
              } else if (data.type === 'complete') {
                const results: GenerateResultData[] = data.results ?? [];

                // Persist used query
                if (results[0]?.query) addUsedQuery(results[0].query);

                // Persist pattern for next run
                if (results.length > 0) {
                  setPreviousPattern(extractPattern(results[results.length - 1].raw));
                }

                setState({ status: 'complete', statusMessage: '', results, error: null });
              } else if (data.type === 'error') {
                setState({ status: 'error', statusMessage: '', results: [], error: data.message });
              }
            } catch {
              // malformed JSON – skip
            }
          }
        }
      } catch (e) {
        setState({
          status: 'error',
          statusMessage: '',
          results: [],
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, generate, reset };
}
