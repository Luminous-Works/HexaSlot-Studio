# HexaSlot Studio — Lumina Aerospace

**HexaSlot Studio** is an interactive Web Audio DSP workbench, generative synthesis prototype, and cloud SDK packager built by **Lumina Aerospace** for **Akai MPC OS 3.10.1+** and **MPC Live III** (`Gen2 aarch64` + `Gen1 armv7`) via the [Open MPC](https://open-mpc.github.io/workflow.html) toolchain.

---

## Core Capabilities

### 1. 16-Slot Insert Expander (`16-Slot Rack`)
- **4-to-16 Channel Expansion:** Occupies a single MPC channel insert slot (`Slot 1 of 4`) and expands it into **16 serial DSP slots** mapped across **Q-Link Bank A (Slots 01–08)** and **Q-Link Bank B (Slots 09–16)**.
- **Real-Time Per-Slot Signal Metering:** Each active slot displays a 60fps vertical glow level meter fed by an independent Web Audio `AnalyserNode` at that slot's output so you can visually trace gain staging across the chain.
- **12 Live Web Audio DSP Modules:** Resonant Ladder Filter, Reel Tape Saturator, Stereo BBD Echo, Dense Hall Reverb, SP-1200 Decimator, Bus VCA Compressor, Juno-Style Chorus, 3-Band Sculpt EQ, West-Coast Wavefolder, Carrier Ring Modulator, Haas Stereo Imager, and Tuned Comb Resonator.
- **16 Chain Presets & Quick Slot Configuration:** Load 16 studio preset chains via a custom frosted-glass dropdown, or capture (`Alt+C`) and one-click restore (`Alt+R`) your current 16-slot layout in a temporary snapshot buffer.

### 2. Real-Time Synthesizer & Generative Euclidean Sequencer (`Synth & Sequencer`)
- **Dual-Oscillator + Sub + Resonant Filter Engine:** Real-time Web Audio synthesizer with **18 studio synth presets** (Bass, Lead, Pluck, Stab, Keys, Arp, and Pad patches), ADSR envelope, pre-filter drive, and a playable **16-Pad Velocity Trigger Grid** (click or keyboard `1–4 / Q–R / A–F / Z–V`).
- **4-Lane Generative Euclidean Sequencer:** Bjorklund Euclidean rhythm generator with concentric SVG geometric visualizer, per-lane Steps, Pulses, Rotation, Probability, Scale Quantizer, and MPC Swing.

### 3. Global Command History Buffer (`Ctrl/Cmd+Z` & `Ctrl/Cmd+Shift+Z`)
- Unified 60-step Undo/Redo timeline spanning **both** the 16-slot Rack and the Synth/Sequencer parameters, with continuous-drag gesture coalescing and direct timeline jump navigation.

### 4. MPC Live III Feasibility & Cloud SDK Packager (`Live III Feasibility` & `Cloud SDK Export`)
- Architecture guidance grounded in [`open-mpc/mpc-vst-plugins`](https://github.com/open-mpc/mpc-vst-plugins) for `RK3588 aarch64`, `/nvme/VST2 Plugins`, `pluginList-arm-64bit`, `STATE_MAX` chunk recall, `DISPLAY_REV_NO_UPDATE`, `SAMPLE_ACCURATE`, and ALSA Virtual MIDI routing.
- Dynamically generates `vst/vst.json`, `vst/params.json`, `vst/layout.conf`, `src/engine.c`, `catalog/plugins/hexaslot-16.json`, and `.github/workflows/mpc-release.yml` synced to your current rack state.

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build & Type-Check

```bash
npm run lint
npm run build
```

---

## Open MPC Cloud Release Workflow

1. Export your generated `vst/vst.json`, `vst/params.json`, `vst/layout.conf`, `src/engine.c`, and `.github/workflows/mpc-release.yml` from the **Cloud SDK Export** tab.
2. Push a version tag (`git tag v1.0.0 && git push --tags`) to trigger GitHub Actions Docker builds for both `armv7` (Gen1) and `aarch64` (Gen2 MPC Live III) plus offline ASan/UBSan host tests.
3. Publish the generated release zips and submit `catalog/plugins/hexaslot-16.json` to the Open MPC catalog.

---

© Lumina Aerospace
