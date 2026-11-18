import {
  EuclideanLane,
  MidiControlSpec,
  MidiMappingBinding,
  MidiTargetDescriptor,
  MusicalScaleId,
  OscillatorWave,
} from '../types/mpc';

export const MPC_LIVE_III_CONTROLS: MidiControlSpec[] = [
  // Q-Link Bank A
  { id: 'qlink-a1', label: 'Q-Link A1', shortLabel: 'QL A1', group: 'Q-Link Bank A', cc: 16 },
  { id: 'qlink-a2', label: 'Q-Link A2', shortLabel: 'QL A2', group: 'Q-Link Bank A', cc: 17 },
  { id: 'qlink-a3', label: 'Q-Link A3', shortLabel: 'QL A3', group: 'Q-Link Bank A', cc: 18 },
  { id: 'qlink-a4', label: 'Q-Link A4', shortLabel: 'QL A4', group: 'Q-Link Bank A', cc: 19 },
  // Q-Link Bank B
  { id: 'qlink-b1', label: 'Q-Link B1', shortLabel: 'QL B1', group: 'Q-Link Bank B', cc: 20 },
  { id: 'qlink-b2', label: 'Q-Link B2', shortLabel: 'QL B2', group: 'Q-Link Bank B', cc: 21 },
  { id: 'qlink-b3', label: 'Q-Link B3', shortLabel: 'QL B3', group: 'Q-Link Bank B', cc: 22 },
  { id: 'qlink-b4', label: 'Q-Link B4', shortLabel: 'QL B4', group: 'Q-Link Bank B', cc: 23 },
  // Q-Link Bank C
  { id: 'qlink-c1', label: 'Q-Link C1', shortLabel: 'QL C1', group: 'Q-Link Bank C', cc: 24 },
  { id: 'qlink-c2', label: 'Q-Link C2', shortLabel: 'QL C2', group: 'Q-Link Bank C', cc: 25 },
  { id: 'qlink-c3', label: 'Q-Link C3', shortLabel: 'QL C3', group: 'Q-Link Bank C', cc: 26 },
  { id: 'qlink-c4', label: 'Q-Link C4', shortLabel: 'QL C4', group: 'Q-Link Bank C', cc: 27 },
  // Q-Link Bank D
  { id: 'qlink-d1', label: 'Q-Link D1', shortLabel: 'QL D1', group: 'Q-Link Bank D', cc: 28 },
  { id: 'qlink-d2', label: 'Q-Link D2', shortLabel: 'QL D2', group: 'Q-Link Bank D', cc: 29 },
  { id: 'qlink-d3', label: 'Q-Link D3', shortLabel: 'QL D3', group: 'Q-Link Bank D', cc: 30 },
  { id: 'qlink-d4', label: 'Q-Link D4', shortLabel: 'QL D4', group: 'Q-Link Bank D', cc: 31 },
  // MPC Live III Touch Strip & Performance
  { id: 'touch-strip', label: 'Touch Strip', shortLabel: 'STRIP', group: 'Performance & Strip', cc: 1 },
  { id: 'touch-expr', label: 'Strip Expr', shortLabel: 'EXPR', group: 'Performance & Strip', cc: 11 },
  { id: 'xyfx-x', label: 'XYFX X-Axis', shortLabel: 'XY-X', group: 'Performance & Strip', cc: 12 },
  { id: 'xyfx-y', label: 'XYFX Y-Axis', shortLabel: 'XY-Y', group: 'Performance & Strip', cc: 13 },
  { id: 'data-dial', label: 'Data Dial', shortLabel: 'DIAL', group: 'Performance & Strip', cc: 14 },
  { id: 'sustain-ped', label: 'Foot Switch', shortLabel: 'FOOT', group: 'Performance & Strip', cc: 64 },
];

export const WAVE_DISCRETE: OscillatorWave[] = ['sawtooth', 'square', 'triangle', 'sine'];
export const SCALE_DISCRETE: MusicalScaleId[] = ['dorian', 'minor-pentatonic', 'phrygian', 'whole-tone', 'chromatic'];
export const ROOT_DISCRETE: number[] = [36, 38, 41, 43, 45, 48, 50, 53, 55, 57];

