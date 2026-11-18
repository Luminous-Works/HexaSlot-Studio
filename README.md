# HexaSlot Studio — Lumina Aerospace

**HexaSlot 16** (`HexaSlot Studio`) is a native **Akai MPC VST2 plugin architecture** and **Open MPC Cloud SDK Studio** built by **Lumina Aerospace** for **Akai MPC OS 3.10.1+** and **MPC Live III** (`Gen2 RK3588 aarch64` + `Gen1 armv7`) using the [Open MPC](https://open-mpc.github.io/workflow.html) toolchain.

> **Target Hardware Architecture:** On MPC Live III (`RK3588 aarch64`) and Gen1 MPCs (`armv7`), **HexaSlot 16** runs as a **native compiled C/C++ Linux VST2 shared library (`.so`)** rendering `44.1 kHz / 128-frame` blocks inside MPC OS 3.10.1+. The studio interface in `src/` provides an interactive real-time preview designer for configuring 16-slot chains, testing synth patches, mapping MPC hardware controls, and exporting the native C/Open MPC SDK build bundle.

---

## Native MPC Live III Plugin Architecture

### 1. 16-Slot Insert Expander (`hexaslot_16.so`)
- **4-to-16 Channel Expansion:** Loads as a single native VST2 Effect in **Slot 1 of 4** on any MPC track and expands it internally into **16 serial DSP slots** mapped across **Q-Link Bank A (Slots 01–08)** and **Q-Link Bank B (Slots 09–16)**.
- **Real-Time C DSP Chain (`src/engine.c`):** Zero heap allocation, zero `dlopen()`, and zero disk I/O inside `mpc_engine_render()`. Supports 12 modular processors (Resonant Ladder Filter, Reel Tape Saturator, Stereo BBD Echo, Dense Hall Reverb, SP-1200 Decimator, Bus VCA Compressor, Juno-Style Chorus, 3-Band Sculpt EQ, West-Coast Wavefolder, Carrier Ring Modulator, Haas Stereo Imager, and Tuned Comb Resonator).
- **MPC Project State & Touchscreen Skin:** Configured with `STATE_MAX = 65536` for `.xpj` state recall, `HAS_DISPLAY_REV = 1` / `DISPLAY_REV_NO_UPDATE = 1` so live slot level meters don't dismiss popup menus, and a 2×8 Q-Link `layout.conf` skin.
- **16 Chain Presets & Quick Slot Configuration:** Switch between 16 factory multi-slot chains or capture (`Alt+C`) and restore (`Alt+R`) a temporary 16-slot layout snapshot.

### 2. Synth Engine, Euclidean Sequencer & Hardware MIDI Mapping
- **Dual-Oscillator + Sub + Resonant Filter Prototype:** Includes **18 studio synth presets** (compiled as static `const struct` lookup tables in C for real-time preset switching with zero disk I/O), `SAMPLE_ACCURATE=1` in-block note timing, and a 16-pad velocity trigger grid.
- **4-Lane Generative Euclidean Sequencer:** Bjorklund pattern generator with concentric visual wheel, per-lane Steps, Pulses, Rotation, Probability, Scale Quantizer, and MPC Swing. Because MPC's JUCE host ignores VST MIDI output, standalone generative sequencers open an independent **ALSA Virtual MIDI** port selectable under `Preferences → MIDI`.
- **MPC Live III MIDI Mapping & Active Mapping Overlay (`Alt+M`):** Right-click any synth parameter or sequencer lane control to bind it to MPC Live III Q-Link Banks A–D (`CC 16–31`), Touch Strip (`CC 1`), XYFX, or Data Dial via Web MIDI Learn or direct assignment.

### 3. Global Command History Buffer (`Ctrl/Cmd+Z` & `Ctrl/Cmd+Shift+Z`)
- 60-step Undo/Redo history spanning the 16-slot Rack, Synth/Sequencer parameters, and MIDI mappings with continuous-drag coalescing and direct timeline jump navigation.

### 4. Open MPC Cloud Build & Release (`Cloud SDK Export`)
- Generates `vst/vst.json`, `vst/params.json`, `vst/layout.conf`, `src/engine.c`, `catalog/plugins/hexaslot-16.json`, and `.github/workflows/mpc-release.yml` synced directly to your rack layout.
- Cross-compiles `aarch64` (Gen2 MPC Live III) and `armv7` (Gen1) `.so` binaries inside Open MPC's Docker containers (`arm64v8/gcc:12-bookworm` & `arm32v7/gcc:11-bullseye`) with offline ASan/UBSan host tests.

---

## Plugin Screenshots & Open MPC Checklist

Before submitting to the [Open MPC Catalog](https://github.com/open-mpc/mpc-vst-plugins):
1. Render clean touchscreen skin screenshots from your `layout.conf` using Open MPC's Skin Studio (`"$MPC_VST/tools/studio.py" preview "build/skin/<vendor> - VST - <Name>/Plugin Skins" -o page_%d.png`) and place only plugin-specific screenshots inside `screenshots/`.
2. Never commit desktop/browser screenshots or `public/assets/aistudio/` attachments.
3. Push a version tag (`git tag v1.0.0 && git push --tags`) to build and package release `.zip` artifacts for `aarch64` and `armv7`.

---

## Local Studio UI Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

```bash
npm run lint
npm run build
```

---

© Lumina Aerospace
