import React from 'react';
import { motion } from 'motion/react';
import { Cable, Download, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { MPC_LIVE_III_CONTROLS, targetValueToCc } from '../data/midiCatalog';
import { MidiMappingBinding } from '../types/mpc';
import { TactileSlider } from './TactileSlider';

interface MidiMappingOverlayPanelProps {
  bindings: MidiMappingBinding[];
  liveCcMap: Record<number, number>;
  getCurrentTargetValue: (binding: MidiMappingBinding) => number;
  webMidiSupported: boolean;
  webMidiConnected: boolean;
  midiDeviceNames: string[];
  onConnectWebMidi: () => void;
  onSimulateControlCc: (cc: number, value: number) => void;
  onToggleInvert: (targetId: string) => void;
  onUnbind: (targetId: string) => void;
  onLoadStudioTemplate: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const MidiMappingOverlayPanel: React.FC<MidiMappingOverlayPanelProps> = ({
  bindings,
  liveCcMap,
  getCurrentTargetValue,
  webMidiSupported,
  webMidiConnected,
  midiDeviceNames,
  onConnectWebMidi,
  onSimulateControlCc,
  onToggleInvert,
  onUnbind,
  onLoadStudioTemplate,
  onClearAll,
  onClose,
}) => {
  const qlinkControls = MPC_LIVE_III_CONTROLS.filter((c) => c.group.startsWith('Q-Link'));
  const perfControls = MPC_LIVE_III_CONTROLS.filter((c) => c.group === 'Performance & Strip');

  const handleExportMap = () => {
    const payload = {
      format: 'lumina-hexaslot-mpc-live-iii-midimap',
      version: 1,
      device: 'Akai MPC Live III',
      mappings: bindings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mpc-live-iii-hexaslot.midimap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-2xl p-5 border border-[#E11D2E]/30 space-y-4"
    >
      {/* Overlay Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-900/8">
        <div>
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#E11D2E]">Active Mapping Overlay</span>
            <span aria-hidden="true">·</span>
            <span>{bindings.length} connected parameters</span>
            <span aria-hidden="true">·</span>
            <span>Click or right-click any highlighted control below to bind</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">
            MPC Live III Hardware Surface &amp; Connected Parameters
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onConnectWebMidi}
            disabled={!webMidiSupported}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              webMidiConnected
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-900/12 text-slate-800 hover:bg-slate-50 disabled:opacity-45'
            }`}
          >
            <Cable className="w-3.5 h-3.5 text-[#E11D2E]" />
            {!webMidiSupported
              ? 'Web MIDI Unavailable'
              : webMidiConnected
              ? midiDeviceNames.length > 0
                ? `${midiDeviceNames[0]}`
                : 'Web MIDI Armed'
              : 'Connect MPC (Web MIDI)'}
          </button>

          <button
            type="button"
            onClick={onLoadStudioTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-900/12 text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E11D2E]" />
            Studio Q-Link Map
          </button>

          <button
            type="button"
            onClick={handleExportMap}
            disabled={bindings.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-900/12 text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export Map
          </button>

          {bindings.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#E11D2E] hover:bg-[#E11D2E]/10 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-900/8 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Close Active Mapping Overlay"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Hardware Surface Matrix + Connected Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: MPC Live III Surface Layout (Touch Strip + 16 Q-Link Matrix) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">MPC Live III Q-Link &amp; Touch Strip Matrix</span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {qlinkControls.filter((c) => bindings.some((b) => b.controlId === c.id)).length}/16 Q-Links active
            </span>
          </div>

          <div className="grid grid-cols-12 gap-2.5">
            {/* Left Vertical Touch Strip (authentic MPC Live III ribbon) */}
            <div className="col-span-2 tactile-well rounded-xl p-2 flex flex-col justify-between items-center border border-white/10 min-h-[196px]">
              <span className="font-mono text-[9px] text-slate-400">STRIP</span>
              <div className="flex-1 w-2 my-2 rounded-full bg-white/10 relative overflow-hidden flex flex-col justify-end">
                {(() => {
                  const stripBinding = bindings.find((b) => b.cc === 1);
                  const ccVal =
                    liveCcMap[1] ??
                    (stripBinding ? targetValueToCc(stripBinding, getCurrentTargetValue(stripBinding)) : 0);
                  return (
                    <div
                      className="w-full rounded-full bg-[#E11D2E] transition-[height] duration-75"
                      style={{ height: `${Math.round((ccVal / 127) * 100)}%` }}
                    />
                  );
                })()}
              </div>
              <div className="text-center">
                <div className="font-mono text-[9px] text-white font-semibold">CC 1</div>
                <div className="text-[9px] text-slate-400 truncate max-w-[52px]">
                  {bindings.find((b) => b.cc === 1)?.targetLabel.split(' · ').pop() ?? 'Free'}
                </div>
              </div>
            </div>

            {/* 4x4 Q-Link Banks A–D */}
            <div className="col-span-10 grid grid-cols-4 gap-2">
              {qlinkControls.map((ctrl) => {
                const connected = bindings.filter((b) => b.controlId === ctrl.id);
                const isBound = connected.length > 0;
                const ccVal =
                  liveCcMap[ctrl.cc] ??
                  (isBound ? targetValueToCc(connected[0], getCurrentTargetValue(connected[0])) : 0);

                return (
                  <div
                    key={ctrl.id}
                    className={`rounded-xl p-2 border transition-colors ${
                      isBound
                        ? 'tactile-well text-white border-[#E11D2E]/80'
                        : 'bg-white/70 text-slate-600 border-slate-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-semibold">{ctrl.shortLabel}</span>
                      <span
                        className={`font-mono text-[9px] tabular-nums ${
                          isBound ? 'text-[#E11D2E]' : 'text-slate-400'
                        }`}
                      >
                        CC{ctrl.cc}
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-1 truncate ${
                        isBound ? 'text-slate-200 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {isBound
                        ? connected.length === 1
                          ? connected[0].targetLabel.split(' · ').pop()
                          : `${connected.length} targets`
                        : 'Unbound'}
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-slate-500/20 overflow-hidden">
                      <div
                        className={`h-full transition-[width] duration-75 ${
                          isBound ? 'bg-[#E11D2E]' : 'bg-transparent'
                        }`}
                        style={{ width: `${Math.round((ccVal / 127) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance & Expression Controls strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {perfControls.map((ctrl) => {
              const connected = bindings.filter((b) => b.controlId === ctrl.id);
              const isBound = connected.length > 0;
              return (
                <div
                  key={ctrl.id}
                  className={`rounded-lg px-2 py-1.5 border text-center ${
                    isBound
                      ? 'bg-[#E11D2E]/10 border-[#E11D2E]/40 text-slate-900'
                      : 'bg-white/60 border-slate-900/8 text-slate-500'
                  }`}
                >
                  <div className="font-mono text-[9px] font-semibold">{ctrl.shortLabel}</div>
                  <div className="text-[9px] truncate">
                    {isBound ? connected[0].targetLabel.split(' · ').pop() : `CC${ctrl.cc}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Connected Parameters Inspector & Real-Time Hardware Test Sliders */}
        <div className="lg:col-span-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">Connected Parameters</span>
            <span className="text-[11px] text-slate-500">
              Drag CC fader to test hardware sweep
            </span>
          </div>

          {bindings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-900/15 bg-white/60 p-6 text-center space-y-2">
              <div className="text-sm font-medium text-slate-900">No MPC Live III parameters bound yet</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Right-click any Synth knob, oscillator, or Euclidean Sequencer lane control—or click any
                highlighted control while this overlay is open—to bind it to a Q-Link encoder or Touch Strip.
              </p>
              <button
                type="button"
                onClick={onLoadStudioTemplate}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E11D2E]" />
                Load Studio Q-Link Template
              </button>
            </div>
          ) : (
            <div className="max-h-[258px] overflow-y-auto pr-1 space-y-2">
              {bindings.map((binding) => {
                const liveVal =
                  liveCcMap[binding.cc] ??
                  targetValueToCc(binding, getCurrentTargetValue(binding));

                return (
                  <div
                    key={binding.targetId}
                    className="rounded-xl bg-white/85 border border-slate-900/10 p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-semibold shrink-0">
                          {binding.controlLabel} · CC{binding.cc}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {binding.targetLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[10px] text-slate-500">
                          {binding.channel === 0 ? 'Omni' : `Ch ${binding.channel}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleInvert(binding.targetId)}
                          title="Invert CC polarity"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            binding.inverted
                              ? 'bg-[#E11D2E] text-white'
                              : 'bg-slate-900/6 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <RefreshCw className="w-2.5 h-2.5 inline mr-0.5" />
                          {binding.inverted ? 'Inv' : 'Norm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onUnbind(binding.targetId)}
                          title="Remove binding"
                          className="p-1 rounded hover:bg-[#E11D2E]/10 text-slate-500 hover:text-[#E11D2E] transition-colors"
                          aria-label={`Unbind ${binding.targetLabel}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <TactileSlider
                      label={`Hardware Input · ${binding.controlLabel}`}
                      value={liveVal}
                      min={0}
                      max={127}
                      step={1}
                      displayValue={`CC ${liveVal}`}
                      onChange={(ccVal) => onSimulateControlCc(binding.cc, ccVal)}
                      accent="red"
                      compact
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};