export const SYNTH_MIDI_TARGETS: Record<string, MidiTargetDescriptor> = {
  'synth.osc1Wave': {
    id: 'synth.osc1Wave',
    kind: 'synth',
    label: 'Synth · Osc 1 Wave',
    shortLabel: 'Osc 1 Wave',
    paramKey: 'osc1Wave',
    min: 0,
    max: 3,
    step: 1,
    isDiscrete: true,
    discreteOptions: WAVE_DISCRETE,
  },
  'synth.osc2Wave': {
    id: 'synth.osc2Wave',
    kind: 'synth',
    label: 'Synth · Osc 2 Wave',
    shortLabel: 'Osc 2 Wave',
    paramKey: 'osc2Wave',
    min: 0,
    max: 3,
    step: 1,
    isDiscrete: true,
    discreteOptions: WAVE_DISCRETE,
  },
  'synth.cutoffHz': {
    id: 'synth.cutoffHz',
    kind: 'synth',
    label: 'Synth · Filter Cutoff',
    shortLabel: 'Cutoff',
    paramKey: 'cutoffHz',
    min: 90,
    max: 12000,
    step: 20,
  },
  'synth.resonance': {
    id: 'synth.resonance',
    kind: 'synth',
    label: 'Synth · Resonance',
    shortLabel: 'Resonance',
    paramKey: 'resonance',
    min: 0.5,
    max: 16,
    step: 0.1,
  },
  'synth.osc2DetuneCents': {
    id: 'synth.osc2DetuneCents',
    kind: 'synth',
    label: 'Synth · Osc 2 Detune',
    shortLabel: 'Detune',
    paramKey: 'osc2DetuneCents',
    min: -40,
    max: 40,
    step: 1,
  },
  'synth.subLevel': {
    id: 'synth.subLevel',
    kind: 'synth',
    label: 'Synth · Sub Osc',
    shortLabel: 'Sub Osc',
    paramKey: 'subLevel',
    min: 0,
    max: 100,
    step: 1,
  },
  'synth.attackMs': {
    id: 'synth.attackMs',
    kind: 'synth',
    label: 'Synth · Attack',
    shortLabel: 'Attack',
    paramKey: 'attackMs',
    min: 2,
    max: 400,
    step: 1,
  },
  'synth.decayMs': {
    id: 'synth.decayMs',
    kind: 'synth',
    label: 'Synth · Decay',
    shortLabel: 'Decay',
    paramKey: 'decayMs',
    min: 30,
    max: 1200,
    step: 5,
  },
  'synth.drive': {
    id: 'synth.drive',
    kind: 'synth',
    label: 'Synth · Drive',
    shortLabel: 'Drive',
    paramKey: 'drive',
    min: 0,
    max: 100,
    step: 1,
  },
  'synth.masterLevel': {
    id: 'synth.masterLevel',
    kind: 'synth',
    label: 'Synth · Master Level',
    shortLabel: 'Master',
    paramKey: 'masterLevel',
    min: 0,
    max: 100,
    step: 1,
  },
};

export const SEQUENCER_MIDI_TARGETS: Record<string, MidiTargetDescriptor> = {
  'seq.bpm': {
    id: 'seq.bpm',
    kind: 'sequencer',
    label: 'Sequencer · Tempo (BPM)',
    shortLabel: 'Tempo',
    paramKey: 'bpm',
    min: 60,
    max: 180,
    step: 1,
  },
  'seq.swing': {
    id: 'seq.swing',
    kind: 'sequencer',
    label: 'Sequencer · MPC Swing',
    shortLabel: 'Swing',
    paramKey: 'swing',
    min: 0,
    max: 55,
    step: 1,
  },
  'seq.scale': {
    id: 'seq.scale',
    kind: 'sequencer',
    label: 'Sequencer · Scale Quantizer',
    shortLabel: 'Scale',
    paramKey: 'scale',
    min: 0,
    max: SCALE_DISCRETE.length - 1,
    step: 1,
    isDiscrete: true,
    discreteOptions: SCALE_DISCRETE,
  },
  'seq.rootMidi': {
    id: 'seq.rootMidi',
    kind: 'sequencer',
    label: 'Sequencer · Root Pitch',
    shortLabel: 'Root',
    paramKey: 'rootMidi',
    min: 0,
    max: ROOT_DISCRETE.length - 1,
    step: 1,
    isDiscrete: true,
    discreteOptions: ROOT_DISCRETE,
  },
};

export function buildLaneMidiTarget(
  lane: EuclideanLane,
  paramKey: 'steps' | 'pulses' | 'rotation' | 'probability' | 'muted'
): MidiTargetDescriptor {
  const baseId = `lane.${lane.id}.${paramKey}`;
  if (paramKey === 'steps') {
    return {
      id: baseId,
      kind: 'lane',
      label: `${lane.name} · Steps`,
      shortLabel: 'Steps',
      paramKey: 'steps',
      laneId: lane.id,
      min: 2,
      max: 16,
      step: 1,
    };
  }
  if (paramKey === 'pulses') {
    return {
      id: baseId,
      kind: 'lane',
      label: `${lane.name} · Pulses`,
      shortLabel: 'Pulses',
      paramKey: 'pulses',
      laneId: lane.id,
      min: 0,
      max: lane.steps,
      step: 1,
    };
  }
  if (paramKey === 'rotation') {
    return {
      id: baseId,
      kind: 'lane',
      label: `${lane.name} · Rotate`,
      shortLabel: 'Rotate',
      paramKey: 'rotation',
      laneId: lane.id,
      min: 0,
      max: 15,
      step: 1,
    };
  }
  if (paramKey === 'probability') {
    return {
      id: baseId,
      kind: 'lane',
      label: `${lane.name} · Probability`,
      shortLabel: 'Prob',
      paramKey: 'probability',
      laneId: lane.id,
      min: 10,
      max: 100,
      step: 1,
    };
  }
  return {
    id: baseId,
    kind: 'lane',
    label: `${lane.name} · Mute`,
    shortLabel: 'Mute',
    paramKey: 'muted',
    laneId: lane.id,
    min: 0,
    max: 1,
    step: 1,
    isDiscrete: true,
  };
}

