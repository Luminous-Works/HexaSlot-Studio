import { computeEuclideanPattern, SCALE_INTERVALS } from '../data/dspCatalog';
import { DspModuleId, InsertSlotState, SequencerConfig, SynthParams } from '../types/mpc';

interface SlotNodeGraph {
  input: GainNode;
  output: GainNode;
  dryGain: GainNode;
  wetGain: GainNode;
  analyser: AnalyserNode;
  moduleId: DspModuleId;
  dispose: () => void;
  updateParams: (slot: InsertSlotState, ctx: AudioContext) => void;
}

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

function makeSaturationCurve(drive: number, bias: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const buffer = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buffer);
  const k = 1 + (drive / 100) * 14;
  const b = (bias / 100) * 0.35;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1 + b;
    curve[i] = Math.tanh(x * k) / Math.tanh(k);
  }
  return curve;
}

function makeWavefoldCurve(fold: number, symmetry: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const buffer = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buffer);
  const sym = (symmetry / 100) * 0.4;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1 + sym;
    curve[i] = Math.sin(x * fold * Math.PI * 0.65);
  }
  return curve;
}

function makeBitcrushCurve(bits: number, drive: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const buffer = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buffer);
  const levels = Math.max(4, Math.pow(2, bits));
  const boost = 1 + (drive / 100) * 2.5;
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, ((i * 2) / n - 1) * boost));
    curve[i] = Math.round(x * (levels / 2)) / (levels / 2);
  }
  return curve;
}

function makeHallImpulse(ctx: AudioContext, decaySec: number, sizePct: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1024, Math.floor(rate * Math.min(5.0, Math.max(0.3, decaySec))));
  const impulse = ctx.createBuffer(2, length, rate);
  const density = 0.4 + (sizePct / 100) * 0.6;
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, 2.6) * (i < 160 ? i / 160 : 1);
      const white = (Math.random() * 2 - 1) * density;
      lp = lp * 0.35 + white * 0.65;
      data[i] = lp * env * 0.8;
    }
  }
  return impulse;
}

