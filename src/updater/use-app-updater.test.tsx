import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  AppUpdate,
  DownloadProgressEvent,
  UpdaterClient,
} from "./updater-client"
import { useAppUpdater } from "./use-app-updater"

function createUpdate({
  events = [],
  installError = null,
}: {
  events?: DownloadProgressEvent[]
  installError?: Error | null
} = {}): AppUpdate & {
  close: ReturnType<typeof vi.fn>
  download: ReturnType<typeof vi.fn>
  install: ReturnType<typeof vi.fn>
} {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    currentVersion: "0.3.0",
    date: "2026-07-20T00:00:00Z",
    download: vi.fn(async (onEvent) => {
      for (const event of events) onEvent(event)
    }),
    install: installError
      ? vi.fn().mockRejectedValue(installError)
      : vi.fn().mockResolvedValue(undefined),
    notes: "- 自动更新",
    version: "0.3.1",
  }
}

function createClient({
  available = true,
  update = null,
}: {
  available?: boolean
  update?: AppUpdate | null
} = {}): UpdaterClient & {
  check: ReturnType<typeof vi.fn>
  getCurrentVersion: ReturnType<typeof vi.fn>
  relaunch: ReturnType<typeof vi.fn>
} {
  return {
    check: vi.fn().mockResolvedValue(update),
    getCurrentVersion: vi.fn().mockResolvedValue("0.3.0"),
    isAvailable: () => available,
    relaunch: vi.fn().mockResolvedValue(undefined),
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe("useAppUpdater", () => {
  it("checks after the startup delay and reports no update", async () => {
    vi.useFakeTimers()
    const client = createClient()
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 1500 }),
    )

    expect(result.current.state).toEqual({ status: "idle" })
    await act(() => vi.advanceTimersByTimeAsync(1499))
    expect(client.check).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))

    expect(client.check).toHaveBeenCalledOnce()
    expect(result.current.state).toEqual({
      status: "up-to-date",
      currentVersion: "0.3.0",
    })
  })

  it("stays unavailable outside Tauri", async () => {
    vi.useFakeTimers()
    const client = createClient({ available: false })
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 10 }),
    )

    await act(() => vi.advanceTimersByTimeAsync(20))

    expect(result.current.state).toEqual({ status: "unavailable" })
    expect(client.check).not.toHaveBeenCalled()
  })

  it("downloads automatically and accumulates progress", async () => {
    const update = createUpdate({
      events: [
        { type: "started", contentLength: 100 },
        { type: "progress", chunkLength: 30 },
        { type: "progress", chunkLength: 20 },
        { type: "finished" },
      ],
    })
    const client = createClient({ update })
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 60_000 }),
    )

    await act(() => result.current.checkNow())

    expect(update.download).toHaveBeenCalledOnce()
    expect(result.current.state).toEqual({
      status: "ready",
      currentVersion: "0.3.0",
      nextVersion: "0.3.1",
      notes: "- 自动更新",
      promptOpen: true,
    })
  })

  it("uses indeterminate progress when content length is unknown", async () => {
    let releaseDownload: () => void = () => undefined
    const downloadGate = new Promise<void>((resolve) => {
      releaseDownload = resolve
    })
    const update = createUpdate()
    update.download.mockImplementation(async (onEvent) => {
      onEvent({ type: "started", contentLength: null })
      onEvent({ type: "progress", chunkLength: 32 })
      await downloadGate
    })
    const client = createClient({ update })
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 60_000 }),
    )

    let operation: Promise<void>
    act(() => {
      operation = result.current.checkNow()
    })
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: "downloading",
        progress: null,
      })
    })
    await act(async () => {
      releaseDownload()
      await operation
    })
  })

  it("keeps a downloaded update after dismissing and reopening the prompt", async () => {
    const client = createClient({ update: createUpdate() })
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 60_000 }),
    )
    await act(() => result.current.checkNow())

    act(() => result.current.dismissPrompt())
    expect(result.current.state).toMatchObject({
      status: "ready",
      promptOpen: false,
    })

    act(() => result.current.openPrompt())
    expect(result.current.state).toMatchObject({
      status: "ready",
      promptOpen: true,
    })
  })

  it("installs before relaunching", async () => {
    const calls: string[] = []
    const update = createUpdate()
    update.install.mockImplementation(async () => {
      calls.push("install")
    })
    const client = createClient({ update })
    client.relaunch.mockImplementation(async () => {
      calls.push("relaunch")
    })
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 60_000 }),
    )
    await act(() => result.current.checkNow())

    await act(() => result.current.installAndRelaunch())

    expect(calls).toEqual(["install", "relaunch"])
  })

  it("maps signature failures to a readable retry state", async () => {
    const client = createClient()
    client.check.mockRejectedValue(new Error("signature verification failed"))
    const { result } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 60_000 }),
    )

    await act(() => result.current.checkNow())

    expect(result.current.state).toEqual({
      status: "error",
      currentVersion: "0.3.0",
      message: "更新包签名验证失败",
    })
  })

  it("merges concurrent checks and closes the update on unmount", async () => {
    let releaseCheck: (update: AppUpdate | null) => void = () => undefined
    const checkGate = new Promise<AppUpdate | null>((resolve) => {
      releaseCheck = resolve
    })
    const update = createUpdate()
    const client = createClient()
    client.check.mockReturnValue(checkGate)
    const { result, unmount } = renderHook(() =>
      useAppUpdater({ client, startupDelayMs: 60_000 }),
    )

    let first: Promise<void>
    let second: Promise<void>
    act(() => {
      first = result.current.checkNow()
      second = result.current.checkNow()
    })
    await waitFor(() => expect(client.check).toHaveBeenCalledOnce())
    await act(async () => {
      releaseCheck(update)
      await Promise.all([first, second])
    })

    unmount()
    await waitFor(() => expect(update.close).toHaveBeenCalledOnce())
  })
})
