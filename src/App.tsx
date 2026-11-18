import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audioEngine } from './audio/dspEngine';
import {
  buildPresetSlots,
  createDefaultSlot,
  DEFAULT_SEQUENCER_CONFIG,
  DEFAULT_SYNTH_PARAMS,
  DSP_MODULES,
  RACK_PRESETS,
  SYNTH_PRESETS,
} from './data/dspCatalog';
import {
  ChainArchitectureMode,
  DspModuleId,
  EuclideanLane,
  InsertSlotState,
  SequencerConfig,
  SynthParams,
  WorkspaceTab,
} from './types/mpc';
import { useCommandHistory } from './hooks/useCommandHistory';
import { CommandHistoryBar } from './components/CommandHistoryBar';
import { InsertRackView } from './components/InsertRackView';
import { SynthSequencerView } from './components/SynthSequencerView';
import { FeasibilityView } from './components/FeasibilityView';
import { CloudSdkExportView } from './components/CloudSdkExportView';

const NAV_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'rack', label: '16-Slot Rack' },
  { id: 'synth', label: 'Synth & Sequencer' },
  { id: 'feasibility', label: 'Live III Feasibility' },
  { id: 'export', label: 'Cloud SDK Export' },
];

export interface QuickSlotSnapshot {
  slots: InsertSlotState[];
  capturedAt: string;
  activeCount: number;
  sourceLabel: string;
}

interface StudioState {
  slots: InsertSlotState[];
  activePresetId: string;
  archMode: ChainArchitectureMode;
  synth: SynthParams;
  activeSynthPresetId: string;
  sequencer: SequencerConfig;
}

