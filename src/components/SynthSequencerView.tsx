import React, { useEffect, useMemo, useState } from 'react';
import { Play, Square, Volume2, VolumeX } from 'lucide-react';
import { computeEuclideanPattern, SCALE_INTERVALS, SYNTH_PRESETS } from '../data/dspCatalog';
import { EuclideanLane, MusicalScaleId, OscillatorWave, SequencerConfig, SynthParams } from '../types/mpc';
import { TactileKnob } from './TactileKnob';
import { TactileSlider } from './TactileSlider';
import { GlassSelect, GlassSelectOption } from './GlassSelect';

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
}) => {
  const [pressedPad, setPressedPad] = useState<number | null>(null);

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
    <div className="space-y-6">
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
              {sequencerPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {sequencerPlaying ? 'Stop Sequence' : 'Run Sequence'}
            </button>
          </div>

          {/* Global Clock & Quantizer Controls (Custom Tactile Sliders + GlassSelects) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-900/8 items-end">
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

            <GlassSelect
              id="seq-scale"
              label="Scale Quantizer"
              value={sequencer.scale}
              options={SCALE_OPTIONS}
              onChange={(scale) => onUpdateSequencer({ scale })}
              compact
            />

            <GlassSelect
              id="seq-root"
              label="Root Pitch"
              value={sequencer.rootMidi}
              options={ROOT_OPTIONS}
              onChange={(rootMidi) => onUpdateSequencer({ rootMidi })}
              compact
            />
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
                return (
                  <div
                    key={lane.id}
                    className={`rounded-xl p-3 border transition-colors ${
                      lane.muted ? 'bg-white/40 border-slate-900/8 opacity-70' : 'bg-white/85 border-slate-900/12'
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
                      <button
                        type="button"
                        onClick={() => onUpdateLane(lane.id, { muted: !lane.muted })}
                        className="p-1.5 rounded-md hover:bg-slate-900/5 text-slate-600"
                        aria-label={lane.muted ? `Unmute ${lane.name}` : `Mute ${lane.name}`}
                      >
                        {lane.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
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

                    {/* Tactile Sliders replacing generic HTML range sliders */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            {/* Modernized Glass Dropdown Oscillator Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <GlassSelect
                id="osc1-wave"
                label="Oscillator 1"
                value={synth.osc1Wave}
                options={WAVE_OPTIONS}
                onChange={(osc1Wave) => onUpdateSynth({ osc1Wave })}
                compact
              />
              <GlassSelect
                id="osc2-wave"
                label="Oscillator 2"
                value={synth.osc2Wave}
                options={WAVE_OPTIONS}
                onChange={(osc2Wave) => onUpdateSynth({ osc2Wave })}
                compact
              />
            </div>

            {/* Tactile Encoders */}
            <div className="grid grid-cols-4 gap-y-5 gap-x-2 justify-items-center pt-2 border-t border-slate-900/8">
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
    </div>
  );
};
