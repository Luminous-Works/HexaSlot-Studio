import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Cable, Play, Sliders, Square, Volume2, VolumeX } from 'lucide-react';
import { computeEuclideanPattern, SCALE_INTERVALS, SYNTH_PRESETS } from '../data/dspCatalog';
import {
  buildLaneMidiTarget,
  ROOT_DISCRETE,
  SCALE_DISCRETE,
  SEQUENCER_MIDI_TARGETS,
  SYNTH_MIDI_TARGETS,
  WAVE_DISCRETE,
} from '../data/midiCatalog';
import {
  EuclideanLane,
  MidiControlSpec,
  MidiMappingBinding,
  MidiTargetDescriptor,
  MusicalScaleId,
  OscillatorWave,
  SequencerConfig,
  SynthParams,
} from '../types/mpc';
import { TactileKnob } from './TactileKnob';
import { TactileSlider } from './TactileSlider';
import { GlassSelect, GlassSelectOption } from './GlassSelect';
import { MappableControl } from './MappableControl';
import { MidiBindPopover } from './MidiBindPopover';
import { MidiMappingOverlayPanel } from './MidiMappingOverlayPanel';

interface SynthSequencerViewProps {
  synth: SynthParams;
  activeSynthPresetId: string;
  onSelectSynthPreset: (presetId: string) => void;
  onUpdateSynth: (patch: Partial<SynthParams>) => void;
  sequencer: SequencerConfig;
  onUpdateSequencer: (patch: Partial<SequencerConfig>) => void;
  onUpdateLane: (laneId: string, patch: Partial<EuclideanLane>) => void;
  sequencerPlaying: boolean;
  onToggleSequencer: () => void;
  activeStep: number;
  onTriggerPad: (midi: number, velocity?: number) => void;
  midiMappings: MidiMappingBinding[];
  liveCcMap: Record<number, number>;
  webMidiSupported: boolean;
  webMidiConnected: boolean;
  midiDeviceNames: string[];
  learningTarget: MidiTargetDescriptor | null;
  onSetLearningTarget: (target: MidiTargetDescriptor | null) => void;
  onConnectWebMidi: () => void;
  onBindMidi: (
    target: MidiTargetDescriptor,
    control: MidiControlSpec,
    channel: number,
    inverted: boolean
  ) => void;
  onUnbindMidi: (targetId: string) => void;
  onToggleMidiInvert: (targetId: string) => void;
  onSimulateControlCc: (cc: number, value: number) => void;
  onLoadStudioMidiTemplate: () => void;
  onClearAllMidiMappings: () => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PAD_KEYS = ['1', '2', '3', '4', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];
const LANE_COLORS = ['#0F172A', '#E11D2E', '#2563EB', '#64748B'];

function midiToName(midi: number): string {
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

const SCALE_OPTIONS: Array<GlassSelectOption<MusicalScaleId>> = [
  { value: 'dorian', label: 'Dorian', meta: '7-note minor mode' },
  { value: 'minor-pentatonic', label: 'Minor Pentatonic', meta: '5-note classic' },
  { value: 'phrygian', label: 'Phrygian', meta: 'Dark Spanish minor' },
  { value: 'whole-tone', label: 'Whole Tone', meta: 'Symmetric ambient' },
  { value: 'chromatic', label: 'Chromatic', meta: 'All 12 semitones' },
];

const ROOT_OPTIONS: Array<GlassSelectOption<number>> = [36, 38, 41, 43, 45, 48, 50, 53, 55, 57].map((m) => ({
  value: m,
  label: midiToName(m),
  meta: `MIDI ${m}`,
}));

const WAVE_OPTIONS: Array<GlassSelectOption<OscillatorWave>> = [
  { value: 'sawtooth', label: 'Sawtooth', meta: 'Harmonic-rich' },
  { value: 'square', label: 'Pulse / Square', meta: 'Hollow odd-order' },
  { value: 'triangle', label: 'Triangle', meta: 'Warm soft-clipped' },
  { value: 'sine', label: 'Sine', meta: 'Pure fundamental' },
];

export const SynthSequencerView: React.FC<SynthSequencerViewProps> = ({
  synth,
  activeSynthPresetId,
  onSelectSynthPreset,
  onUpdateSynth,
  sequencer,
  onUpdateSequencer,
  onUpdateLane,
  sequencerPlaying,
  onToggleSequencer,
  activeStep,
  onTriggerPad,
  midiMappings,
  liveCcMap,
  webMidiSupported,
  webMidiConnected,
  midiDeviceNames,
  learningTarget,
  onSetLearningTarget,
  onConnectWebMidi,
  onBindMidi,
  onUnbindMidi,
  onToggleMidiInvert,
  onSimulateControlCc,
  onLoadStudioMidiTemplate,
  onClearAllMidiMappings,
}) => {
  const [pressedPad, setPressedPad] = useState<number | null>(null);
  const [mappingOverlayActive, setMappingOverlayActive] = useState(false);
  const [popoverTarget, setPopoverTarget] = useState<MidiTargetDescriptor | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  const bindingByTargetId = useMemo(() => {
    const map = new Map<string, MidiMappingBinding>();
    for (const m of midiMappings) {
      map.set(m.targetId, m);
    }
    return map;
  }, [midiMappings]);

  const handleOpenBindMenu = useCallback(
    (target: MidiTargetDescriptor, clientX: number, clientY: number) => {
      setPopoverTarget(target);
      setPopoverPos({ x: clientX, y: clientY });
    },
    []
  );

  const handleClosePopover = useCallback(() => {
    setPopoverTarget(null);
    setPopoverPos(null);
    onSetLearningTarget(null);
  }, [onSetLearningTarget]);

  const handleToggleLearnFromPopover = useCallback(
    (targetId: string | null) => {
      if (!targetId || !popoverTarget) {
        onSetLearningTarget(null);
        return;
      }
      if (webMidiSupported && !webMidiConnected) {
        onConnectWebMidi();
      }
      onSetLearningTarget(popoverTarget);
    },
    [popoverTarget, webMidiSupported, webMidiConnected, onConnectWebMidi, onSetLearningTarget]
  );

  const getCurrentTargetValue = useCallback(
    (binding: MidiMappingBinding): number => {
      if (binding.targetKind === 'synth') {
        if (binding.paramKey === 'osc1Wave') return WAVE_DISCRETE.indexOf(synth.osc1Wave);
        if (binding.paramKey === 'osc2Wave') return WAVE_DISCRETE.indexOf(synth.osc2Wave);
        return Number((synth as unknown as Record<string, number>)[binding.paramKey] ?? binding.min);
      }
      if (binding.targetKind === 'sequencer') {
        if (binding.paramKey === 'scale') return SCALE_DISCRETE.indexOf(sequencer.scale);
        if (binding.paramKey === 'rootMidi') return ROOT_DISCRETE.indexOf(sequencer.rootMidi);
        return Number((sequencer as unknown as Record<string, number>)[binding.paramKey] ?? binding.min);
      }
      if (binding.targetKind === 'lane' && binding.laneId) {
        const lane = sequencer.lanes.find((l) => l.id === binding.laneId);
        if (!lane) return binding.min;
        if (binding.paramKey === 'muted') return lane.muted ? 1 : 0;
        return Number((lane as unknown as Record<string, number>)[binding.paramKey] ?? binding.min);
      }
      return binding.min;
    },
    [synth, sequencer]
  );

  const synthPresetOptions = useMemo<Array<GlassSelectOption<string>>>(
    () =>
      SYNTH_PRESETS.map((p) => ({
        value: p.id,
        label: p.name,
        meta: `${p.category} · ${p.summary}`,
      })),
    []
  );

  const scaleIntervals = SCALE_INTERVALS[sequencer.scale];
  const padNotes = Array.from({ length: 16 }, (_, idx) => {
    const oct = Math.floor(idx / scaleIntervals.length);
    const interval = scaleIntervals[idx % scaleIntervals.length];
    return sequencer.rootMidi + oct * 12 + interval;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMappingOverlayActive((v) => !v);
        return;
      }
      const keyIdx = PAD_KEYS.indexOf(e.key.toUpperCase());
      if (keyIdx !== -1 && !e.repeat) {
        setPressedPad(keyIdx);
        onTriggerPad(padNotes[keyIdx], 0.9);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const keyIdx = PAD_KEYS.indexOf(e.key.toUpperCase());
      if (keyIdx !== -1) {
        setPressedPad((prev) => (prev === keyIdx ? null : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [padNotes, onTriggerPad]);

  return (
    <div className="space-y-5">
      {/* MPC Live III MIDI Mapping Strip */}
      <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">MPC Live III MIDI Mapping</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-700">
            {midiMappings.length} connected
          </span>
          <span aria-hidden="true">·</span>
          <span>Right-click any synth parameter or sequencer lane control to bind</span>
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
                ? midiDeviceNames[0]
                : 'Web MIDI Ready'
              : 'Connect MPC Hardware'}
          </button>

          <button
            type="button"
            onClick={() => setMappingOverlayActive((v) => !v)}
            title="Toggle Active Mapping Overlay (Alt+M)"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mappingOverlayActive
                ? 'bg-[#E11D2E] text-white hover:bg-[#C81827]'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {mappingOverlayActive
              ? `Active Mapping Overlay · On (${midiMappings.length})`
              : `Active Mapping Overlay (${midiMappings.length})`}
          </button>
        </div>
      </div>

      {/* Collapsible Active Mapping Overlay Surface & Connected Parameters Panel */}
      <AnimatePresence>
        {mappingOverlayActive && (
          <MidiMappingOverlayPanel
            bindings={midiMappings}
            liveCcMap={liveCcMap}
            getCurrentTargetValue={getCurrentTargetValue}
            webMidiSupported={webMidiSupported}
            webMidiConnected={webMidiConnected}
            midiDeviceNames={midiDeviceNames}
            onConnectWebMidi={onConnectWebMidi}
            onSimulateControlCc={onSimulateControlCc}
            onToggleInvert={onToggleMidiInvert}
            onUnbind={onUnbindMidi}
            onLoadStudioTemplate={onLoadStudioMidiTemplate}
            onClearAll={onClearAllMidiMappings}
            onClose={() => setMappingOverlayActive(false)}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: 4-Lane Euclidean Generative Sequencer + Geometric Ring */}
        <section className="xl:col-span-7 glass-panel rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">
                Lumina Aerospace · Polyrhythmic Pattern Engine feeding 16-Slot Chain
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                Generative Euclidean Sequencer
              </h2>
            </div>

            <button
              type="button"
              onClick={onToggleSequencer}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                sequencerPlaying
                  ? 'bg-[#E11D2E] text-white hover:bg-[#C81827]'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {sequencerPlaying ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {sequencerPlaying ? 'Stop Sequence' : 'Run Sequence'}
            </button>
          </div>

          {/* Global Clock & Quantizer Controls (Custom Tactile Sliders + GlassSelects) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-900/8 items-end">
            <MappableControl
              target={SEQUENCER_MIDI_TARGETS['seq.bpm']}
              binding={bindingByTargetId.get('seq.bpm')}
              overlayActive={mappingOverlayActive}
              isLearning={learningTarget?.id === 'seq.bpm'}
              liveCcValue={
                bindingByTargetId.get('seq.bpm')
                  ? liveCcMap[bindingByTargetId.get('seq.bpm')!.cc]
                  : undefined
              }
              onOpenBind={handleOpenBindMenu}
              onUnbind={onUnbindMidi}
            >
              <TactileSlider
                label="Tempo"
                value={sequencer.bpm}
                min={60}
                max={180}
                step={1}
                defaultValue={118}
                displayValue={`${sequencer.bpm} BPM`}
                onChange={(bpm) => onUpdateSequencer({ bpm })}
                accent="obsidian"
              />
            </MappableControl>

            <MappableControl
              target={SEQUENCER_MIDI_TARGETS['seq.swing']}
              binding={bindingByTargetId.get('seq.swing')}
              overlayActive={mappingOverlayActive}
              isLearning={learningTarget?.id === 'seq.swing'}
              liveCcValue={
                bindingByTargetId.get('seq.swing')
                  ? liveCcMap[bindingByTargetId.get('seq.swing')!.cc]
                  : undefined
              }
              onOpenBind={handleOpenBindMenu}
              onUnbind={onUnbindMidi}
            >
              <TactileSlider
                label="MPC Swing"
                value={sequencer.swing}
                min={0}
                max={55}
                step={1}
                defaultValue={12}
                displayValue={`${sequencer.swing}%`}
                onChange={(swing) => onUpdateSequencer({ swing })}
                accent="red"
              />
            </MappableControl>

            <MappableControl
              target={SEQUENCER_MIDI_TARGETS['seq.scale']}
              binding={bindingByTargetId.get('seq.scale')}
              overlayActive={mappingOverlayActive}
              isLearning={learningTarget?.id === 'seq.scale'}
              liveCcValue={
                bindingByTargetId.get('seq.scale')
                  ? liveCcMap[bindingByTargetId.get('seq.scale')!.cc]
                  : undefined
              }
              onOpenBind={handleOpenBindMenu}
              onUnbind={onUnbindMidi}
            >
              <GlassSelect
                id="seq-scale"
                label="Scale Quantizer"
                value={sequencer.scale}
                options={SCALE_OPTIONS}
                onChange={(scale) => onUpdateSequencer({ scale })}
                compact
              />
            </MappableControl>

            <MappableControl
              target={SEQUENCER_MIDI_TARGETS['seq.rootMidi']}
              binding={bindingByTargetId.get('seq.rootMidi')}
              overlayActive={mappingOverlayActive}
              isLearning={learningTarget?.id === 'seq.rootMidi'}
              liveCcValue={
                bindingByTargetId.get('seq.rootMidi')
                  ? liveCcMap[bindingByTargetId.get('seq.rootMidi')!.cc]
                  : undefined
              }
              onOpenBind={handleOpenBindMenu}
              onUnbind={onUnbindMidi}
            >
              <GlassSelect
                id="seq-root"
                label="Root Pitch"
                value={sequencer.rootMidi}
                options={ROOT_OPTIONS}
                onChange={(rootMidi) => onUpdateSequencer({ rootMidi })}
                compact
              />
            </MappableControl>
          </div>

          {/* Euclidean Ring SVG + 4 Lane Parameter Rows */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2">
            {/* Concentric Euclidean Geometry Wheel */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <svg viewBox="0 0 240 240" className="w-full max-w-[230px] aspect-square">
                <circle cx="120" cy="120" r="106" fill="rgba(255,255,255,0.65)" stroke="rgba(15,23,42,0.08)" />
                {sequencer.lanes.map((lane, laneIdx) => {
                  const r = 94 - laneIdx * 20;
                  const pattern = computeEuclideanPattern(lane.steps, lane.pulses, lane.rotation);
                  const activeIdx = activeStep >= 0 ? activeStep % lane.steps : -1;
                  const color = LANE_COLORS[laneIdx % LANE_COLORS.length];

                  const activePoints: string[] = [];
                  pattern.forEach((hit, sIdx) => {
                    if (!hit) return;
                    const a = (sIdx / lane.steps) * Math.PI * 2 - Math.PI / 2;
                    activePoints.push(`${(120 + Math.cos(a) * r).toFixed(1)},${(120 + Math.sin(a) * r).toFixed(1)}`);
                  });

                  return (
                    <g key={lane.id} opacity={lane.muted ? 0.25 : 1}>
                      <circle cx="120" cy="120" r={r} fill="none" stroke="rgba(15,23,42,0.1)" strokeWidth="1" />
                      {activePoints.length >= 2 && (
                        <polygon
                          points={activePoints.join(' ')}
                          fill="none"
                          stroke={color}
                          strokeOpacity={0.35}
                          strokeWidth="1.4"
                        />
                      )}
                      {pattern.map((hit, sIdx) => {
                        const a = (sIdx / lane.steps) * Math.PI * 2 - Math.PI / 2;
                        const x = 120 + Math.cos(a) * r;
                        const y = 120 + Math.sin(a) * r;
                        const isHead = sIdx === activeIdx;
                        return (
                          <circle
                            key={sIdx}
                            cx={x}
                            cy={y}
                            r={isHead ? 5.2 : hit ? 3.8 : 2}
                            fill={isHead ? '#E11D2E' : hit ? color : 'rgba(15,23,42,0.18)'}
                          />
                        );
                      })}
                    </g>
                  );
                })}
                <text
                  x="120"
                  y="117"
                  textAnchor="middle"
                  className="fill-slate-900 font-mono text-[12px] font-semibold"
                >
                  {activeStep >= 0 ? `STEP ${String(activeStep + 1).padStart(2, '0')}` : 'IDLE'}
                </text>
                <text x="120" y="133" textAnchor="middle" className="fill-slate-500 text-[10px]">
                  {sequencer.bpm} BPM
                </text>
              </svg>
            </div>

            {/* 4 Euclidean Lanes */}
            <div className="md:col-span-7 space-y-3">
              {sequencer.lanes.map((lane, laneIdx) => {
                const pattern = computeEuclideanPattern(lane.steps, lane.pulses, lane.rotation);
                const lanePlayhead = activeStep >= 0 ? activeStep % lane.steps : -1;

                const stepsTarget = buildLaneMidiTarget(lane, 'steps');
                const pulsesTarget = buildLaneMidiTarget(lane, 'pulses');
                const rotTarget = buildLaneMidiTarget(lane, 'rotation');
                const probTarget = buildLaneMidiTarget(lane, 'probability');
                const muteTarget = buildLaneMidiTarget(lane, 'muted');

                return (
                  <div
                    key={lane.id}
                    className={`rounded-xl p-3 border transition-colors ${
                      lane.muted ? 'bg-white/40 border-slate-900/8 opacity-75' : 'bg-white/85 border-slate-900/12'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: LANE_COLORS[laneIdx % LANE_COLORS.length] }}
                        />
                        <span className="text-xs font-semibold text-slate-900">{lane.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {lane.pulses}/{lane.steps} · {lane.probability}%
                        </span>
                      </div>

                      <MappableControl
                        target={muteTarget}
                        binding={bindingByTargetId.get(muteTarget.id)}
                        overlayActive={mappingOverlayActive}
                        isLearning={learningTarget?.id === muteTarget.id}
                        liveCcValue={
                          bindingByTargetId.get(muteTarget.id)
                            ? liveCcMap[bindingByTargetId.get(muteTarget.id)!.cc]
                            : undefined
                        }
                        onOpenBind={handleOpenBindMenu}
                        onUnbind={onUnbindMidi}
                        compactBadge
                      >
                        <button
                          type="button"
                          onClick={() => onUpdateLane(lane.id, { muted: !lane.muted })}
                          className="p-1.5 rounded-md hover:bg-slate-900/5 text-slate-600"
                          aria-label={lane.muted ? `Unmute ${lane.name}` : `Mute ${lane.name}`}
                          title="Click to mute · Right-click to MIDI map"
                        >
                          {lane.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </MappableControl>
                    </div>

                    {/* Step strip */}
                    <div className="grid grid-cols-16 gap-1 mb-2.5">
                      {Array.from({ length: 16 }, (_, idx) => {
                        const inRange = idx < lane.steps;
                        const hit = inRange && pattern[idx];
                        const isPlayhead = inRange && idx === lanePlayhead;
                        return (
                          <div
                            key={idx}
                            className={`h-3 rounded-sm transition-transform ${
                              !inRange
                                ? 'bg-slate-900/5 opacity-30'
                                : isPlayhead
                                ? 'bg-[#E11D2E] scale-y-125'
                                : hit
                                ? 'bg-slate-900'
                                : 'bg-slate-900/12'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Mappable Tactile Sliders */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MappableControl
                        target={stepsTarget}
                        binding={bindingByTargetId.get(stepsTarget.id)}
                        overlayActive={mappingOverlayActive}
                        isLearning={learningTarget?.id === stepsTarget.id}
                        liveCcValue={
                          bindingByTargetId.get(stepsTarget.id)
                            ? liveCcMap[bindingByTargetId.get(stepsTarget.id)!.cc]
                            : undefined
                        }
                        onOpenBind={handleOpenBindMenu}
                        onUnbind={onUnbindMidi}
                        compactBadge
                      >
                        <TactileSlider
                          label="Steps"
                          value={lane.steps}
                          min={2}
                          max={16}
                          step={1}
                          defaultValue={16}
                          displayValue={String(lane.steps)}
                          onChange={(nextSteps) =>
                            onUpdateLane(lane.id, {
                              steps: nextSteps,
                              pulses: Math.min(lane.pulses, nextSteps),
                            })
                          }
                          accent="obsidian"
                          compact
                        />
                      </MappableControl>

                      <MappableControl
                        target={pulsesTarget}
                        binding={bindingByTargetId.get(pulsesTarget.id)}
                        overlayActive={mappingOverlayActive}
                        isLearning={learningTarget?.id === pulsesTarget.id}
                        liveCcValue={
                          bindingByTargetId.get(pulsesTarget.id)
                            ? liveCcMap[bindingByTargetId.get(pulsesTarget.id)!.cc]
                            : undefined
                        }
                        onOpenBind={handleOpenBindMenu}
                        onUnbind={onUnbindMidi}
                        compactBadge
                      >
                        <TactileSlider
                          label="Pulses"
                          value={lane.pulses}
                          min={0}
                          max={lane.steps}
                          step={1}
                          defaultValue={4}
                          displayValue={String(lane.pulses)}
                          onChange={(pulses) => onUpdateLane(lane.id, { pulses })}
                          accent="red"
                          compact
                        />
                      </MappableControl>

                      <MappableControl
                        target={rotTarget}
                        binding={bindingByTargetId.get(rotTarget.id)}
                        overlayActive={mappingOverlayActive}
                        isLearning={learningTarget?.id === rotTarget.id}
                        liveCcValue={
                          bindingByTargetId.get(rotTarget.id)
                            ? liveCcMap[bindingByTargetId.get(rotTarget.id)!.cc]
                            : undefined
                        }
                        onOpenBind={handleOpenBindMenu}
                        onUnbind={onUnbindMidi}
                        compactBadge
                      >
                        <TactileSlider
                          label="Rotate"
                          value={lane.rotation}
                          min={0}
                          max={15}
                          step={1}
                          defaultValue={0}
                          displayValue={String(lane.rotation)}
                          onChange={(rotation) => onUpdateLane(lane.id, { rotation })}
                          accent="obsidian"
                          compact
                        />
                      </MappableControl>

                      <MappableControl
                        target={probTarget}
                        binding={bindingByTargetId.get(probTarget.id)}
                        overlayActive={mappingOverlayActive}
                        isLearning={learningTarget?.id === probTarget.id}
                        liveCcValue={
                          bindingByTargetId.get(probTarget.id)
                            ? liveCcMap[bindingByTargetId.get(probTarget.id)!.cc]
                            : undefined
                        }
                        onOpenBind={handleOpenBindMenu}
                        onUnbind={onUnbindMidi}
                        compactBadge
                      >
                        <TactileSlider
                          label="Prob"
                          value={lane.probability}
                          min={10}
                          max={100}
                          step={1}
                          defaultValue={100}
                          displayValue={`${lane.probability}%`}
                          onChange={(probability) => onUpdateLane(lane.id, { probability })}
                          accent="blue"
                          compact
                        />
                      </MappableControl>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-900/8 text-xs text-slate-600 leading-relaxed">
            <strong className="font-semibold text-slate-900">MPC OS 3.10.1+ MIDI Routing Note:</strong>{' '}
            MPC&apos;s built-in JUCE host ignores MIDI output from VST2 plugins. Generative sequencers
            on Open MPC open an independent <span className="font-mono text-slate-900">ALSA Virtual MIDI</span>{' '}
            port so any MPC synth or drum track can select it as MIDI Input under{' '}
            <span className="font-mono text-slate-900">Preferences → MIDI</span>.
          </div>
        </section>

        {/* Right: Real-Time Synth Prototype + Synth Presets + 16 Tactile MPC Pads */}
        <section className="xl:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-5 space-y-5 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-500">Lumina Aerospace · Dual-Osc + Sub + Filter</div>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                  Real-Time Synth Engine
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">SAMPLE_ACCURATE=1</span>
            </div>

            {/* Synth Presets Glass Dropdown */}
            <GlassSelect
              id="synth-preset-select"
              label="Synth Presets · 18 Studio Patches"
              value={activeSynthPresetId}
              options={synthPresetOptions}
              onChange={onSelectSynthPreset}
              placeholder="Custom Synth Patch"
              compact
            />

            {/* Modernized Glass Dropdown Oscillator Selectors (Right-Click Mappable) */}
            <div className="grid grid-cols-2 gap-3">
              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.osc1Wave']}
                binding={bindingByTargetId.get('synth.osc1Wave')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.osc1Wave'}
                liveCcValue={
                  bindingByTargetId.get('synth.osc1Wave')
                    ? liveCcMap[bindingByTargetId.get('synth.osc1Wave')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
              >
                <GlassSelect
                  id="osc1-wave"
                  label="Oscillator 1"
                  value={synth.osc1Wave}
                  options={WAVE_OPTIONS}
                  onChange={(osc1Wave) => onUpdateSynth({ osc1Wave })}
                  compact
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.osc2Wave']}
                binding={bindingByTargetId.get('synth.osc2Wave')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.osc2Wave'}
                liveCcValue={
                  bindingByTargetId.get('synth.osc2Wave')
                    ? liveCcMap[bindingByTargetId.get('synth.osc2Wave')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
              >
                <GlassSelect
                  id="osc2-wave"
                  label="Oscillator 2"
                  value={synth.osc2Wave}
                  options={WAVE_OPTIONS}
                  onChange={(osc2Wave) => onUpdateSynth({ osc2Wave })}
                  compact
                />
              </MappableControl>
            </div>

            {/* Mappable Tactile Encoders */}
            <div className="grid grid-cols-4 gap-y-5 gap-x-2 justify-items-center pt-2 border-t border-slate-900/8">
              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.cutoffHz']}
                binding={bindingByTargetId.get('synth.cutoffHz')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.cutoffHz'}
                liveCcValue={
                  bindingByTargetId.get('synth.cutoffHz')
                    ? liveCcMap[bindingByTargetId.get('synth.cutoffHz')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Cutoff"
                  value={synth.cutoffHz}
                  min={90}
                  max={12000}
                  step={20}
                  defaultValue={2600}
                  displayValue={`${Math.round(synth.cutoffHz)} Hz`}
                  onChange={(v) => onUpdateSynth({ cutoffHz: v })}
                  size="sm"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.resonance']}
                binding={bindingByTargetId.get('synth.resonance')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.resonance'}
                liveCcValue={
                  bindingByTargetId.get('synth.resonance')
                    ? liveCcMap[bindingByTargetId.get('synth.resonance')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Resonance"
                  value={synth.resonance}
                  min={0.5}
                  max={16}
                  step={0.1}
                  defaultValue={4.2}
                  displayValue={synth.resonance.toFixed(1)}
                  onChange={(v) => onUpdateSynth({ resonance: v })}
                  size="sm"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.osc2DetuneCents']}
                binding={bindingByTargetId.get('synth.osc2DetuneCents')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.osc2DetuneCents'}
                liveCcValue={
                  bindingByTargetId.get('synth.osc2DetuneCents')
                    ? liveCcMap[bindingByTargetId.get('synth.osc2DetuneCents')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Detune"
                  value={synth.osc2DetuneCents}
                  min={-40}
                  max={40}
                  step={1}
                  defaultValue={11}
                  displayValue={`${synth.osc2DetuneCents} ct`}
                  onChange={(v) => onUpdateSynth({ osc2DetuneCents: v })}
                  size="sm"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.subLevel']}
                binding={bindingByTargetId.get('synth.subLevel')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.subLevel'}
                liveCcValue={
                  bindingByTargetId.get('synth.subLevel')
                    ? liveCcMap[bindingByTargetId.get('synth.subLevel')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Sub Osc"
                  value={synth.subLevel}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={38}
                  displayValue={`${Math.round(synth.subLevel)}%`}
                  onChange={(v) => onUpdateSynth({ subLevel: v })}
                  size="sm"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.attackMs']}
                binding={bindingByTargetId.get('synth.attackMs')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.attackMs'}
                liveCcValue={
                  bindingByTargetId.get('synth.attackMs')
                    ? liveCcMap[bindingByTargetId.get('synth.attackMs')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Attack"
                  value={synth.attackMs}
                  min={2}
                  max={400}
                  step={1}
                  defaultValue={8}
                  displayValue={`${Math.round(synth.attackMs)} ms`}
                  onChange={(v) => onUpdateSynth({ attackMs: v })}
                  size="sm"
                  accentColor="#2563EB"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.decayMs']}
                binding={bindingByTargetId.get('synth.decayMs')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.decayMs'}
                liveCcValue={
                  bindingByTargetId.get('synth.decayMs')
                    ? liveCcMap[bindingByTargetId.get('synth.decayMs')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Decay"
                  value={synth.decayMs}
                  min={30}
                  max={1200}
                  step={5}
                  defaultValue={260}
                  displayValue={`${Math.round(synth.decayMs)} ms`}
                  onChange={(v) => onUpdateSynth({ decayMs: v })}
                  size="sm"
                  accentColor="#2563EB"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.drive']}
                binding={bindingByTargetId.get('synth.drive')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.drive'}
                liveCcValue={
                  bindingByTargetId.get('synth.drive')
                    ? liveCcMap[bindingByTargetId.get('synth.drive')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Drive"
                  value={synth.drive}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={24}
                  displayValue={`${Math.round(synth.drive)}%`}
                  onChange={(v) => onUpdateSynth({ drive: v })}
                  size="sm"
                />
              </MappableControl>

              <MappableControl
                target={SYNTH_MIDI_TARGETS['synth.masterLevel']}
                binding={bindingByTargetId.get('synth.masterLevel')}
                overlayActive={mappingOverlayActive}
                isLearning={learningTarget?.id === 'synth.masterLevel'}
                liveCcValue={
                  bindingByTargetId.get('synth.masterLevel')
                    ? liveCcMap[bindingByTargetId.get('synth.masterLevel')!.cc]
                    : undefined
                }
                onOpenBind={handleOpenBindMenu}
                onUnbind={onUnbindMidi}
                className="p-1"
                compactBadge
              >
                <TactileKnob
                  label="Master"
                  value={synth.masterLevel}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={76}
                  displayValue={`${Math.round(synth.masterLevel)}%`}
                  onChange={(v) => onUpdateSynth({ masterLevel: v })}
                  size="sm"
                />
              </MappableControl>
            </div>
          </div>

          {/* High-Contrast Tactile 16-Pad MPC Matrix */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">16-Pad Velocity Trigger Grid</h3>
              <span className="text-xs text-slate-500">Click or press keys 1–4 / Q–R / A–F / Z–V</span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {padNotes.map((midi, idx) => {
                const isPressed = pressedPad === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onPointerDown={() => {
                      setPressedPad(idx);
                      onTriggerPad(midi, 0.92);
                    }}
                    onPointerUp={() => setPressedPad(null)}
                    onPointerLeave={() => setPressedPad((p) => (p === idx ? null : p))}
                    className={`h-14 rounded-xl px-2.5 py-2 flex flex-col justify-between text-left transition-all duration-75 select-none border ${
                      isPressed
                        ? 'bg-[#E11D2E] text-white border-[#E11D2E] scale-[0.97]'
                        : 'tactile-well text-white border-white/10 hover:border-[#E11D2E]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-[10px] text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[10px] text-[#E11D2E]">{PAD_KEYS[idx]}</span>
                    </div>
                    <div className="font-mono text-xs font-semibold tabular-nums">
                      {midiToName(midi)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Right-click MPC Live III Hardware Bind Popover */}
      <MidiBindPopover
        target={popoverTarget}
        position={popoverPos}
        currentBinding={popoverTarget ? bindingByTargetId.get(popoverTarget.id) : undefined}
        allBindings={midiMappings}
        isLearning={Boolean(popoverTarget && learningTarget?.id === popoverTarget.id)}
        webMidiConnected={webMidiConnected}
        onToggleLearn={handleToggleLearnFromPopover}
        onBind={onBindMidi}
        onUnbind={onUnbindMidi}
        onClose={handleClosePopover}
      />
    </div>
  );
};
