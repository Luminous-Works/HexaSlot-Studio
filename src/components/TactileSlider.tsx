import React, { useCallback, useRef, useState } from 'react';

interface TactileSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  displayValue?: string;
  onChange: (value: number) => void;
  accent?: 'obsidian' | 'red' | 'blue';
  compact?: boolean;
}

export const TactileSlider: React.FC<TactileSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  displayValue,
  onChange,
  accent = 'obsidian',
  compact = false,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const norm = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const pct = norm * 100;

  const snapValue = useCallback(
    (raw: number) => {
      const clamped = Math.max(min, Math.min(max, raw));
      const snapped = Math.round((clamped - min) / step) * step + min;
      return Number(snapped.toFixed(4));
    },
    [min, max, step]
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
      onChange(snapValue(min + ratio * (max - min)));
    },
    [min, max, onChange, snapValue]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = e.shiftKey ? step : step * 2;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(snapValue(value + delta));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(snapValue(value - delta));
    }
  };

  const fillClass =
    accent === 'red'
      ? 'bg-[#E11D2E]'
      : accent === 'blue'
      ? 'bg-blue-600'
      : 'bg-slate-900';

  return (
    <div className="select-none">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-slate-600 truncate`}>
          {label}
        </span>
        <span
          className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-mono font-semibold text-slate-900 tabular-nums shrink-0`}
        >
          {displayValue ?? value}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue ?? String(value)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => {
          if (defaultValue !== undefined) onChange(defaultValue);
        }}
        onKeyDown={handleKeyDown}
        title="Click or drag to adjust · Double-click to reset"
        className={`relative flex items-center cursor-ew-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-lg ${
          compact ? 'h-6' : 'h-7'
        }`}
      >
        {/* Recessed hardware rail */}
        <div className="relative w-full h-1.5 rounded-full bg-slate-900/10 border border-slate-900/8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${fillClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* High-contrast tactile fader cap */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-md tactile-well border border-white/15 flex items-center justify-center transition-transform duration-75 ${
            compact ? 'w-3.5 h-4' : 'w-4 h-5'
          } ${dragging ? 'scale-110 ring-2 ring-red-600/35' : 'hover:scale-105'}`}
          style={{ left: `${pct}%` }}
        >
          <span className="w-[1.5px] h-2.5 rounded-full bg-white/90" />
        </div>
      </div>
    </div>
  );
};
