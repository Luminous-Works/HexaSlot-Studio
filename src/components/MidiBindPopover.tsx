import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Radio, Trash2, X } from 'lucide-react';
import { MPC_LIVE_III_CONTROLS } from '../data/midiCatalog';
import { MidiControlSpec, MidiMappingBinding, MidiTargetDescriptor } from '../types/mpc';

interface MidiBindPopoverProps {
  target: MidiTargetDescriptor | null;
  position: { x: number; y: number } | null;
  currentBinding?: MidiMappingBinding;
  allBindings: MidiMappingBinding[];
  isLearning: boolean;
  webMidiConnected: boolean;
  onToggleLearn: (targetId: string | null) => void;
  onBind: (target: MidiTargetDescriptor, control: MidiControlSpec, channel: number, inverted: boolean) => void;
  onUnbind: (targetId: string) => void;
  onClose: () => void;
}

const GROUPS: Array<MidiControlSpec['group']> = [
  'Q-Link Bank A',
  'Q-Link Bank B',
  'Q-Link Bank C',
  'Q-Link Bank D',
  'Performance & Strip',
];

export const MidiBindPopover: React.FC<MidiBindPopoverProps> = ({
  target,
  position,
  currentBinding,
  allBindings,
  isLearning,
  webMidiConnected,
  onToggleLearn,
  onBind,
  onUnbind,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [channel, setChannel] = useState<number>(currentBinding?.channel ?? 0);
  const [inverted, setInverted] = useState<boolean>(currentBinding?.inverted ?? false);

  useEffect(() => {
    setChannel(currentBinding?.channel ?? 0);
    setInverted(currentBinding?.inverted ?? false);
  }, [currentBinding, target?.id]);

  useEffect(() => {
    if (!target) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [target, onClose]);

  const coords = useMemo(() => {
    if (!position) return { left: 24, top: 80 };
    const w = 344;
    const h = 420;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const left = Math.max(16, Math.min(vw - w - 16, position.x));
    const top = Math.max(16, Math.min(vh - h - 16, position.y));
    return { left, top };
  }, [position]);

  return (
    <AnimatePresence>
      {target && position && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.96, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 4 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{ left: coords.left, top: coords.top }}
          className="fixed z-50 w-[344px] rounded-2xl bg-white/95 backdrop-blur-2xl border border-slate-900/15 shadow-2xl p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                MPC Live III Hardware Binding
              </div>
              <h4 className="text-sm font-semibold text-slate-900">{target.label}</h4>
              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                Range: {target.min} → {target.max}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Close MIDI binding menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Web MIDI Learn Trigger */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/[0.04] border border-slate-900/8">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">
                {isLearning ? 'Listening for MIDI CC...' : 'MIDI Learn (USB / DIN)'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {webMidiConnected
                  ? 'Twist any Q-Link or Touch Strip on MPC'
                  : 'Click Listen to arm or pick control below'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleLearn(isLearning ? null : target.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isLearning
                  ? 'bg-[#E11D2E] text-white animate-pulse'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {isLearning ? 'Listening' : 'Listen'}
            </button>
          </div>

          {/* Channel & Polarity */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Ch:</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 10].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setChannel(ch);
                      if (currentBinding) {
                        const ctrl =
                          MPC_LIVE_III_CONTROLS.find((c) => c.id === currentBinding.controlId) ?? {
                            id: currentBinding.controlId,
                            label: currentBinding.controlLabel,
                            shortLabel: currentBinding.shortControlLabel,
                            group: 'Performance & Strip' as const,
                            cc: currentBinding.cc,
                          };
                        onBind(target, ctrl, ch, inverted);
                      }
                    }}
                    className={`px-2 py-1 rounded-md font-mono text-[11px] transition-colors ${
                      channel === ch
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-900/5 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ch === 0 ? 'Omni' : ch}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextInv = !inverted;
                setInverted(nextInv);
                if (currentBinding) {
                  const ctrl =
                    MPC_LIVE_III_CONTROLS.find((c) => c.id === currentBinding.controlId) ?? {
                      id: currentBinding.controlId,
                      label: currentBinding.controlLabel,
                      shortLabel: currentBinding.shortControlLabel,
                      group: 'Performance & Strip' as const,
                      cc: currentBinding.cc,
                    };
                  onBind(target, ctrl, channel, nextInv);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                inverted
                  ? 'bg-[#E11D2E] text-white'
                  : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
              }`}
            >
              {inverted ? 'Inverted' : 'Normal'}
            </button>
          </div>

          {/* MPC Live III Hardware Control Picker */}
          <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5">
            {GROUPS.map((groupName) => {
              const items = MPC_LIVE_III_CONTROLS.filter((c) => c.group === groupName);
              return (
                <div key={groupName}>
                  <div className="text-[10px] font-semibold text-slate-500 mb-1">{groupName}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((ctrl) => {
                      const isCurrent = currentBinding?.controlId === ctrl.id;
                      const otherCount = allBindings.filter(
                        (b) => b.controlId === ctrl.id && b.targetId !== target.id
                      ).length;

                      return (
                        <button
                          key={ctrl.id}
                          type="button"
                          onClick={() => {
                            onBind(target, ctrl, channel, inverted);
                            onClose();
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left border transition-colors ${
                            isCurrent
                              ? 'bg-[#E11D2E] text-white border-[#E11D2E]'
                              : 'bg-white border-slate-900/10 hover:border-[#E11D2E]/50 text-slate-900'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold truncate">{ctrl.label}</div>
                            {otherCount > 0 && (
                              <div
                                className={`text-[9px] truncate ${
                                  isCurrent ? 'text-white/80' : 'text-slate-400'
                                }`}
                              >
                                +{otherCount} linked
                              </div>
                            )}
                          </div>
                          <span
                            className={`font-mono text-[10px] tabular-nums shrink-0 ml-1 ${
                              isCurrent ? 'text-white/90' : 'text-slate-500'
                            }`}
                          >
                            CC{ctrl.cc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {currentBinding && (
            <div className="pt-2 border-t border-slate-900/8 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-600">
                Bound: {currentBinding.controlLabel} (CC {currentBinding.cc})
              </span>
              <button
                type="button"
                onClick={() => {
                  onUnbind(target.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#E11D2E] hover:bg-[#E11D2E]/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Unbind
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