const INITIAL_STUDIO_STATE: StudioState = {
  slots: buildPresetSlots('dub-matrix'),
  activePresetId: 'dub-matrix',
  archMode: 'native-dsp',
  synth: DEFAULT_SYNTH_PARAMS,
  activeSynthPresetId: 'mpc-sub-anchor',
  sequencer: DEFAULT_SEQUENCER_CONFIG,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('rack');
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [quickSnapshot, setQuickSnapshot] = useState<QuickSlotSnapshot | null>(null);

  const {
    state: studio,
    currentLabel,
    pastSummaries,
    futureSummaries,
    commit,
    undo,
    redo,
    jumpToPast,
    jumpToFuture,
  } = useCommandHistory<StudioState>(INITIAL_STUDIO_STATE, 'Initial Studio Session');

  const { slots, activePresetId, archMode, synth, activeSynthPresetId, sequencer } = studio;

  const [audioRunning, setAudioRunning] = useState(false);
  const [sequencerPlaying, setSequencerPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    audioEngine.syncRack(slots);
  }, [slots]);

  useEffect(() => {
    audioEngine.updateSynthParams(synth);
  }, [synth]);

  useEffect(() => {
    audioEngine.updateSequencerConfig(sequencer);
  }, [sequencer]);

  useEffect(() => {
    return audioEngine.onStep((step) => {
      setActiveStep(step);
    });
  }, []);

  const ensureAudio = useCallback(async () => {
    await audioEngine.ensureStarted();
    audioEngine.updateSynthParams(synth);
    audioEngine.updateSequencerConfig(sequencer);
    audioEngine.syncRack(slots);
    setAudioRunning(true);
  }, [synth, sequencer, slots]);

  const handleToggleAudioOrSeq = async () => {
    if (sequencerPlaying) {
      await audioEngine.toggleSequencer(false);
      setSequencerPlaying(false);
      return;
    }
    await ensureAudio();
    await audioEngine.toggleSequencer(true);
    setSequencerPlaying(true);
  };

  const handleAuditionHit = useCallback(
    async (kind: 'chord' | 'bass') => {
      await ensureAudio();
      if (kind === 'bass') {
        audioEngine.triggerNote(36, 0.95, 0.34, undefined, 'kick-sub');
      } else {
        [60, 63, 67, 70].forEach((note, i) => {
          window.setTimeout(() => {
            audioEngine.triggerNote(note, 0.72, 0.45, undefined, 'lead');
          }, i * 24);
        });
      }
    },
    [ensureAudio]
  );

  const handleTriggerPad = useCallback(
    async (midi: number, velocity = 0.9) => {
      await ensureAudio();
      audioEngine.triggerNote(midi, velocity, 0.28, undefined, 'lead');
    },
    [ensureAudio]
  );

  // Rack Commands
  const handleUpdateSlot = useCallback(
    (idx: number, patch: Partial<InsertSlotState>) => {
      const patchKeys = Object.keys(patch).join(',');
      const isBypassOnly = patchKeys === 'bypassed';
      commit(
        isBypassOnly
          ? `${patch.bypassed ? 'Bypass' : 'Engage'} Slot ${String(idx + 1).padStart(2, '0')}`
          : `Tune Slot ${String(idx + 1).padStart(2, '0')}`,
        'rack',
        (prev) => ({
          ...prev,
          activePresetId: 'custom',
          slots: prev.slots.map((s) => (s.index === idx ? { ...s, ...patch } : s)),
        }),
        isBypassOnly ? undefined : `slot-${idx}-${patchKeys}`
      );
    },
    [commit]
  );

  const handleSwapModule = useCallback(
    (idx: number, moduleId: DspModuleId) => {
      const modName = DSP_MODULES[moduleId].shortName;
      commit(
        `Slot ${String(idx + 1).padStart(2, '0')} → ${modName}`,
        'rack',
        (prev) => ({
          ...prev,
          activePresetId: 'custom',
          slots: prev.slots.map((s) => (s.index === idx ? createDefaultSlot(idx, moduleId) : s)),
        })
      );
    },
    [commit]
  );

  const handleMoveSlot = useCallback(
    (idx: number, direction: -1 | 1) => {
      const target = idx + direction;
      if (target < 0 || target > 15) return;
      commit(
        `Move Slot ${String(idx + 1).padStart(2, '0')} → ${String(target + 1).padStart(2, '0')}`,
        'rack',
        (prev) => {
          const nextSlots = [...prev.slots];
          const a = { ...nextSlots[idx], index: target };
          const b = { ...nextSlots[target], index: idx };
          nextSlots[idx] = b;
          nextSlots[target] = a;
          return {
            ...prev,
            activePresetId: 'custom',
            slots: nextSlots,
          };
        }
      );
      setSelectedSlotIdx(target);
    },
    [commit]
  );

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const presetName = RACK_PRESETS.find((p) => p.id === presetId)?.name ?? presetId;
      commit(`Load Chain: ${presetName}`, 'rack', (prev) => ({
        ...prev,
        activePresetId: presetId,
        slots: buildPresetSlots(presetId),
      }));
    },
    [commit]
  );

  const handleClearAll = useCallback(() => {
    commit('Clear All 16 Slots', 'rack', (prev) => ({
      ...prev,
      activePresetId: 'custom',
      slots: Array.from({ length: 16 }, (_, idx) => createDefaultSlot(idx, 'empty')),
    }));
  }, [commit]);

  const handleChangeArchMode = useCallback(
    (mode: ChainArchitectureMode) => {
      commit(
        `Architecture → ${mode === 'native-dsp' ? 'Native 16-DSP' : 'VST2 Sub-Host'}`,
        'rack',
        (prev) => ({
          ...prev,
          archMode: mode,
        })
      );
    },
    [commit]
  );

  // Quick Slot Configuration Temporary Buffer (Independent Capture + Undoable Restore)
  const handleCaptureSnapshot = useCallback(() => {
    const cloned = slots.map((s) => ({ ...s }));
    const activeCount = cloned.filter((s) => s.moduleId !== 'empty' && !s.bypassed).length;
    const now = new Date();
    const capturedAt = now.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setQuickSnapshot({
      slots: cloned,
      capturedAt,
      activeCount,
      sourceLabel: activePresetId === 'custom' ? 'Custom Layout' : activePresetId,
    });
  }, [slots, activePresetId]);

  const handleRestoreSnapshot = useCallback(() => {
    if (!quickSnapshot) return;
    commit(`Restore Quick Snapshot (${quickSnapshot.capturedAt})`, 'rack', (prev) => ({
      ...prev,
      activePresetId: 'custom',
      slots: quickSnapshot.slots.map((s) => ({ ...s })),
    }));
  }, [quickSnapshot, commit]);

  // Synth & Sequencer Commands
  const handleUpdateSynth = useCallback(
    (patch: Partial<SynthParams>) => {
      const keys = Object.keys(patch).join(',');
      const isDiscrete = keys === 'osc1Wave' || keys === 'osc2Wave';
      commit(
        `Synth: ${keys}`,
        'synth',
        (prev) => ({
          ...prev,
          activeSynthPresetId: 'custom',
          synth: { ...prev.synth, ...patch },
        }),
        isDiscrete ? undefined : `synth-${keys}`
      );
    },
    [commit]
  );

  const handleSelectSynthPreset = useCallback(
    (presetId: string) => {
      const found = SYNTH_PRESETS.find((p) => p.id === presetId);
      if (!found) return;
      commit(`Load Synth: ${found.name}`, 'synth', (prev) => ({
        ...prev,
        activeSynthPresetId: presetId,
        synth: { ...found.params },
      }));
    },
    [commit]
  );

  const handleUpdateSequencer = useCallback(
    (patch: Partial<SequencerConfig>) => {
      const keys = Object.keys(patch).join(',');
      const isDiscrete = keys === 'scale' || keys === 'rootMidi';
      commit(
        `Sequencer: ${keys}`,
        'sequencer',
        (prev) => ({
          ...prev,
          sequencer: { ...prev.sequencer, ...patch },
        }),
        isDiscrete ? undefined : `seq-${keys}`
      );
    },
    [commit]
  );

  const handleUpdateLane = useCallback(
    (laneId: string, patch: Partial<EuclideanLane>) => {
      const keys = Object.keys(patch).join(',');
      const isMute = keys === 'muted';
      commit(
        isMute
          ? `${patch.muted ? 'Mute' : 'Unmute'} ${laneId.replace('lane-', '')}`
          : `Euclidean ${laneId.replace('lane-', '')} (${keys})`,
        'sequencer',
        (prev) => ({
          ...prev,
          sequencer: {
            ...prev.sequencer,
            lanes: prev.sequencer.lanes.map((l) => (l.id === laneId ? { ...l, ...patch } : l)),
          },
        }),
        isMute ? undefined : `lane-${laneId}-${keys}`
      );
    },
    [commit]
  );

  // Global Keyboard Shortcuts: Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y) + Quick Snapshot (Alt+C / Alt+R)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCaptureSnapshot();
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRestoreSnapshot();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, handleCaptureSnapshot, handleRestoreSnapshot]);

  const activeSlotCount = slots.filter((s) => s.moduleId !== 'empty' && !s.bypassed).length;
  const focusedSpec = DSP_MODULES[slots[selectedSlotIdx]?.moduleId ?? 'empty'];

  return (
    <div className="studio-canvas min-h-screen flex flex-col">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-900/8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('rack')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            HexaSlot Studio
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Workspace sections">
            {NAV_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-[#E11D2E] rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleToggleAudioOrSeq}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                sequencerPlaying
                  ? 'bg-[#E11D2E] text-white hover:bg-[#C81827]'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {sequencerPlaying ? 'Stop Live Engine' : 'Start Live Engine'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">Lumina Aerospace</span>
              <span aria-hidden="true">·</span>
              <span>MPC Live III Standalone</span>
              <span aria-hidden="true">·</span>
              <span>Gen2 aarch64 + Gen1 armv7</span>
              <span aria-hidden="true">·</span>
              <span>Open MPC OS 3.10.1+</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mt-1 text-balance">
              {activeTab === 'rack' && '16-Slot Insert Expander & Modular DSP Chain'}
              {activeTab === 'synth' && 'Real-Time Synthesizer & Generative Euclidean Sequencer'}
              {activeTab === 'feasibility' && 'MPC Live III Feasibility & Cloud Workflow Architecture'}
              {activeTab === 'export' && 'Cloud SDK & Open MPC Release Packager'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-slate-500 font-mono tabular-nums hidden sm:inline">
              {activeSlotCount} active · Slot {String(selectedSlotIdx + 1).padStart(2, '0')} ({focusedSpec.shortName})
            </span>

            {/* Global Command History Buffer (Undo / Redo / Timeline) */}
            <CommandHistoryBar
              pastEntries={pastSummaries}
              futureEntries={futureSummaries}
              currentLabel={currentLabel}
              onUndo={undo}
              onRedo={redo}
              onJumpToPast={jumpToPast}
              onJumpToFuture={jumpToFuture}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'rack' && (
              <InsertRackView
                slots={slots}
                selectedSlotIdx={selectedSlotIdx}
                onSelectSlot={setSelectedSlotIdx}
                onUpdateSlot={handleUpdateSlot}
                onSwapModule={handleSwapModule}
                onMoveSlot={handleMoveSlot}
                activePresetId={activePresetId}
                onLoadPreset={handleLoadPreset}
                onClearAll={handleClearAll}
                quickSnapshot={quickSnapshot}
                onCaptureSnapshot={handleCaptureSnapshot}
                onRestoreSnapshot={handleRestoreSnapshot}
                archMode={archMode}
                onChangeArchMode={handleChangeArchMode}
                audioRunning={audioRunning}
                sequencerPlaying={sequencerPlaying}
                onToggleSequencer={handleToggleAudioOrSeq}
                onAuditionHit={handleAuditionHit}
              />
            )}

            {activeTab === 'synth' && (
              <SynthSequencerView
                synth={synth}
                activeSynthPresetId={activeSynthPresetId}
                onSelectSynthPreset={handleSelectSynthPreset}
                onUpdateSynth={handleUpdateSynth}
                sequencer={sequencer}
                onUpdateSequencer={handleUpdateSequencer}
                onUpdateLane={handleUpdateLane}
                sequencerPlaying={sequencerPlaying}
                onToggleSequencer={handleToggleAudioOrSeq}
                activeStep={activeStep}
                onTriggerPad={handleTriggerPad}
              />
            )}

            {activeTab === 'feasibility' && (
              <FeasibilityView
                onJumpToRack={() => setActiveTab('rack')}
                onJumpToExport={() => setActiveTab('export')}
              />
            )}

            {activeTab === 'export' && (
              <CloudSdkExportView slots={slots} archMode={archMode} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900/8 bg-white/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            HexaSlot Studio by <strong className="font-semibold text-slate-700">Lumina Aerospace</strong> · Built for Open MPC OS 3.10.1+ &amp; Akai MPC Plugin SDK
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://open-mpc.github.io/workflow.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              Open MPC Workflow
            </a>
            <a
              href="https://github.com/open-mpc/mpc-vst-plugins"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              open-mpc/mpc-vst-plugins
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
