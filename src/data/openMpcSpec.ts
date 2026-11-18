import { DSP_MODULES } from './dspCatalog';
import { ChainArchitectureMode, InsertSlotState } from '../types/mpc';

export interface SdkBundleConfig {
  pluginName: string;
  vendor: string;
  uid: string;
  catalogId: string;
  githubRepo: string;
  includeGen1: boolean;
  includeGen2LiveIII: boolean;
  stateMaxBytes: number;
  sampleAccurate: boolean;
  archMode: ChainArchitectureMode;
}

export function generateVstJson(cfg: SdkBundleConfig): string {
  const targets: string[] = [];
  if (cfg.includeGen1) targets.push('armv7');
  if (cfg.includeGen2LiveIII) targets.push('aarch64');

  const doc = {
    name: cfg.pluginName,
    vendor: cfg.vendor,
    uid: cfg.uid.slice(0, 4).padEnd(4, 'X'),
    version: 1000,
    so: `${cfg.catalogId.replace(/[^a-z0-9_]/gi, '_')}.so`,
    params: 'params.json',
    layout: 'layout.conf',
    targets,
    defines: {
      MODULE_SUBDIR: '"engine"',
      STATE_MAX: cfg.stateMaxBytes,
      HAS_DISPLAY_REV: 1,
      DISPLAY_REV_NO_UPDATE: 1,
      ...(cfg.sampleAccurate ? { SAMPLE_ACCURATE: 1 } : {}),
      ...(cfg.archMode === 'subhost-vst2' ? { ENABLE_VST2_SUBHOST: 1 } : {}),
    },
    build: {
      root: '..',
      sources: ['src/engine.c'],
      cflags: ['-Isrc', '-O3'],
      libs: ['-lm', '-lpthread', '-ldl'],
    },
  };
  return JSON.stringify(doc, null, 2);
}

export function generateParamsJson(slots: InsertSlotState[]): string {
  const moduleKeys = Object.keys(DSP_MODULES);
  const parameters: Array<Record<string, unknown>> = [
    { key: 'slot_page', name: 'Slot Focus', type: 'enum', options: Array.from({ length: 16 }, (_, i) => `Slot ${i + 1}`), default: 0 },
    { key: 'master_mix', name: 'Rack Dry/Wet', type: 'float', min: 0, max: 100, default: 100, unit: '%' },
  ];

  slots.forEach((slot, idx) => {
    const n = idx + 1;
    const modIndex = Math.max(0, moduleKeys.indexOf(slot.moduleId));
    parameters.push(
      { key: `s${n}_mod`, name: `Slot ${n} Engine`, type: 'enum', options: moduleKeys.map((k) => DSP_MODULES[k as keyof typeof DSP_MODULES].shortName), default: modIndex },
      { key: `s${n}_byp`, name: `Slot ${n} Bypass`, type: 'bool', default: slot.bypassed ? 1 : 0 },
      { key: `s${n}_mix`, name: `Slot ${n} Mix`, type: 'float', min: 0, max: 100, default: slot.mix, unit: '%' },
      { key: `s${n}_p1`, name: `Slot ${n} Macro 1`, type: 'float', min: 0, max: 100, default: 50 },
      { key: `s${n}_p2`, name: `Slot ${n} Macro 2`, type: 'float', min: 0, max: 100, default: 50 }
    );
  });

  return JSON.stringify(
    {
      note: 'Parameter order is append-only once released: MPC projects save values by parameter index.',
      sections: [
        { title: 'Bank 1 (Slots 1-8)', prefix: 's1..s8' },
        { title: 'Bank 2 (Slots 9-16)', prefix: 's9..s16' },
      ],
      parameters,
    },
    null,
    2
  );
}

