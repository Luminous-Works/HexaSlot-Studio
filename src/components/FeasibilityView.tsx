import React from 'react';
import { CheckCircle2, AlertTriangle, Cloud, Cpu, Layers, Radio } from 'lucide-react';

interface FeasibilityViewProps {
  onJumpToExport: () => void;
  onJumpToRack: () => void;
}

export const FeasibilityView: React.FC<FeasibilityViewProps> = ({
  onJumpToExport,
  onJumpToRack,
}) => {
  return (
    <div className="space-y-6">
      {/* Executive Feasibility Verdict */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs text-slate-500">
              Verified against Open MPC Workflow · MPC OS 3.10.1+ · Gen2 MPC Live III (RK3588 aarch64)
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight text-balance">
              Yes — the 4-to-16 insert expander and cloud workflow work on MPC Live III, via single-slot VST2 chaining
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              MPC OS 3.10.1+ runs a dm-verity read-only rootfs on Gen2 hardware and hardcodes 4 mixer insert slots per track, so a plugin cannot add extra native slots to MPC&apos;s own mixer strip. However, an{' '}
              <strong className="font-semibold text-slate-900">Effect VST2 plugin loaded into Slot 1 of 4</strong>{' '}
              can internally expand that single slot into a <strong className="font-semibold text-slate-900">16-slot serial/parallel rack</strong>{' '}
              that saves with the <span className="font-mono text-slate-900">.xpj</span> project, maps cleanly across MPC&apos;s 2×8 Q-Links, and compiles entirely in GitHub Actions Docker containers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={onJumpToRack}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-900/12 text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Test 16-Slot Rack
            </button>
            <button
              type="button"
              onClick={onJumpToExport}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Generate Cloud SDK Bundle
            </button>
          </div>
        </div>
      </section>

      {/* Architecture Comparison: Native Modular DSP vs Dynamic Sub-Hosting */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-emerald-700">Recommended Production Path</div>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                01. Self-Contained 16-Slot Modular DSP Rack
              </h3>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            A single native <span className="font-mono text-slate-900">aarch64</span> /{' '}
            <span className="font-mono text-slate-900">armv7</span> VST2 Effect plugin compiled with 16 internal routing slots
            and vendored C/C++ DSP modules (filters, tape saturation, BBD delay, VCA comp, wavefolder, EQ, reverb).
          </p>

          <dl className="divide-y divide-slate-900/8 text-xs">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">MPC OS 3.10.1 Official Support</dt>
              <dd className="font-medium text-slate-900 text-right">100% compatible in VST2 Plugins/</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Audio Thread Safety</dt>
              <dd className="font-medium text-slate-900 text-right">Zero dlopen or disk I/O inside render()</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Project State Recall (.xpj)</dt>
              <dd className="font-mono text-slate-900 text-right">STATE_MAX = 65536 bytes</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Touchscreen &amp; Q-Link UX</dt>
              <dd className="font-medium text-slate-900 text-right">2×8 Bank Tabs + when= Inspector</dd>
            </div>
          </dl>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-amber-700">Advanced / Experimental Path</div>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                02. Dynamic VST2 .so Sub-Host Chainer
              </h3>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-1" />
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Because MPC plugins are Linux ELF shared libraries (<span className="font-mono text-slate-900">.so</span>), an effect
            plugin can act as a minimal VST2 sub-host that scans <span className="font-mono text-slate-900">VST2 Plugins/</span>{' '}
            and loads other third-party effects via <span className="font-mono text-slate-900">dlopen()</span>.
          </p>

          <dl className="divide-y divide-slate-900/8 text-xs">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Mount Execution Constraint</dt>
              <dd className="font-medium text-slate-900 text-right">Must avoid noexec USB/SD; use /nvme</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Directory Scan &amp; dlopen()</dt>
              <dd className="font-medium text-slate-900 text-right">Worker thread only (never w-&gt;lock)</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Sub-Plugin State Chunks</dt>
              <dd className="font-mono text-slate-900 text-right">Aggregate effGetChunk &lt; 128 MB cap</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Sub-Plugin Skin Rendering</dt>
              <dd className="font-medium text-slate-900 text-right">Generic macro Q-Links only</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Hardware, DSP, Sequencer & Cloud Engineering Matrix */}
      <section className="glass-panel rounded-2xl p-6 space-y-5">
        <h3 className="text-base font-semibold text-slate-900">
          Critical Implementation Specs from Open MPC Documentation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Cpu className="w-4 h-4 text-[#E11D2E]" />
              MPC Live III (Gen2)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Runs RK3588 <span className="font-mono text-slate-900">aarch64</span> Linux with PREEMPT_RT and{' '}
              <span className="font-mono text-slate-900">glibc 2.39</span>. No 32-bit libraries exist on Live III, so your release
              must ship an <span className="font-mono text-slate-900">aarch64</span> binary registered under{' '}
              <span className="font-mono text-slate-900">pluginList-arm-64bit</span> in{' '}
              <span className="font-mono text-slate-900">/nvme/VST2 Plugins</span>.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Layers className="w-4 h-4 text-blue-600" />
              128-Frame Lock &amp; Presets
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              MPC renders <span className="font-mono text-slate-900">128 frames @ 44.1 kHz</span> under{' '}
              <span className="font-mono text-slate-900">w-&gt;lock</span>. Factory synth presets work seamlessly when baked as static{' '}
              <span className="font-mono text-slate-900">const struct</span> tables in C (zero disk I/O in{' '}
              <span className="font-mono text-slate-900">set_param()</span>), plus{' '}
              <span className="font-mono text-slate-900">DISPLAY_REV_NO_UPDATE=1</span> so live meters don&apos;t close preset menus.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Radio className="w-4 h-4 text-[#E11D2E]" />
              Synth &amp; Sequencer MIDI
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Set <span className="font-mono text-slate-900">SAMPLE_ACCURATE=1</span> on synths for 0..127 in-block note timing.
              For generative sequencers, MPC ignores VST MIDI output, so open an independent{' '}
              <span className="font-mono text-slate-900">ALSA virtual MIDI port</span> selectable in MPC track inputs.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Cloud className="w-4 h-4 text-blue-600" />
              Cloud-Only Builds Work
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Even if your Akai SDK is local, GitHub Actions runs{' '}
              <span className="font-mono text-slate-900">build_port.sh</span> and{' '}
              <span className="font-mono text-slate-900">test_port.sh</span> inside Docker ({' '}
              <span className="font-mono text-slate-900">arm64v8/gcc:12-bookworm</span> &amp;{' '}
              <span className="font-mono text-slate-900">arm32v7/gcc:11-bullseye</span>), builds the 3.10.1+ zip, and feeds the
              nightly Open MPC catalog.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
