import { useCallback, useRef, useState } from 'react';
import type { CommandEntrySummary } from '../components/CommandHistoryBar';

export interface HistoryEntry<T> {
  id: number;
  label: string;
  domain: 'rack' | 'synth' | 'sequencer';
  timestamp: string;
  state: T;
  coalesceKey?: string;
}

interface HistoryBuffer<T> {
  past: Array<HistoryEntry<T>>;
  present: HistoryEntry<T>;
  future: Array<HistoryEntry<T>>;
}

const MAX_HISTORY = 60;
const COALESCE_WINDOW_MS = 500;

function formatNow(): string {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function useCommandHistory<T>(initialState: T, initialLabel = 'Initial Studio State') {
  const seqIdRef = useRef(1);
  const lastCoalesceTimeRef = useRef(0);

  const [history, setHistory] = useState<HistoryBuffer<T>>(() => ({
    past: [],
    present: {
      id: 0,
      label: initialLabel,
      domain: 'rack',
      timestamp: formatNow(),
      state: initialState,
    },
    future: [],
  }));

  const commit = useCallback(
    (
      label: string,
      domain: 'rack' | 'synth' | 'sequencer',
      updater: (prev: T) => T,
      coalesceKey?: string
    ) => {
      const nowMs = Date.now();
      const canCoalesce =
        Boolean(coalesceKey) &&
        nowMs - lastCoalesceTimeRef.current < COALESCE_WINDOW_MS;

      setHistory((buf) => {
        const nextState = updater(buf.present.state);
        if (nextState === buf.present.state) return buf;

        if (canCoalesce && buf.present.coalesceKey === coalesceKey) {
          lastCoalesceTimeRef.current = nowMs;
          return {
            ...buf,
            present: {
              ...buf.present,
              label,
              timestamp: formatNow(),
              state: nextState,
            },
            future: [],
          };
        }

        lastCoalesceTimeRef.current = coalesceKey ? nowMs : 0;
        const nextEntry: HistoryEntry<T> = {
          id: seqIdRef.current++,
          label,
          domain,
          timestamp: formatNow(),
          state: nextState,
          coalesceKey,
        };

        const nextPast = [...buf.past, buf.present];
        if (nextPast.length > MAX_HISTORY) {
          nextPast.shift();
        }

        return {
          past: nextPast,
          present: nextEntry,
          future: [],
        };
      });
    },
    []
  );

  const undo = useCallback(() => {
    lastCoalesceTimeRef.current = 0;
    setHistory((buf) => {
      if (buf.past.length === 0) return buf;
      const previous = buf.past[buf.past.length - 1];
      const nextPast = buf.past.slice(0, -1);
      return {
        past: nextPast,
        present: previous,
        future: [buf.present, ...buf.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    lastCoalesceTimeRef.current = 0;
    setHistory((buf) => {
      if (buf.future.length === 0) return buf;
      const next = buf.future[0];
      const nextFuture = buf.future.slice(1);
      return {
        past: [...buf.past, buf.present],
        present: next,
        future: nextFuture,
      };
    });
  }, []);

  const jumpToPast = useCallback((pastIndex: number) => {
    lastCoalesceTimeRef.current = 0;
    setHistory((buf) => {
      if (pastIndex < 0 || pastIndex >= buf.past.length) return buf;
      const target = buf.past[pastIndex];
      const movedToFuture = [...buf.past.slice(pastIndex + 1), buf.present, ...buf.future];
      return {
        past: buf.past.slice(0, pastIndex),
        present: target,
        future: movedToFuture,
      };
    });
  }, []);

  const jumpToFuture = useCallback((futureIndex: number) => {
    lastCoalesceTimeRef.current = 0;
    setHistory((buf) => {
      if (futureIndex < 0 || futureIndex >= buf.future.length) return buf;
      const target = buf.future[futureIndex];
      const movedToPast = [...buf.past, buf.present, ...buf.future.slice(0, futureIndex)];
      return {
        past: movedToPast.slice(-MAX_HISTORY),
        present: target,
        future: buf.future.slice(futureIndex + 1),
      };
    });
  }, []);

  const pastSummaries: CommandEntrySummary[] = history.past.map((e) => ({
    id: e.id,
    label: e.label,
    domain: e.domain,
    timestamp: e.timestamp,
  }));

  const futureSummaries: CommandEntrySummary[] = history.future.map((e) => ({
    id: e.id,
    label: e.label,
    domain: e.domain,
    timestamp: e.timestamp,
  }));

  return {
    state: history.present.state,
    currentLabel: history.present.label,
    pastSummaries,
    futureSummaries,
    commit,
    undo,
    redo,
    jumpToPast,
    jumpToFuture,
  };
}
