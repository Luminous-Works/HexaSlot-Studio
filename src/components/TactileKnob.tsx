import React, { useCallback, useRef, useState } from 'react';

interface TactileKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  displayValue: string;
  onChange: (next: number) => void;
  size?: 'sm' | 'md' | 'lg';
  accentColor?: string;
}

export const TactileKnob: React.FC<TactileKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  displayValue,
  onChange,
  size = 'md',
  accentColor = '#E11D2E',
}) => {
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  const norm = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  // Sweep from -135 deg to +135 deg
  const angle = -135 + norm * 270;

  const dims = size === 'sm' ? 46 : size === 'lg' ? 68 : 56;
  const radius = dims / 2 - 5;
  const center = dims / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 270 / 360;
  const maxDash = circumference * arcFraction;
  const activeDash = maxDash * norm;

  const clampAndRound = useCallback(
    (raw: number) => {
      const clamped = Math.max(min, Math.min(max, raw));
      const snapped = Math.round((clamped - min) / step) * step + min;
      return Number(snapped.toFixed(4));
    },
    [min, max, step]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dy = startYRef.current - e.clientY;
    const sensitivity = e.shiftKey ? 360 : 140;
    const delta = (dy / sensitivity) * (max - min);
    onChange(clampAndRound(startValRef.current + delta));
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

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const fine = e.shiftKey ? step : step * 4;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(clampAndRound(value + fine));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(clampAndRound(value - fine));
    }
  };

  const dialSize = size === 'sm' ? 30 : size === 'lg' ? 46 : 36;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        title="Drag vertically to adjust · Hold Shift for fine · Double-click to reset"
        className="relative flex items-center justify-center cursor-ns-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-full"
        style={{ width: dims, height: dims }}
      >
        {/* Precision SVG Value Arc */}
        <svg width={dims} height={dims} className="absolute inset-0 pointer-events-none">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(15, 23, 42, 0.12)"
            strokeWidth={2.5}
            strokeDasharray={`${maxDash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth={2.5}
            strokeDasharray={`${activeDash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />
        </svg>

        {/* High-Contrast Tactile Obsidian Encoder Cap */}
        <div
          className={`relative rounded-full tactile-well border border-white/10 transition-transform duration-75 ${
            dragging ? 'scale-95 ring-2 ring-red-600/40' : 'hover:scale-[1.03]'
          }`}
          style={{
            width: dialSize,
            height: dialSize,
            transform: `rotate(${angle}deg)`,
          }}
        >
          <span
            className="absolute left-1/2 top-1.5 -translate-x-1/2 w-[2px] rounded-full bg-white"
            style={{ height: size === 'sm' ? 6 : 8 }}
          />
        </div>
      </div>

      <div className="text-center leading-tight">
        <div className="text-[11px] font-medium text-slate-600 whitespace-nowrap">{label}</div>
        <div className="font-mono text-[11px] font-medium text-slate-900 tabular-nums whitespace-nowrap">
          {displayValue}
        </div>
      </div>
    </div>
  );
};
