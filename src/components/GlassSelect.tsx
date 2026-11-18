import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

export interface GlassSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  meta?: string;
  group?: string;
}

interface GlassSelectProps<T extends string | number> {
  id?: string;
  label?: string;
  value: T;
  options: Array<GlassSelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  compact?: boolean;
  align?: 'left' | 'right';
  menuWidthClass?: string;
}

export function GlassSelect<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  compact = false,
  align = 'left',
  menuWidthClass = 'w-full min-w-[220px]',
}: GlassSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Group options preserving insertion order
  const groups = React.useMemo(() => {
    const map = new Map<string, Array<GlassSelectOption<T>>>();
    for (const opt of options) {
      const g = opt.group ?? '';
      const arr = map.get(g) ?? [];
      arr.push(opt);
      map.set(g, arr);
    }
    return Array.from(map.entries());
  }, [options]);

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-medium text-slate-500 mb-1.5"
        >
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl bg-white/90 hover:bg-white border transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
          open ? 'border-slate-900 shadow-sm' : 'border-slate-900/14 hover:border-slate-900/28'
        } ${compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm'}`}
      >
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate">
            {selected ? selected.label : placeholder}
          </span>
          {selected?.meta && (
            <span className="text-[11px] font-mono text-slate-400 truncate hidden sm:inline">
              · {selected.meta}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-slate-900' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 mt-1.5 ${menuWidthClass} ${
              align === 'right' ? 'right-0' : 'left-0'
            } rounded-xl bg-white/95 backdrop-blur-2xl border border-slate-900/14 shadow-[0_20px_48px_-12px_rgba(15,23,42,0.22)] max-h-72 overflow-y-auto p-1.5`}
          >
            {groups.map(([groupName, items]) => (
              <div key={groupName || '__default'} className="mb-1 last:mb-0">
                {groupName && (
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400">
                    {groupName}
                  </div>
                )}
                {items.map((opt) => {
                  const isActive = opt.value === value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-900/6 hover:text-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{opt.label}</div>
                        {opt.meta && (
                          <div
                            className={`text-[11px] truncate mt-0.5 ${
                              isActive ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {opt.meta}
                          </div>
                        )}
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-[#E11D2E] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
