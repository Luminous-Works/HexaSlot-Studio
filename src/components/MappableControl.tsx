import React from 'react';
import { Sliders, X } from 'lucide-react';
import { MidiMappingBinding, MidiTargetDescriptor } from '../types/mpc';

interface MappableControlProps {
  target: MidiTargetDescriptor;
  binding?: MidiMappingBinding;
  overlayActive: boolean;
  isLearning: boolean;
  liveCcValue?: number;
  onOpenBind: (target: MidiTargetDescriptor, clientX: number, clientY: number) => void;
  onUnbind: (targetId: string) => void;
  className?: string;
  compactBadge?: boolean;
  children: React.ReactNode;
}

export const MappableControl: React.FC<MappableControlProps> = ({
  target,
  binding,
  overlayActive,
  isLearning,
  liveCcValue,
  onOpenBind,
  onUnbind,
  className = '',
  compactBadge = false,
  children,
}) => {
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenBind(target, e.clientX, e.clientY);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenBind(target, e.clientX, e.clientY);
  };

  const ccPct =
    liveCcValue !== undefined ? Math.max(0, Math.min(100, (liveCcValue / 127) * 100)) : null;

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`relative group/mappable rounded-xl transition-all ${
        isLearning
          ? 'ring-2 ring-[#E11D2E] bg-[#E11D2E]/8'
          : overlayActive && binding
          ? 'ring-2 ring-[#E11D2E] bg-[#E11D2E]/[0.05]'
          : overlayActive
          ? 'ring-1 ring-dashed ring-slate-900/25 hover:ring-[#E11D2E]/60 hover:bg-white/60'
          : ''
      } ${className}`}
    >
      {children}

      {/* Normal-mode quiet hardware indicator when mapped */}
      {!overlayActive && binding && !isLearning && (
        <button
          type="button"
          onClick={handleOverlayClick}
          title={`Mapped to ${binding.controlLabel} (CC ${binding.cc}) · Right-click to rebind`}
          className="mt-1 w-full flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-mono tracking-tight hover:bg-[#E11D2E] transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E11D2E] shrink-0" />
          <span className="truncate">{binding.shortControlLabel}</span>
          {!compactBadge && <span className="text-slate-400">CC{binding.cc}</span>}
        </button>
      )}

      {/* Active Mapping Overlay Layer directly over the control */}
      {(overlayActive || isLearning) && (
        <button
          type="button"
          onClick={handleOverlayClick}
          className="absolute inset-0 z-20 rounded-xl flex flex-col items-center justify-between p-1.5 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D2E] bg-white/65 backdrop-blur-[2px] hover:bg-white/80 transition-colors"
          aria-label={
            binding
              ? `${target.label} mapped to ${binding.controlLabel} (CC ${binding.cc}). Click to edit.`
              : `Map ${target.label} to MPC Live III control`
          }
        >
          {isLearning ? (
            <div className="m-auto flex flex-col items-center gap-0.5">
              <span className="px-1.5 py-0.5 rounded bg-[#E11D2E] text-white font-mono text-[9px] font-semibold animate-pulse">
                MIDI LEARN
              </span>
              <span className="text-[9px] font-medium text-slate-800 truncate max-w-full">
                Move MPC Control
              </span>
            </div>
          ) : binding ? (
            <>
              <div className="w-full flex items-center justify-between gap-1">
                <span className="px-1.5 py-0.5 rounded bg-[#E11D2E] text-white font-mono text-[9px] font-semibold truncate">
                  {binding.shortControlLabel} · CC{binding.cc}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUnbind(target.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnbind(target.id);
                    }
                  }}
                  title="Unbind MIDI control"
                  className="p-0.5 rounded bg-slate-900/90 text-white hover:bg-[#E11D2E] transition-colors shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </div>

              <div className="w-full space-y-0.5">
                <div className="text-[9px] font-semibold text-slate-900 truncate">
                  {target.shortLabel}
                </div>
                {ccPct !== null && (
                  <div className="w-full h-1 rounded-full bg-slate-900/15 overflow-hidden">
                    <div
                      className="h-full bg-[#E11D2E] transition-[width] duration-75"
                      style={{ width: `${ccPct}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="m-auto flex flex-col items-center gap-0.5 opacity-80 group-hover/mappable:opacity-100">
              <Sliders className="w-3 h-3 text-slate-700" />
              <span className="text-[9px] font-medium text-slate-800 whitespace-nowrap">
                Bind MPC
              </span>
            </div>
          )}
        </button>
      )}
    </div>
  );
};
