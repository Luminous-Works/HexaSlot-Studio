import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Power,
  RotateCcw,
  Sparkles,
  Undo2,
  Volume2,
} from 'lucide-react';
import { audioEngine } from '../audio/dspEngine';
import { DSP_MODULES, RACK_PRESETS } from '../data/dspCatalog';
import { ChainArchitectureMode, DspModuleId, InsertSlotState } from '../types/mpc';
import type { QuickSlotSnapshot } from '../App';
import { TactileKnob } from './TactileKnob';
import { OscilloscopeCanvas } from './OscilloscopeCanvas';
import { GlassSelect, GlassSelectOption } from './GlassSelect';

interface InsertRackViewProps {
  slots: InsertSlotState[];
  selectedSlotIdx: number;
  onSelectSlot: (idx: number) => void;
  onUpdateSlot: (idx: number, patch: Partial<InsertSlotState>) => void;
  onSwapModule: (idx: number, moduleId: DspModuleId) => void;
  onMoveSlot: (idx: number, direction: -1 | 1) => void;
  activePresetId: string;
  onLoadPreset: (presetId: string) => void;
  onClearAll: () => void;
  quickSnapshot: QuickSlotSnapshot | null;
  onCaptureSnapshot: () => void;
  onRestoreSnapshot: () => void;
  archMode: ChainArchitectureMode;
  onChangeArchMode: (mode: ChainArchitectureMode) => void;
  audioRunning: boolean;
  sequencerPlaying: boolean;
  onToggleSequencer: () => void;
  onAuditionHit: (kind: 'chord' | 'bass') => void;
}

const MODULE_OPTIONS: Array<GlassSelectOption<DspModuleId>> = Object.values(DSP_MODULES).map((mod) => ({
  value: mod.id,
  label: mod.id === 'empty' ? 'Empty (Pass-Through)' : mod.name,
  meta: mod.id === 'empty' ? 'Bypassed' : `${mod.cpuCostPercent.toFixed(1)}% RK3588 CPU`,
  group: mod.category,
}));

