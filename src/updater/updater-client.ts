export type DownloadProgressEvent =
  | { type: "started"; contentLength: number | null }
  | { type: "progress"; chunkLength: number }
  | { type: "finished" }

export interface AppUpdate {
  version: string
  currentVersion: string
  notes: string
  date: string | null
  download(
    onEvent: (event: DownloadProgressEvent) => void,
  ): Promise<void>
  install(): Promise<void>
  close(): Promise<void>
}

export interface UpdaterClient {
  isAvailable(): boolean
  getCurrentVersion(): Promise<string>
  check(): Promise<AppUpdate | null>
  relaunch(): Promise<void>
}

interface NativeDownloadEvent {
  event: "Started" | "Progress" | "Finished"
  data?: {
    contentLength?: number
    chunkLength?: number
  }
}

interface NativeUpdate {
  version: string
  currentVersion: string
  body?: string
  date?: string
  download(onEvent: (event: NativeDownloadEvent) => void): Promise<void>
  install(): Promise<void>
  close(): Promise<void>
}

interface NativeBindings {
  getVersion(): Promise<string>
  check(): Promise<NativeUpdate | null>
  relaunch(): Promise<void>
}

interface CreateUpdaterClientOptions {
  detectTauri: () => boolean
  loadBindings: () => Promise<NativeBindings>
}

function defaultDetectTauri() {
  return "__TAURI_INTERNALS__" in globalThis
}

async function defaultLoadBindings(): Promise<NativeBindings> {
  const [{ getVersion }, { check }, { relaunch }] = await Promise.all([
    import("@tauri-apps/api/app"),
    import("@tauri-apps/plugin-updater"),
    import("@tauri-apps/plugin-process"),
  ])
  return { check, getVersion, relaunch }
}

function mapDownloadEvent(
  event: NativeDownloadEvent,
): DownloadProgressEvent {
  if (event.event === "Started") {
    return {
      type: "started",
      contentLength: event.data?.contentLength ?? null,
    }
  }
  if (event.event === "Progress") {
    return {
      type: "progress",
      chunkLength: event.data?.chunkLength ?? 0,
    }
  }
  return { type: "finished" }
}

export function createUpdaterClient({
  detectTauri,
  loadBindings,
}: CreateUpdaterClientOptions): UpdaterClient {
  return {
    isAvailable: detectTauri,
    async getCurrentVersion() {
      if (!detectTauri()) return ""
      return (await loadBindings()).getVersion()
    },
    async check() {
      if (!detectTauri()) return null
      const nativeUpdate = await (await loadBindings()).check()
      if (!nativeUpdate) return null

      return {
        version: nativeUpdate.version,
        currentVersion: nativeUpdate.currentVersion,
        notes: nativeUpdate.body ?? "",
        date: nativeUpdate.date ?? null,
        async download(onEvent) {
          await nativeUpdate.download((event) =>
            onEvent(mapDownloadEvent(event)),
          )
        },
        async install() {
          await nativeUpdate.install()
        },
        async close() {
          await nativeUpdate.close()
        },
      }
    },
    async relaunch() {
      if (!detectTauri()) return
      await (await loadBindings()).relaunch()
    },
  }
}

export const tauriUpdaterClient = createUpdaterClient({
  detectTauri: defaultDetectTauri,
  loadBindings: defaultLoadBindings,
})
