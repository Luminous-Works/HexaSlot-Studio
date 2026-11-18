export type WorkspaceTab = 'rack' | 'synth' | 'feasibility' | 'export';

export type ChainArchitectureMode = 'native-dsp' | 'subhost-vst2';

export type DspModuleId =
  | 'empty'
  | 'ladder-filter'
  | 'tape-saturator'
  | 'bbd-delay'
  | 'shimmer-hall'
  | 'decimator'
  | 'vca-comp'
  | 'analog-chorus'
  | 'sculpt-eq'
  | 'wavefolder'
  | 'ring-mod'
  | 'haas-widener'
  | 'comb-resonator';

export interface ModuleParamDef {
  key: 'p1' | 'p2' | 'p3' | 'p4';
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (val: number) => string;
}

export interface DspModuleSpec {
  id: DspModuleId;
  name: string;
  shortName: string;
  category: 'Dynamics' | 'Filter' | 'Drive' | 'Time' | 'Modulation' | 'Spatial' | 'Empty';
  cpuCostPercent: number;
  description: string;
  params: ModuleParamDef[];
}

export interface InsertSlotState {
  index: number; // 0..15 (Slot 1..16)
  moduleId: DspModuleId;
  bypassed: boolean;
  mix: number; // 0..100
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

export type OscillatorWave = 'sawtooth' | 'square' | 'triangle' | 'sine';

export interface SynthParams {
  osc1Wave: OscillatorWave;
  osc2Wave: OscillatorWave;
  osc2DetuneCents: number; // -50..50
  oscMix: number; // 0..100 (osc1 -> osc2)
  subLevel: number; // 0..100
  cutoffHz: number; // 80..14000
  resonance: number; // 0.5..18
  drive: number; // 0..100
  attackMs: number; // 2..500
  decayMs: number; // 30..1500
  sustain: number; // 0..100
  releaseMs: number; // 30..2000
  masterLevel: number; // 0..100
}

export type MusicalScaleId = 'minor-pentatonic' | 'dorian' | 'phrygian' | 'whole-tone' | 'chromatic';

export interface EuclideanLane {
  id: string;
  name: string;
  role: 'kick-sub' | 'lead' | 'arp' | 'perc';
  steps: number; // 2..16
  pulses: number; // 0..steps
  rotation: number; // 0..15
  probability: number; // 0..100
  octaveOffset: number; // -2..2
  muted: boolean;
}

export interface SequencerConfig {
  bpm: number;
  swing: number; // 0..60
  scale: MusicalScaleId;
  rootMidi: number; // e.g. 48 (C3)
  lanes: EuclideanLane[];
}

export interface RackPreset {
  id: string;
  name: string;
  summary: string;
  slots: Array<{
    index: number;
    moduleId: DspModuleId;
    bypassed?: boolean;
    mix: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  }>;
}

export interface SynthPreset {
  id: string;
  name: string;
  category: string;
  summary: string;
  params: SynthParams;
}