export const InsertRackView: React.FC<InsertRackViewProps> = ({
  slots,
  selectedSlotIdx,
  onSelectSlot,
  onUpdateSlot,
  onSwapModule,
  onMoveSlot,
  activePresetId,
  onLoadPreset,
  onClearAll,
  quickSnapshot,
  onCaptureSnapshot,
  onRestoreSnapshot,
  archMode,
  onChangeArchMode,
  audioRunning,
  sequencerPlaying,
  onToggleSequencer,
  onAuditionHit,
}) => {
  const [justCaptured, setJustCaptured] = useState(false);
  const [justRestored, setJustRestored] = useState(false);

  // Refs for 60fps per-slot slim vertical glow indicators without triggering React re-renders
  const meterBarRefs = useRef<Array<HTMLDivElement | null>>([]);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    let rafId = 0;
    const levels = new Float32Array(16);
    const smoothed = new Float32Array(16);

    const tick = () => {
      if (audioRunning) {
        audioEngine.getSlotLevels(levels);
      } else {
        levels.fill(0);
      }

      const currentSlots = slotsRef.current;
      for (let i = 0; i < 16; i++) {
        const s = currentSlots[i];
        const isActive = Boolean(s && s.moduleId !== 'empty' && !s.bypassed);
        const target = isActive ? levels[i] : 0;
        // Fast attack, smooth LED decay
        smoothed[i] = target > smoothed[i] ? target : smoothed[i] * 0.84;
        const val = smoothed[i] < 0.01 ? 0 : smoothed[i];

        const el = meterBarRefs.current[i];
        if (el) {
          el.style.transform = `scaleY(${val.toFixed(3)})`;
          el.style.opacity = val > 0.02 ? '1' : '0';
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioRunning]);

  const activeCount = slots.filter((s) => s.moduleId !== 'empty' && !s.bypassed).length;
  const loadedCount = slots.filter((s) => s.moduleId !== 'empty').length;
  const totalCpu = slots.reduce((acc, s) => {
    if (s.moduleId === 'empty' || s.bypassed) return acc;
    return acc + DSP_MODULES[s.moduleId].cpuCostPercent;
  }, 0);

  const selectedSlot = slots[selectedSlotIdx] ?? slots[0];
  const selectedSpec = DSP_MODULES[selectedSlot.moduleId];

  const presetOptions = useMemo<Array<GlassSelectOption<string>>>(
    () =>
      RACK_PRESETS.map((p) => ({
        value: p.id,
        label: p.name,
        meta: `${p.slots.length} slots · ${p.summary}`,
      })),
    []
  );

  const triggerCapture = () => {
    onCaptureSnapshot();
    setJustCaptured(true);
    window.setTimeout(() => setJustCaptured(false), 1200);
  };

  const triggerRestore = () => {
    if (!quickSnapshot) return;
    onRestoreSnapshot();
    setJustRestored(true);
    window.setTimeout(() => setJustRestored(false), 1200);
  };

  const renderSlotTile = (slot: InsertSlotState) => {
    const spec = DSP_MODULES[slot.moduleId];
    const isSelected = slot.index === selectedSlotIdx;
    const isLoaded = slot.moduleId !== 'empty';
    const isActive = isLoaded && !slot.bypassed;

    return (
      <motion.div
        key={slot.index}
        layout
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className={`group relative rounded-xl p-3 transition-colors cursor-pointer select-none border flex gap-2.5 ${
          isSelected
            ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900/10'
            : isActive
            ? 'bg-white/85 border-slate-900/12 hover:border-slate-900/25'
            : 'bg-white/45 border-slate-900/8 hover:bg-white/70'
        }`}
        onClick={() => onSelectSlot(slot.index)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono text-[11px] font-semibold text-slate-400 tabular-nums">
              {String(slot.index + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateSlot(slot.index, { bypassed: !slot.bypassed });
              }}
              disabled={!isLoaded}
              aria-label={`Toggle bypass for slot ${slot.index + 1}`}
              className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                !isLoaded
                  ? 'text-slate-300 cursor-not-allowed'
                  : isActive
                  ? 'bg-slate-900 text-[#E11D2E] hover:bg-slate-800'
                  : 'bg-slate-200/80 text-slate-500 hover:bg-slate-300/80'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-h-[38px] flex flex-col justify-center">
            <div
              className={`text-[13px] font-semibold leading-tight truncate ${
                isActive ? 'text-slate-900' : isLoaded ? 'text-slate-400 line-through' : 'text-slate-400'
              }`}
            >
              {spec.shortName}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
              <span>{isLoaded ? spec.category : 'Available'}</span>
              {isLoaded && <span className="font-mono">{slot.mix}%</span>}
            </div>
          </div>

          <div className="mt-2.5 h-1 w-full rounded-full bg-slate-900/8 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                isActive ? 'bg-[#E11D2E]' : isLoaded ? 'bg-slate-300' : 'bg-transparent'
              }`}
              style={{ width: isLoaded ? `${slot.mix}%` : '0%' }}
            />
          </div>
        </div>

        {/* Slim vertical real-time signal level glow indicator */}
        <div
          aria-hidden="true"
          className={`w-1.5 shrink-0 rounded-full overflow-hidden relative flex items-end ${
            isActive ? 'bg-slate-900/10' : 'bg-slate-900/5 opacity-40'
          }`}
        >
          <div
            ref={(el) => {
              meterBarRefs.current[slot.index] = el;
            }}
            className="w-full h-full origin-bottom rounded-full bg-gradient-to-t from-[#E11D2E] via-red-500 to-rose-400"
            style={{
              transform: 'scaleY(0)',
              opacity: 0,
              boxShadow: '0 0 8px rgba(225, 29, 46, 0.65)',
              willChange: 'transform, opacity',
            }}
          />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* MPC Track Host Context + Master Telemetry Bar */}
      <section className="glass-panel rounded-2xl p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Lumina Aerospace</span>
              <span aria-hidden="true">·</span>
              <span>MPC Track Channel Strip</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-700">{activeCount} active / 16 slots</span>
            </div>

            {/* Simulated MPC 4-Slot Native Channel Strip */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-slate-900 text-white px-3 py-2.5 border border-slate-900">
                <div className="font-mono text-[10px] text-[#E11D2E] font-semibold">INSERT 1</div>
                <div className="text-xs font-semibold truncate mt-0.5">HexaSlot 16</div>
              </div>
              {[2, 3, 4].map((num) => (
                <div
                  key={num}
                  className="rounded-lg bg-white/70 text-slate-400 px-3 py-2.5 border border-slate-900/10"
                >
                  <div className="font-mono text-[10px]">INSERT {num}</div>
                  <div className="text-xs font-medium truncate mt-0.5">Free Slot</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onToggleSequencer}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
                  sequencerPlaying
                    ? 'bg-[#E11D2E] text-white hover:bg-[#C81827]'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                {sequencerPlaying ? 'Stop Generative Loop' : 'Play Generative Loop'}
              </button>
              <button
                type="button"
                onClick={() => onAuditionHit('chord')}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-900/12 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Audition Synth Chord
              </button>
              <button
                type="button"
                onClick={() => onAuditionHit('bass')}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-900/12 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Audition Sub Hit
              </button>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Master Post-Rack Output</span>
              <span className="font-mono tabular-nums text-slate-700">
                {audioRunning ? 'AudioContext Active' : 'Standby'}
              </span>
            </div>
            <OscilloscopeCanvas audioRunning={audioRunning} height={84} />
          </div>

          <div className="lg:col-span-3 flex flex-col gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1.5">Execution Architecture</div>
              <div className="grid grid-cols-2 p-1 rounded-lg bg-slate-900/6 border border-slate-900/8">
                <button
                  type="button"
                  onClick={() => onChangeArchMode('native-dsp')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    archMode === 'native-dsp'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Native 16-DSP
                </button>
                <button
                  type="button"
                  onClick={() => onChangeArchMode('subhost-vst2')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    archMode === 'subhost-vst2'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  VST2 Sub-Host
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900/8 text-xs">
              <div>
                <div className="text-slate-500">Est. RK3588 CPU</div>
                <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                  {totalCpu.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-slate-500">Loaded Modules</div>
                <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                  {loadedCount} / 16
                </div>
              </div>
            </div>
          </div>
        </div>

        {archMode === 'subhost-vst2' && (
          <div className="mt-4 pt-3 border-t border-slate-900/8 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Experimental <span className="font-mono text-slate-900">dlopen()</span> bridge scans{' '}
              <span className="font-mono text-slate-900">/nvme/VST2 Plugins</span> on a worker thread (skips{' '}
              <span className="font-mono text-slate-900">noexec</span> mounts) and saves sub-plugin state inside{' '}
              <span className="font-mono text-slate-900">STATE_MAX</span>.
            </span>
          </div>
        )}
      </section>

      {/* Chain Presets Dropdown + Quick Slot Configuration Buffer */}
      <section className="glass-panel rounded-2xl p-4 relative z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: 16 Chain Presets Glass Dropdown */}
          <div className="flex-1 max-w-md">
            <GlassSelect
              id="chain-preset-select"
              label="Chain Presets · 16 Studio Configurations"
              value={activePresetId}
              options={presetOptions}
              onChange={(presetId) => onLoadPreset(presetId)}
              placeholder="Custom Rack Configuration"
              menuWidthClass="w-full sm:w-[440px]"
            />
          </div>

          {/* Right: Quick Slot Configuration State Capture & One-Click Restore */}
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={triggerCapture}
                title="Capture current 16-slot layout to temporary buffer (Alt+C)"
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                  justCaptured
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                }`}
              >
                {justCaptured ? (
                  <BookmarkCheck className="w-3.5 h-3.5" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5 text-[#E11D2E]" />
                )}
                <span>{justCaptured ? 'Captured to Buffer' : 'Capture Quick State'}</span>
                <span className="font-mono text-[10px] opacity-65 hidden sm:inline">Alt+C</span>
              </button>

              <button
                type="button"
                disabled={!quickSnapshot}
                onClick={triggerRestore}
                title="Restore captured 16-slot layout from temporary buffer (Alt+R)"
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                  !quickSnapshot
                    ? 'bg-white/50 text-slate-400 border-slate-900/8 cursor-not-allowed'
                    : justRestored
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-900 border-slate-900/16 hover:border-slate-900/35 hover:bg-white'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>
                  {justRestored
                    ? 'Layout Restored'
                    : quickSnapshot
                    ? `Restore Snapshot (${quickSnapshot.activeCount}/16 · ${quickSnapshot.capturedAt})`
                    : 'No Snapshot Buffered'}
                </span>
                {quickSnapshot && (
                  <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">Alt+R</span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-900/10 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        </div>
      </section>

      {/* 16-Slot Matrix Split into Q-Link Bank 1 (1-8) and Q-Link Bank 2 (9-16) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-5">
          {/* Bank 1: Slots 1-8 */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                01. Serial Chain Bank A (Q-Links 1–8)
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">Slots 01 → 08 · Live Level</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slots.slice(0, 8).map(renderSlotTile)}
            </div>
          </div>

          {/* Bank 2: Slots 9-16 */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                02. Serial Chain Bank B (Q-Links 9–16)
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">Slots 09 → 16 · Live Level</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slots.slice(8, 16).map(renderSlotTile)}
            </div>
          </div>
        </div>

        {/* Focused Slot Hardware Inspector */}
        <aside className="xl:col-span-4 glass-panel rounded-2xl p-5 sticky top-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedSlot.index}-${selectedSlot.moduleId}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    Lumina Aerospace · Slot {String(selectedSlot.index + 1).padStart(2, '0')} ·{' '}
                    {selectedSlot.index < 8 ? 'Q-Link Bank 1' : 'Q-Link Bank 2'}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mt-0.5">{selectedSpec.name}</h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={selectedSlot.index === 0}
                    onClick={() => onMoveSlot(selectedSlot.index, -1)}
                    aria-label="Move slot earlier in chain"
                    className="p-2 rounded-lg border border-slate-900/10 bg-white/80 hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    type="button"
                    disabled={selectedSlot.index === 15}
                    onClick={() => onMoveSlot(selectedSlot.index, 1)}
                    aria-label="Move slot later in chain"
                    className="p-2 rounded-lg border border-slate-900/10 bg-white/80 hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-600">{selectedSpec.description}</p>

              {/* Modernized Glass Dropdown Module Selector */}
              <GlassSelect
                id="slot-module-select"
                label="Assigned Processor"
                value={selectedSlot.moduleId}
                options={MODULE_OPTIONS}
                onChange={(modId) => onSwapModule(selectedSlot.index, modId)}
              />

              {/* Tactile Encoders Grid */}
              {selectedSlot.moduleId !== 'empty' ? (
                <div className="pt-2 border-t border-slate-900/8 space-y-5">
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 justify-items-center py-2">
                    {selectedSpec.params.map((param) => {
                      const val = selectedSlot[param.key];
                      const formatted = param.format ? param.format(val) : String(val);
                      return (
                        <TactileKnob
                          key={param.key}
                          label={param.label}
                          value={val}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          defaultValue={param.defaultValue}
                          displayValue={formatted}
                          onChange={(next) => onUpdateSlot(selectedSlot.index, { [param.key]: next })}
                        />
                      );
                    })}
                  </div>

                  {/* Mix & Bypass Row */}
                  <div className="pt-4 border-t border-slate-900/8 flex items-center justify-between gap-4">
                    <TactileKnob
                      label="Wet / Dry"
                      value={selectedSlot.mix}
                      min={0}
                      max={100}
                      step={1}
                      defaultValue={75}
                      displayValue={`${Math.round(selectedSlot.mix)}%`}
                      onChange={(next) => onUpdateSlot(selectedSlot.index, { mix: next })}
                      size="sm"
                      accentColor="#2563EB"
                    />

                    <div className="flex-1 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSlot(selectedSlot.index, { bypassed: !selectedSlot.bypassed })
                        }
                        className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          selectedSlot.bypassed
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {selectedSlot.bypassed ? 'Bypassed (Click to Engage)' : 'Engaged in Signal Path'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwapModule(selectedSlot.index, 'empty')}
                        className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-900/10 transition-colors whitespace-nowrap"
                      >
                        Clear Slot
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-900/8 space-y-3">
                  <div className="text-xs font-medium text-slate-600">Quick Insert</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ladder-filter', 'tape-saturator', 'bbd-delay', 'shimmer-hall', 'vca-comp', 'wavefolder'] as DspModuleId[]).map(
                      (id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onSwapModule(selectedSlot.index, id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/85 hover:bg-white border border-slate-900/10 text-slate-800 transition-colors text-left"
                        >
                          <Sparkles className="w-3 h-3 text-[#E11D2E] shrink-0" />
                          <span className="truncate">{DSP_MODULES[id].shortName}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
};
