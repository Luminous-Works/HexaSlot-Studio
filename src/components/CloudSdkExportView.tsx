import React, { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import {
  generateCatalogJson,
  generateCloudReleaseYml,
  generateEngineC,
  generateLayoutConf,
  generateParamsJson,
  generateVstJson,
  SdkBundleConfig,
} from '../data/openMpcSpec';
import { ChainArchitectureMode, InsertSlotState } from '../types/mpc';
import { GlassSelect, GlassSelectOption } from './GlassSelect';

interface CloudSdkExportViewProps {
  slots: InsertSlotState[];
  archMode: ChainArchitectureMode;
}

type ExportFileKey = 'vst' | 'params' | 'layout' | 'catalog' | 'engine' | 'workflow';

const STATE_MAX_OPTIONS: Array<GlassSelectOption<number>> = [
  { value: 8192, label: '8,192 bytes (8 KB)', meta: 'Wrapper default' },
  { value: 65536, label: '65,536 bytes (64 KB)', meta: 'Recommended for 16 Slots' },
  { value: 262144, label: '262,144 bytes (256 KB)', meta: 'Sub-Host Chunk Reserve' },
];

export const CloudSdkExportView: React.FC<CloudSdkExportViewProps> = ({ slots, archMode }) => {
  const [cfg, setCfg] = useState<SdkBundleConfig>({
    pluginName: 'HexaSlot 16',
    vendor: 'Lumina Aerospace',
    uid: 'HX16',
    catalogId: 'hexaslot-16',
    githubRepo: 'github.com/Luminous-Works/HexaSlot-Studio',
    includeGen1: true,
    includeGen2LiveIII: true,
    stateMaxBytes: 65536,
    sampleAccurate: false,
    archMode,
  });

  const [activeFile, setActiveFile] = useState<ExportFileKey>('vst');
  const [copied, setCopied] = useState(false);

  const syncedCfg: SdkBundleConfig = { ...cfg, archMode };

  const files = useMemo(
    () => ({
      vst: { name: 'vst/vst.json', content: generateVstJson(syncedCfg) },
      params: { name: 'vst/params.json', content: generateParamsJson(slots) },
      layout: { name: 'vst/layout.conf', content: generateLayoutConf(slots) },
      catalog: { name: `catalog/plugins/${syncedCfg.catalogId}.json`, content: generateCatalogJson(syncedCfg) },
      engine: { name: 'src/engine.c', content: generateEngineC(syncedCfg) },
      workflow: { name: '.github/workflows/mpc-release.yml', content: generateCloudReleaseYml(syncedCfg) },
    }),
    [syncedCfg, slots]
  );

  const currentFile = files[activeFile];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name.split('/').pop() ?? 'export.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Plugin Manifest & Target Architecture Settings */}
      <section className="xl:col-span-4 glass-panel rounded-2xl p-5 space-y-4">
        <div>
          <div className="text-xs text-slate-500">Live Manifest Synced with 16-Slot Rack</div>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">Cloud Build Configuration</h2>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Plugin Name
            <input
              type="text"
              value={cfg.pluginName}
              onChange={(e) => setCfg((c) => ({ ...c, pluginName: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white border border-slate-900/12 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-600">
              Vendor
              <input
                type="text"
                value={cfg.vendor}
                onChange={(e) => setCfg((c) => ({ ...c, vendor: e.target.value }))}
                className="mt-1 w-full rounded-xl bg-white border border-slate-900/12 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              4-Char VST UID
              <input
                type="text"
                maxLength={4}
                value={cfg.uid}
                onChange={(e) => setCfg((c) => ({ ...c, uid: e.target.value.toUpperCase() }))}
                className="mt-1 w-full rounded-xl bg-white border border-slate-900/12 px-3 py-2 text-sm font-mono text-slate-900"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-600">
            Catalog ID
            <input
              type="text"
              value={cfg.catalogId}
              onChange={(e) => setCfg((c) => ({ ...c, catalogId: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white border border-slate-900/12 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            GitHub Repository
            <input
              type="text"
              value={cfg.githubRepo}
              onChange={(e) => setCfg((c) => ({ ...c, githubRepo: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white border border-slate-900/12 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </label>

          <GlassSelect
            id="state-max-select"
            label="STATE_MAX Chunk Cap (Bytes)"
            value={cfg.stateMaxBytes}
            options={STATE_MAX_OPTIONS}
            onChange={(stateMaxBytes) => setCfg((c) => ({ ...c, stateMaxBytes }))}
          />

          <div className="pt-2 space-y-2 border-t border-slate-900/8">
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.includeGen2LiveIII}
                onChange={(e) => setCfg((c) => ({ ...c, includeGen2LiveIII: e.target.checked }))}
                className="rounded accent-slate-900 w-4 h-4"
              />
              Build Gen2 aarch64 (MPC Live III / XL / One G2)
            </label>
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.includeGen1}
                onChange={(e) => setCfg((c) => ({ ...c, includeGen1: e.target.checked }))}
                className="rounded accent-slate-900 w-4 h-4"
              />
              Build Gen1 armv7 (MPC Live II / One / X / Force)
            </label>
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.sampleAccurate}
                onChange={(e) => setCfg((c) => ({ ...c, sampleAccurate: e.target.checked }))}
                className="rounded accent-slate-900 w-4 h-4"
              />
              Enable SAMPLE_ACCURATE (0..127 synth note timing)
            </label>
          </div>
        </div>
      </section>

      {/* Right: Generated Open MPC Artifact Previewer */}
      <section className="xl:col-span-8 glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-900/6 border border-slate-900/8">
            {(
              [
                ['vst', 'vst.json'],
                ['params', 'params.json'],
                ['layout', 'layout.conf'],
                ['engine', 'engine.c'],
                ['workflow', 'mpc-release.yml'],
                ['catalog', 'catalog.json'],
              ] as Array<[ExportFileKey, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFile(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeFile === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-900/12 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500">{currentFile.name}</div>

        <pre className="rounded-xl tactile-well text-slate-100 p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[540px] border border-white/10">
          <code>{currentFile.content}</code>
        </pre>
      </section>
    </div>
  );
};