export function createBindingFromSpec(
  target: MidiTargetDescriptor,
  control: MidiControlSpec,
  channel = 0,
  inverted = false
): MidiMappingBinding {
  return {
    targetId: target.id,
    targetKind: target.kind,
    targetLabel: target.label,
    paramKey: target.paramKey,
    laneId: target.laneId,
    controlId: control.id,
    controlLabel: control.label,
    shortControlLabel: control.shortLabel,
    cc: control.cc,
    channel,
    min: target.min,
    max: target.max,
    step: target.step,
    inverted,
  };
}

export function resolveControlByCc(cc: number): MidiControlSpec {
  const found = MPC_LIVE_III_CONTROLS.find((c) => c.cc === cc);
  if (found) return found;
  return {
    id: `cc-${cc}`,
    label: `MIDI CC ${cc}`,
    shortLabel: `CC${cc}`,
    group: 'Performance & Strip',
    cc,
  };
}

export function scaleCcToTargetValue(binding: MidiMappingBinding, ccVal: number): number {
  const normRaw = Math.max(0, Math.min(1, ccVal / 127));
  const norm = binding.inverted ? 1 - normRaw : normRaw;
  const raw = binding.min + norm * (binding.max - binding.min);
  const snapped = Math.round((raw - binding.min) / binding.step) * binding.step + binding.min;
  return Number(Math.max(binding.min, Math.min(binding.max, snapped)).toFixed(4));
}

export function targetValueToCc(binding: MidiMappingBinding, currentVal: number): number {
  const span = binding.max - binding.min || 1;
  const normRaw = Math.max(0, Math.min(1, (currentVal - binding.min) / span));
  const norm = binding.inverted ? 1 - normRaw : normRaw;
  return Math.round(norm * 127);
}

// Initial default MPC Live III hardware mappings so the Active Mapping Overlay is immediately tangible
export const DEFAULT_MPC_MIDI_MAPPINGS: MidiMappingBinding[] = [
  createBindingFromSpec(SYNTH_MIDI_TARGETS['synth.cutoffHz'], MPC_LIVE_III_CONTROLS[0]), // Q-Link A1 (CC 16)
  createBindingFromSpec(SYNTH_MIDI_TARGETS['synth.resonance'], MPC_LIVE_III_CONTROLS[1]), // Q-Link A2 (CC 17)
  createBindingFromSpec(SYNTH_MIDI_TARGETS['synth.drive'], MPC_LIVE_III_CONTROLS[16]), // Touch Strip (CC 1)
  {
    targetId: 'lane.lane-kick.pulses',
    targetKind: 'lane',
    targetLabel: 'Sub Pulse · Pulses',
    paramKey: 'pulses',
    laneId: 'lane-kick',
    controlId: 'qlink-b1',
    controlLabel: 'Q-Link B1',
    shortControlLabel: 'QL B1',
    cc: 20,
    channel: 0,
    min: 0,
    max: 16,
    step: 1,
  },
];

// Full Q-Link Studio template (maps Bank A to Synth, Bank B to Sequencer/Lanes)
export const STUDIO_MPC_MIDI_MAPPINGS: MidiMappingBinding[] = [
  ...DEFAULT_MPC_MIDI_MAPPINGS,
  createBindingFromSpec(SYNTH_MIDI_TARGETS['synth.osc2DetuneCents'], MPC_LIVE_III_CONTROLS[2]), // Q-Link A3
  createBindingFromSpec(SYNTH_MIDI_TARGETS['synth.subLevel'], MPC_LIVE_III_CONTROLS[3]), // Q-Link A4
  {
    targetId: 'lane.lane-lead.pulses',
    targetKind: 'lane',
    targetLabel: 'Lead Motive · Pulses',
    paramKey: 'pulses',
    laneId: 'lane-lead',
    controlId: 'qlink-b2',
    controlLabel: 'Q-Link B2',
    shortControlLabel: 'QL B2',
    cc: 21,
    channel: 0,
    min: 0,
    max: 16,
    step: 1,
  },
  {
    targetId: 'lane.lane-arp.probability',
    targetKind: 'lane',
    targetLabel: 'Upper Arp · Probability',
    paramKey: 'probability',
    laneId: 'lane-arp',
    controlId: 'qlink-b3',
    controlLabel: 'Q-Link B3',
    shortControlLabel: 'QL B3',
    cc: 22,
    channel: 0,
    min: 10,
    max: 100,
    step: 1,
  },
  createBindingFromSpec(SEQUENCER_MIDI_TARGETS['seq.swing'], MPC_LIVE_III_CONTROLS[7]), // Q-Link B4
];