export function generateLayoutConf(slots: InsertSlotState[]): string {
  const lines = [
    '# Lumina Aerospace — MPC Touchscreen Skin Layout (2x8 Q-Link Grid + Mode Switching)',
    '# Render preview: "$MPC_VST/tools/studio.py" preview "build/skin/<vendor> - VST - <Name>/Plugin Skins" -o page_%d.png',
    '',
    'art = html',
    'theme_bg = #F8FAFC',
    'theme_lcd = #0F172A',
    'theme_accent = #E11D2E',
    '',
    'tab name="Slots 1-8"',
    'frame x=12 y=12 w=1256 h=400 title="Q-Link Bank 1 · Slots 1–8"',
  ];

  for (let i = 0; i < 8; i++) {
    const col = i * 154 + 26;
    const modName = DSP_MODULES[slots[i]?.moduleId ?? 'empty'].shortName;
    lines.push(
      `knob cx=${col + 46} cy=118 r=34 key=s${i + 1}_mix label="S${i + 1} ${modName}"`,
      `toggle cx=${col + 46} cy=210 key=s${i + 1}_byp label="Bypass"`,
      `knob cx=${col + 46} cy=310 r=32 key=s${i + 1}_p1 label="Macro 1"`
    );
  }

  lines.push(
    '',
    'tab name="Slots 9-16"',
    'frame x=12 y=12 w=1256 h=400 title="Q-Link Bank 2 · Slots 9–16"'
  );

  for (let i = 8; i < 16; i++) {
    const col = (i - 8) * 154 + 26;
    const modName = DSP_MODULES[slots[i]?.moduleId ?? 'empty'].shortName;
    lines.push(
      `knob cx=${col + 46} cy=118 r=34 key=s${i + 1}_mix label="S${i + 1} ${modName}"`,
      `toggle cx=${col + 46} cy=210 key=s${i + 1}_byp label="Bypass"`,
      `knob cx=${col + 46} cy=310 r=32 key=s${i + 1}_p1 label="Macro 1"`
    );
  }

  lines.push(
    '',
    'tab name="Slot Inspector"',
    'popup cx=40 cy=32 w=240 h=48 key=slot_page label="Active Slot"'
  );

  for (let i = 0; i < 16; i++) {
    lines.push(
      `knob cx=180 cy=180 r=44 key=s${i + 1}_p1 when=slot_page:${i} label="Param 1"`,
      `knob cx=360 cy=180 r=44 key=s${i + 1}_p2 when=slot_page:${i} label="Param 2"`,
      `knob cx=540 cy=180 r=44 key=s${i + 1}_mix when=slot_page:${i} label="Wet Mix"`
    );
  }

  return lines.join('\n');
}

export function generateCatalogJson(cfg: SdkBundleConfig): string {
  const entry = {
    id: cfg.catalogId,
    name: cfg.pluginName,
    author: cfg.vendor,
    repo: cfg.githubRepo,
    kind: 'effect',
    uid: cfg.uid.slice(0, 4).padEnd(4, 'X'),
    tags: ['effect', 'rack', '16-slots', 'modular', 'dsp'],
    summary:
      'Expands a single MPC channel insert slot into 16 serial modular DSP slots with 2x8 Q-Link bank paging and full chunk state recall.',
    targets: [
      ...(cfg.includeGen1 ? ['gen1'] : []),
      ...(cfg.includeGen2LiveIII ? ['gen2'] : []),
    ],
    mpc_os_min: '3.10.1',
    license: 'MIT',
  };
  return JSON.stringify(entry, null, 2);
}

