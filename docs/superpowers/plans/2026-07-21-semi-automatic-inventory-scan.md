# Semi-Automatic Inventory Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically capture a manually scrolled game inventory after the visible list has remained stable for 350ms.

**Architecture:** Rust owns frame sampling and a deterministic motion state machine. React polls the lightweight probe command only while a scan session is active and invokes the existing OCR capture command when the backend reports a new stable frame.

**Tech Stack:** Rust, Tauri v2, Windows.Graphics.Capture, React 19, HeroUI, Vitest.

## Global Constraints

- Never send mouse or keyboard input to the game.
- Keep `Ctrl+Shift+F8` and manual capture available.
- Keep all sampled frames and signatures in process memory only.
- Release as `v0.6.0`.

---

### Task 1: Motion State Machine

**Files:**
- Modify: `src-tauri/src/tiangong_inventory.rs`
- Test: `src-tauri/tests/inventory_domain.rs`

**Interfaces:**
- Produces: `AutoCaptureTracker::observe(signature, observed_at_ms)` and `mark_attempted(signature)`.

- [ ] Add failing tests for initial stability, scroll reset, and duplicate suppression.
- [ ] Run `cargo test --test inventory_domain auto_capture -- --nocapture` and verify failure.
- [ ] Implement the minimum tracker and status types.
- [ ] Run the focused tests and verify they pass.

### Task 2: Lightweight Probe Command

**Files:**
- Modify: `src-tauri/src/tiangong_capture.rs`
- Modify: `src-tauri/src/tiangong_scan.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/inventory_domain.rs`

**Interfaces:**
- Produces: Tauri command `probe_tiangong_inventory_scan(sessionId) -> AutoScanProbeResult`.

- [ ] Add a failing test for deterministic frame signatures.
- [ ] Run the focused Rust test and verify failure.
- [ ] Add right-side grayscale sampling, session validation, probe state, and command registration.
- [ ] Mark every OCR attempt signature before recognition so failed pages do not loop.
- [ ] Run the focused Rust tests and verify they pass.

### Task 3: React Continuous Scan Loop

**Files:**
- Modify: `src/features/tiangong/inventory-client.ts`
- Modify: `src/features/tiangong/inventory-scan-modal.tsx`
- Test: `src/features/tiangong/inventory-scan-modal.test.tsx`

**Interfaces:**
- Consumes: `probe_tiangong_inventory_scan`.
- Produces: default-on continuous scan toggle and visible scan state.

- [ ] Add failing component tests for default-on probing and stable-frame capture.
- [ ] Run `pnpm test src/features/tiangong/inventory-scan-modal.test.tsx`.
- [ ] Implement the client method, guarded polling loop, state copy, and HeroUI status controls.
- [ ] Run the focused component tests and verify they pass.

### Task 4: Documentation, Version, and Release

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.lock`

- [ ] Document manual scrolling with automatic capture and the unchanged safety boundary.
- [ ] Update all application versions to `0.6.0`.
- [ ] Run frontend tests, lint, build, Cargo tests/check, and release validation.
- [ ] Build the signed NSIS installer.
- [ ] Commit, create annotated tag `v0.6.0`, push GitHub/Gitee, and verify both release paths.
