import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { TianGongInventorySnapshotV1 } from "./types"

export interface GameWindowCandidate {
  windowId: string
  processName: string
  title: string
  minimized: boolean
}

export interface BeginScanResult {
  sessionId: string
  window: GameWindowCandidate
  snapshot: TianGongInventorySnapshotV1
}

export type AutoScanPhase =
  | "waiting"
  | "scrolling"
  | "stable"
  | "captured"
  | "recognizing"

export interface AutoScanProbeResult {
  sessionId: string
  phase: AutoScanPhase
  stableForMs: number
  shouldCapture: boolean
}

export interface InventoryScannerClient {
  listWindows(): Promise<GameWindowCandidate[]>
  begin(windowId?: string, muted?: boolean): Promise<BeginScanResult>
  probe(sessionId: string): Promise<AutoScanProbeResult>
  capture(sessionId: string): Promise<TianGongInventorySnapshotV1>
  finish(sessionId: string): Promise<TianGongInventorySnapshotV1>
  cancel(sessionId?: string): Promise<void>
  load(): Promise<TianGongInventorySnapshotV1 | null>
  save(snapshot: TianGongInventorySnapshotV1): Promise<void>
  listenHotkey(handler: (sessionId: string) => void): Promise<() => void>
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

export const nativeInventoryScannerClient: InventoryScannerClient = {
  listWindows: () => isTauriRuntime() ? invoke("list_tiangong_game_windows") : Promise.resolve([]),
  begin: (windowId, muted) =>
    invoke("begin_tiangong_inventory_scan", { windowId, muted }),
  probe: (sessionId) =>
    invoke("probe_tiangong_inventory_scan", { sessionId }),
  capture: (sessionId) =>
    invoke("capture_tiangong_inventory_page", { sessionId }),
  finish: (sessionId) =>
    invoke("finish_tiangong_inventory_scan", { sessionId }),
  cancel: (sessionId) =>
    invoke("cancel_tiangong_inventory_scan", { sessionId }),
  load: () => isTauriRuntime() ? invoke("load_tiangong_inventory") : Promise.resolve(null),
  save: (snapshot) => invoke("save_tiangong_inventory", { snapshot }),
  listenHotkey: async (handler) =>
    isTauriRuntime() ? listen<{ sessionId: string }>("tiangong-inventory-hotkey", (event) => {
      handler(event.payload.sessionId)
    }) : () => undefined,
}