function createSlotGraph(ctx: AudioContext, slot: InsertSlotState): SlotNodeGraph {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.65;
  const cleanups: Array<() => void> = [];

  input.connect(dryGain);
  dryGain.connect(output);
  wetGain.connect(output);
  output.connect(analyser);

  let updater: (s: InsertSlotState, c: AudioContext) => void = () => {};

  if (slot.moduleId === 'empty') {
    dryGain.gain.value = 1;
    wetGain.gain.value = 0;
  } else if (slot.moduleId === 'ladder-filter') {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const tilt = ctx.createBiquadFilter();
    tilt.type = 'highshelf';
    tilt.frequency.value = 1800;
    const trim = ctx.createGain();
    input.connect(filter);
    filter.connect(tilt);
    tilt.connect(trim);
    trim.connect(wetGain);
    updater = (s, c) => {
      filter.frequency.setTargetAtTime(s.p1, c.currentTime, 0.015);
      filter.Q.setTargetAtTime(s.p2, c.currentTime, 0.015);
      tilt.gain.setTargetAtTime(s.p3, c.currentTime, 0.015);
      trim.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'tape-saturator') {
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '2x';
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    const outGain = ctx.createGain();
    input.connect(shaper);
    shaper.connect(tone);
    tone.connect(outGain);
    outGain.connect(wetGain);
    let lastSig = '';
    updater = (s, c) => {
      const sig = `${s.p1}:${s.p3}`;
      if (sig !== lastSig) {
        shaper.curve = makeSaturationCurve(s.p1, s.p3);
        lastSig = sig;
      }
      tone.frequency.setTargetAtTime(s.p2, c.currentTime, 0.015);
      outGain.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'bbd-delay') {
    const delayL = ctx.createDelay(1.2);
    const delayR = ctx.createDelay(1.2);
    const fb = ctx.createGain();
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    const merger = ctx.createChannelMerger(2);
    input.connect(delayL);
    delayL.connect(damp);
    damp.connect(fb);
    fb.connect(delayL);
    delayL.connect(delayR);
    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);
    merger.connect(wetGain);
    updater = (s, c) => {
      delayL.delayTime.setTargetAtTime(s.p1 / 1000, c.currentTime, 0.02);
      delayR.delayTime.setTargetAtTime(s.p4 / 1000, c.currentTime, 0.02);
      fb.gain.setTargetAtTime(Math.min(0.9, s.p2 / 100), c.currentTime, 0.02);
      damp.frequency.setTargetAtTime(s.p3, c.currentTime, 0.02);
    };
  } else if (slot.moduleId === 'shimmer-hall') {
    const preDelay = ctx.createDelay(0.25);
    const convolver = ctx.createConvolver();
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    input.connect(preDelay);
    preDelay.connect(convolver);
    convolver.connect(tone);
    tone.connect(wetGain);
    let lastImpulse = '';
    updater = (s, c) => {
      const sig = `${s.p1.toFixed(1)}:${Math.round(s.p4 / 5)}`;
      if (sig !== lastImpulse) {
        convolver.buffer = makeHallImpulse(c, s.p1, s.p4);
        lastImpulse = sig;
      }
      preDelay.delayTime.setTargetAtTime(s.p2 / 1000, c.currentTime, 0.02);
      tone.frequency.setTargetAtTime(s.p3, c.currentTime, 0.02);
    };
  } else if (slot.moduleId === 'decimator') {
    const shaper = ctx.createWaveShaper();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const outGain = ctx.createGain();
    input.connect(shaper);
    shaper.connect(filter);
    filter.connect(outGain);
    outGain.connect(wetGain);
    let lastSig = '';
    updater = (s, c) => {
      const sig = `${s.p1}:${s.p3}`;
      if (sig !== lastSig) {
        shaper.curve = makeBitcrushCurve(s.p1, s.p3);
        lastSig = sig;
      }
      filter.frequency.setTargetAtTime(s.p2, c.currentTime, 0.015);
      outGain.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'vca-comp') {
    const comp = ctx.createDynamicsCompressor();
    comp.attack.value = 0.008;
    comp.knee.value = 6;
    const makeup = ctx.createGain();
    input.connect(comp);
    comp.connect(makeup);
    makeup.connect(wetGain);
    updater = (s, c) => {
      comp.threshold.setTargetAtTime(s.p1, c.currentTime, 0.015);
      comp.ratio.setTargetAtTime(s.p2, c.currentTime, 0.015);
      comp.release.setTargetAtTime(s.p3 / 1000, c.currentTime, 0.015);
      makeup.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'analog-chorus') {
    const delay = ctx.createDelay(0.08);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    lfo.type = 'sine';
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();
    cleanups.push(() => {
      try {
        lfo.stop();
        lfo.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    input.connect(delay);
    delay.connect(tone);
    tone.connect(wetGain);
    updater = (s, c) => {
      lfo.frequency.setTargetAtTime(s.p1, c.currentTime, 0.02);
      lfoGain.gain.setTargetAtTime(s.p2 / 1000, c.currentTime, 0.02);
      delay.delayTime.setTargetAtTime(s.p3 / 1000, c.currentTime, 0.02);
      tone.frequency.setTargetAtTime(s.p4, c.currentTime, 0.02);
    };
  } else if (slot.moduleId === 'sculpt-eq') {
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 140;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.Q.value = 1.2;
    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 4800;
    input.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(wetGain);
    updater = (s, c) => {
      low.gain.setTargetAtTime(s.p1, c.currentTime, 0.015);
      mid.frequency.setTargetAtTime(s.p2, c.currentTime, 0.015);
      mid.gain.setTargetAtTime(s.p3, c.currentTime, 0.015);
      high.gain.setTargetAtTime(s.p4, c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'wavefolder') {
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '4x';
    const postLp = ctx.createBiquadFilter();
    postLp.type = 'lowpass';
    const outGain = ctx.createGain();
    input.connect(shaper);
    shaper.connect(postLp);
    postLp.connect(outGain);
    outGain.connect(wetGain);
    let lastSig = '';
    updater = (s, c) => {
      const sig = `${s.p1}:${s.p2}`;
      if (sig !== lastSig) {
        shaper.curve = makeWavefoldCurve(s.p1, s.p2);
        lastSig = sig;
      }
      postLp.frequency.setTargetAtTime(s.p3, c.currentTime, 0.015);
      outGain.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'ring-mod') {
    const carrier = ctx.createOscillator();
    const depth = ctx.createGain();
    const modNode = ctx.createGain();
    modNode.gain.value = 0.25;
    const tilt = ctx.createBiquadFilter();
    tilt.type = 'lowpass';
    const outGain = ctx.createGain();
    carrier.type = 'sine';
    carrier.connect(depth);
    depth.connect(modNode.gain);
    carrier.start();
    cleanups.push(() => {
      try {
        carrier.stop();
        carrier.disconnect();
      } catch {
        // ignore
      }
    });
    input.connect(modNode);
    modNode.connect(tilt);
    tilt.connect(outGain);
    outGain.connect(wetGain);
    updater = (s, c) => {
      carrier.frequency.setTargetAtTime(s.p1, c.currentTime, 0.015);
      depth.gain.setTargetAtTime(s.p2 / 100, c.currentTime, 0.015);
      tilt.frequency.setTargetAtTime(s.p3, c.currentTime, 0.015);
      outGain.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'haas-widener') {
    const splitter = ctx.createChannelSplitter(2);
    const delayR = ctx.createDelay(0.05);
    const trimR = ctx.createGain();
    const hpR = ctx.createBiquadFilter();
    hpR.type = 'highpass';
    const merger = ctx.createChannelMerger(2);
    const outGain = ctx.createGain();
    input.connect(splitter);
    splitter.connect(merger, 0, 0);
    splitter.connect(delayR, 1);
    delayR.connect(hpR);
    hpR.connect(trimR);
    trimR.connect(merger, 0, 1);
    merger.connect(outGain);
    outGain.connect(wetGain);
    updater = (s, c) => {
      delayR.delayTime.setTargetAtTime(s.p1 / 1000, c.currentTime, 0.015);
      trimR.gain.setTargetAtTime(dbToGain(s.p2), c.currentTime, 0.015);
      hpR.frequency.setTargetAtTime(s.p3, c.currentTime, 0.015);
      outGain.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  } else if (slot.moduleId === 'comb-resonator') {
    const delay = ctx.createDelay(0.1);
    const fb = ctx.createGain();
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    const trim = ctx.createGain();
    input.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    delay.connect(trim);
    trim.connect(wetGain);
    updater = (s, c) => {
      delay.delayTime.setTargetAtTime(s.p1 / 1000, c.currentTime, 0.015);
      fb.gain.setTargetAtTime(Math.min(0.92, s.p2 / 100), c.currentTime, 0.015);
      damp.frequency.setTargetAtTime(s.p3, c.currentTime, 0.015);
      trim.gain.setTargetAtTime(dbToGain(s.p4), c.currentTime, 0.015);
    };
  }

  const updateParams = (s: InsertSlotState, c: AudioContext) => {
    const active = !s.bypassed && s.moduleId !== 'empty';
    const mix = active ? s.mix / 100 : 0;
    dryGain.gain.setTargetAtTime(1 - mix * 0.7, c.currentTime, 0.015);
    wetGain.gain.setTargetAtTime(mix, c.currentTime, 0.015);
    updater(s, c);
  };

  updateParams(slot, ctx);

  return {
    input,
    output,
    dryGain,
    wetGain,
    analyser,
    moduleId: slot.moduleId,
    updateParams,
    dispose: () => {
      cleanups.forEach((fn) => fn());
      try {
        input.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
        output.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
    },
  };
}

class MpcWebAudioEngine {
  private ctx: AudioContext | null = null;
  private sourceBus: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private slotGraphs: SlotNodeGraph[] = [];
  private currentSlots: InsertSlotState[] = [];
  private synthParams: SynthParams | null = null;
  private seqConfig: SequencerConfig | null = null;

  private isSequencerPlaying = false;
  private schedulerTimer: number | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;
  private stepListeners = new Set<(step: number) => void>();

  public async ensureStarted(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.sourceBus = this.ctx.createGain();
      this.sourceBus.gain.value = 0.85;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -2;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 18;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.08;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.82;

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      if (this.currentSlots.length > 0) {
        this.rebuildRack(this.currentSlots);
      } else {
        this.sourceBus.connect(this.masterGain);
      }
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  public isRunning(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  private slotMeterScratch = new Float32Array(64);

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getSlotLevels(outLevels: Float32Array): void {
    for (let i = 0; i < outLevels.length; i++) {
      const graph = this.slotGraphs[i];
      if (!graph || !this.ctx || this.ctx.state !== 'running') {
        outLevels[i] = 0;
        continue;
      }
      graph.analyser.getFloatTimeDomainData(this.slotMeterScratch);
      let sumSq = 0;
      for (let j = 0; j < this.slotMeterScratch.length; j++) {
        const v = this.slotMeterScratch[j];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / this.slotMeterScratch.length);
      // Perceptual boost so musical -24dB..0dB signals clearly illuminate the slim level bar
      const scaled = Math.min(1, Math.pow(rms * 3.4, 0.72));
      outLevels[i] = scaled < 0.015 ? 0 : scaled;
    }
  }

  public updateSynthParams(params: SynthParams): void {
    this.synthParams = params;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(params.masterLevel / 100, this.ctx.currentTime, 0.02);
    }
  }

  public updateSequencerConfig(config: SequencerConfig): void {
    this.seqConfig = config;
  }

  public syncRack(slots: InsertSlotState[]): void {
    const needsRebuild =
      this.slotGraphs.length !== slots.length ||
      this.slotGraphs.some((g, i) => g.moduleId !== slots[i].moduleId);
    this.currentSlots = slots;

    if (!this.ctx || !this.sourceBus || !this.masterGain) return;

    if (needsRebuild) {
      this.rebuildRack(slots);
    } else {
      slots.forEach((slot, i) => {
        this.slotGraphs[i]?.updateParams(slot, this.ctx!);
      });
    }
  }

  private rebuildRack(slots: InsertSlotState[]): void {
    if (!this.ctx || !this.sourceBus || !this.masterGain) return;
    try {
      this.sourceBus.disconnect();
    } catch {
      // ignore
    }
    this.slotGraphs.forEach((g) => g.dispose());
    this.slotGraphs = slots.map((slot) => createSlotGraph(this.ctx!, slot));

    let prev: AudioNode = this.sourceBus;
    for (const graph of this.slotGraphs) {
      prev.connect(graph.input);
      prev = graph.output;
    }
    prev.connect(this.masterGain);
  }

  public triggerNote(midiNote: number, velocity = 0.85, durationSec = 0.24, whenSec?: number, role: 'kick-sub' | 'lead' | 'arp' | 'perc' = 'lead'): void {
    if (!this.ctx || !this.sourceBus || !this.synthParams) return;
    const t = whenSec ?? this.ctx.currentTime;
    const sp = this.synthParams;

    if (role === 'perc') {
      // Crisp FM / noise rim-hat percussion voice for generative percussion lane
      const osc = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();
      const baseFreq = 260 + (midiNote % 12) * 55;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * 1.4, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.045);

      mod.type = 'square';
      mod.frequency.setValueAtTime(baseFreq * 2.71, t);
      modGain.gain.setValueAtTime(340, t);
      modGain.gain.exponentialRampToValueAtTime(1, t + 0.04);

      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2400, t);
      bp.Q.value = 1.6;

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.22 * velocity, t + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(bp);
      bp.connect(env);
      env.connect(this.sourceBus);

      osc.start(t);
      mod.start(t);
      osc.stop(t + 0.11);
      mod.stop(t + 0.11);
      return;
    }

    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();

    osc1.type = sp.osc1Wave;
    osc2.type = sp.osc2Wave;
    subOsc.type = 'sine';

    osc1.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq, t);
    osc2.detune.setValueAtTime(sp.osc2DetuneCents, t);
    subOsc.frequency.setValueAtTime(freq * 0.5, t);

    if (role === 'kick-sub') {
      subOsc.frequency.setValueAtTime(Math.max(48, freq * 1.6), t);
      subOsc.frequency.exponentialRampToValueAtTime(Math.max(36, freq * 0.5), t + 0.075);
    }

    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    const gSub = this.ctx.createGain();

    const mix2 = sp.oscMix / 100;
    g1.gain.value = (1 - mix2) * 0.35;
    g2.gain.value = mix2 * 0.35;
    gSub.gain.value = (sp.subLevel / 100) * (role === 'kick-sub' ? 0.55 : 0.25);

    const preFilterDrive = this.ctx.createWaveShaper();
    if (sp.drive > 2) {
      preFilterDrive.curve = makeSaturationCurve(sp.drive * 0.7, 0);
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCut = Math.min(16000, sp.cutoffHz * (role === 'arp' ? 1.45 : 1.15));
    filter.frequency.setValueAtTime(startCut, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(90, sp.cutoffHz * 0.55), t + sp.decayMs / 1000);
    filter.Q.setValueAtTime(sp.resonance, t);

    const amp = this.ctx.createGain();
    const atk = Math.max(0.003, sp.attackMs / 1000);
    const dec = Math.max(0.02, sp.decayMs / 1000);
    const sus = Math.max(0.02, (sp.sustain / 100) * 0.55);
    const rel = Math.max(0.03, sp.releaseMs / 1000);
    const peak = 0.42 * velocity;

    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(peak, t + atk);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * sus), t + atk + dec);
    amp.gain.setValueAtTime(Math.max(0.001, peak * sus), t + durationSec);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + durationSec + rel);

    osc1.connect(g1);
    osc2.connect(g2);
    subOsc.connect(gSub);

    const target = sp.drive > 2 ? preFilterDrive : filter;
    g1.connect(target);
    g2.connect(target);
    gSub.connect(target);
    if (sp.drive > 2) {
      preFilterDrive.connect(filter);
    }
    filter.connect(amp);
    amp.connect(this.sourceBus);

    const stopAt = t + durationSec + rel + 0.04;
    osc1.start(t);
    osc2.start(t);
    subOsc.start(t);
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    subOsc.stop(stopAt);
  }

  public onStep(cb: (step: number) => void): () => void {
    this.stepListeners.add(cb);
    return () => this.stepListeners.delete(cb);
  }

  public async toggleSequencer(play: boolean): Promise<void> {
    if (play) {
      await this.ensureStarted();
      if (this.isSequencerPlaying) return;
      this.isSequencerPlaying = true;
      this.currentStep = 0;
      this.nextNoteTime = this.ctx!.currentTime + 0.05;
      this.schedulerTimer = window.setInterval(() => this.scheduleLookahead(), 25);
    } else {
      this.isSequencerPlaying = false;
      if (this.schedulerTimer !== null) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      this.stepListeners.forEach((cb) => cb(-1));
    }
  }

  public getIsSequencerPlaying(): boolean {
    return this.isSequencerPlaying;
  }

  private scheduleLookahead(): void {
    if (!this.ctx || !this.seqConfig || !this.isSequencerPlaying) return;
    const lookahead = 0.12;
    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      const stepDur = 60 / this.seqConfig.bpm / 4;
      const isOdd = this.currentStep % 2 === 1;
      const swingOffset = isOdd ? -(this.seqConfig.swing / 100) * stepDur * 0.4 : (this.seqConfig.swing / 100) * stepDur * 0.4;
      this.nextNoteTime += Math.max(0.04, stepDur + swingOffset);
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  private scheduleStep(step: number, time: number): void {
    if (!this.seqConfig || !this.ctx) return;
    const scaleNotes = SCALE_INTERVALS[this.seqConfig.scale];

    this.seqConfig.lanes.forEach((lane, laneIdx) => {
      if (lane.muted) return;
      const pattern = computeEuclideanPattern(lane.steps, lane.pulses, lane.rotation);
      const laneStep = step % lane.steps;
      if (!pattern[laneStep]) return;
      if (Math.random() * 100 > lane.probability) return;

      const scaleIdx = (laneStep * (laneIdx + 1) + lane.rotation) % scaleNotes.length;
      const note =
        lane.role === 'kick-sub'
          ? this.seqConfig!.rootMidi + lane.octaveOffset * 12
          : this.seqConfig!.rootMidi + lane.octaveOffset * 12 + scaleNotes[scaleIdx];

      const dur = lane.role === 'kick-sub' ? 0.22 : lane.role === 'arp' ? 0.12 : 0.18;
      const vel = lane.role === 'kick-sub' ? 0.95 : 0.72 + Math.random() * 0.18;
      this.triggerNote(note, vel, dur, time, lane.role);
    });

    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    window.setTimeout(() => {
      if (this.isSequencerPlaying) {
        this.stepListeners.forEach((cb) => cb(step));
      }
    }, delayMs);
  }
}

export const audioEngine = new MpcWebAudioEngine();
