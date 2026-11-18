import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { History, Redo2, Undo2 } from 'lucide-react';

export interface CommandEntrySummary {
  id: number;
  label: string;
  domain: 'rack' | 'synth' | 'sequencer';
  timestamp: string;
}

interface CommandHistoryBarProps {
  pastEntries: CommandEntrySummary[];
  futureEntries: CommandEntrySummary[];
  currentLabel: string;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToPast: (index: number) => void;
  onJumpToFuture: (index: number) => void;
}

export const CommandHistoryBar: React.FC<CommandHistoryBarProps> = ({
  pastEntries,
  futureEntries,
  currentLabel,
  onUndo,
  onRedo,
  onJumpToPast,
  onJumpToFuture,
}) => {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  const canUndo = pastEntries.length > 0;
  const canRedo = futureEntries.length > 0;
  const lastPast = pastEntries[pastEntries.length - 1];
  const nextFuture = futureEntries[0];

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={popRef} className="relative flex items-center gap-1.5">
      <button
        type="button"
        disabled={!canUndo}
        onClick={onUndo}
        title={lastPast ? `Undo: ${currentLabel} (Ctrl+Z)` : 'Nothing to undo (Ctrl+Z)'}
        aria-label={lastPast ? `Undo ${currentLabel}` : 'Undo'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
          canUndo
            ? 'bg-white/90 hover:bg-white text-slate-900 border-slate-900/14 hover:border-slate-900/30'
            : 'bg-white/40 text-slate-400 border-slate-900/8 cursor-not-allowed'
        }`}
      >
        <Undo2 className="w-3.5 h-3.5" />
        <span>Undo</span>
        <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">Ctrl+Z</span>
      </button>

      <button
        type="button"
        disabled={!canRedo}
        onClick={onRedo}
        title={nextFuture ? `Redo: ${nextFuture.label} (Ctrl+Shift+Z)` : 'Nothing to redo (Ctrl+Shift+Z)'}
        aria-label={nextFuture ? `Redo ${nextFuture.label}` : 'Redo'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
          canRedo
            ? 'bg-white/90 hover:bg-white text-slate-900 border-slate-900/14 hover:border-slate-900/30'
            : 'bg-white/40 text-slate-400 border-slate-900/8 cursor-not-allowed'
        }`}
      >
        <Redo2 className="w-3.5 h-3.5" />
        <span>Redo</span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
          open
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white/85 hover:bg-white text-slate-700 border-slate-900/12'
        }`}
      >
        <History className="w-3.5 h-3.5 text-[#E11D2E]" />
        <span className="font-mono tabular-nums">{pastEntries.length}</span>
        <span className="hidden md:inline">History</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl bg-white/95 backdrop-blur-2xl border border-slate-900/14 shadow-[0_20px_48px_-12px_rgba(15,23,42,0.22)] p-2"
          >
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-900/8 mb-1.5">
              <span className="text-xs font-semibold text-slate-900">Global Command History</span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {pastEntries.length} undo · {futureEntries.length} redo
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {futureEntries
                .slice()
                .reverse()
                .map((entry, revIdx) => {
                  const origIdx = futureEntries.length - 1 - revIdx;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        onJumpToFuture(origIdx);
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-400 hover:bg-slate-900/5 hover:text-slate-800 transition-colors"
                    >
                      <span className="truncate">{entry.label}</span>
                      <span className="font-mono text-[10px] shrink-0">Redo · {entry.domain}</span>
                    </button>
                  );
                })}

              {/* Current active state */}
              <div className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-slate-900 text-white text-xs">
                <span className="font-medium truncate">{currentLabel}</span>
                <span className="font-mono text-[10px] text-[#E11D2E] shrink-0">Active</span>
              </div>

              {pastEntries
                .slice()
                .reverse()
                .map((entry, revIdx) => {
                  const origIdx = pastEntries.length - 1 - revIdx;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        onJumpToPast(origIdx);
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-700 hover:bg-slate-900/6 hover:text-slate-900 transition-colors"
                    >
                      <span className="truncate">{entry.label}</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 tabular-nums">
                        {entry.domain} · {entry.timestamp}
                      </span>
                    </button>
                  );
                })}

              {pastEntries.length === 0 && futureEntries.length === 0 && (
                <div className="px-2.5 py-3 text-xs text-slate-500 text-center">
                  Edit any rack slot, synth knob, or sequencer parameter to record undoable steps.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