export function generateEngineC(cfg: SdkBundleConfig): string {
  return `/* ${cfg.pluginName} — Native MPC OS 16-Slot Insert Expander (44.1 kHz / 128-frame contract) */
#include <math.h>
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "wrapper/engine.h"
#include "wrapper/plugin_dir.h"

#define NUM_SLOTS 16
#define SAMPLE_RATE 44100.0f

typedef struct {
  int module_id;
  int bypassed;
  float mix;
  float p1, p2, p3, p4;
  float z1_l, z1_r; /* filter state */
} SlotState;

typedef struct {
  SlotState slots[NUM_SLOTS];
  float master_mix;
  int focused_slot;
  uint32_t display_rev;
  pthread_mutex_t scan_lock;
  char module_dir[512];
} HexaSlotEngine;

void* mpc_engine_create(const char* module_dir) {
  HexaSlotEngine* e = (HexaSlotEngine*)calloc(1, sizeof(HexaSlotEngine));
  if (!e) return NULL;
  pthread_mutex_init(&e->scan_lock, NULL);
  if (module_dir) snprintf(e->module_dir, sizeof(e->module_dir), "%s", module_dir);
  e->master_mix = 1.0f;
  for (int i = 0; i < NUM_SLOTS; i++) {
    e->slots[i].mix = 0.75f;
    e->slots[i].p1 = 0.5f;
    e->slots[i].p2 = 0.5f;
  }
  /* Worker-thread scan only — never perform filesystem/dlopen I/O inside render() or set_param(). */
  return e;
}

void mpc_engine_destroy(void* ctx) {
  HexaSlotEngine* e = (HexaSlotEngine*)ctx;
  if (!e) return;
  pthread_mutex_destroy(&e->scan_lock);
  free(e);
}

void mpc_engine_render(void* ctx, float* out_l, float* out_r, int num_frames) {
  HexaSlotEngine* e = (HexaSlotEngine*)ctx;
  if (!e) return;

  for (int f = 0; f < num_frames; f++) {
    float l = out_l[f];
    float r = out_r[f];
    float dry_l = l, dry_r = r;

    for (int s = 0; s < NUM_SLOTS; s++) {
      SlotState* slot = &e->slots[s];
      if (slot->bypassed || slot->module_id == 0) continue;

      /* Serial DSP stage (replace or dispatch per module_id / sub-hosted VST2 instance) */
      float wet_l = l;
      float wet_r = r;
      if (slot->module_id == 1) {
        /* 1-pole Resonant Ladder approximation */
        float cutoff = 0.05f + slot->p1 * 0.85f;
        slot->z1_l += cutoff * (wet_l - slot->z1_l);
        slot->z1_r += cutoff * (wet_r - slot->z1_r);
        wet_l = slot->z1_l;
        wet_r = slot->z1_r;
      } else if (slot->module_id == 2) {
        /* Asymmetric Tape Saturator */
        float drive = 1.0f + slot->p1 * 6.0f;
        wet_l = tanhf(wet_l * drive);
        wet_r = tanhf(wet_r * drive);
      }

      float m = slot->mix;
      l = l * (1.0f - m) + wet_l * m;
      r = r * (1.0f - m) + wet_r * m;
    }

    out_l[f] = dry_l * (1.0f - e->master_mix) + l * e->master_mix;
    out_r[f] = dry_r * (1.0f - e->master_mix) + r * e->master_mix;
  }
}
`;
}

export function generateCloudReleaseYml(cfg: SdkBundleConfig): string {
  const arches = [
    ...(cfg.includeGen1 ? ['armv7'] : []),
    ...(cfg.includeGen2LiveIII ? ['aarch64'] : []),
  ];
  return `name: Open MPC Cloud Build & Release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        arch: [${arches.join(', ')}]
    steps:
      - name: Checkout Plugin & Submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Checkout Open MPC Toolchain
        uses: actions/checkout@v4
        with:
          repository: open-mpc/mpc-vst-plugins
          path: mpc-vst-plugins

      - name: Build Native MPC VST2 (\${{ matrix.arch }})
        run: |
          export MPC_VST="\${{ github.workspace }}/mpc-vst-plugins"
          "$MPC_VST/tools/build_port.sh" vst/vst.json \${{ matrix.arch }}

      - name: Run Offline Host & Memory Tests (ASan/UBSan)
        run: |
          export MPC_VST="\${{ github.workspace }}/mpc-vst-plugins"
          "$MPC_VST/tools/test_port.sh" vst/vst.json \${{ matrix.arch }}

      - name: Package MPC OS 3.10.1+ Release Zip
        run: |
          export MPC_VST="\${{ github.workspace }}/mpc-vst-plugins"
          python3 "$MPC_VST/tools/release.py" vst/vst.json --arch \${{ matrix.arch }} --out dist/

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${cfg.catalogId}-\${{ matrix.arch }}
          path: dist/*.zip
`;
}
