import { describe, expect, it, vi } from "vitest"
import {
  createUpdaterClient,
  type DownloadProgressEvent,
} from "./updater-client"

describe("updater client", () => {
  it("does not load native bindings outside Tauri", async () => {
    const loadBindings = vi.fn()
    const client = createUpdaterClient({
      detectTauri: () => false,
      loadBindings,
    })

    expect(client.isAvailable()).toBe(false)
    await expect(client.getCurrentVersion()).resolves.toBe("")
    await expect(client.check()).resolves.toBeNull()
    expect(loadBindings).not.toHaveBeenCalled()
  })

  it("maps native update metadata and download events", async () => {
    const nativeUpdate = {
      body: "- 修复更新",
      close: vi.fn().mockResolvedValue(undefined),
      currentVersion: "0.3.0",
      date: "2026-07-20T00:00:00Z",
      download: vi.fn(async (onEvent) => {
        onEvent({ event: "Started", data: { contentLength: 100 } })
        onEvent({ event: "Progress", data: { chunkLength: 40 } })
        onEvent({ event: "Finished" })
      }),
      install: vi.fn().mockResolvedValue(undefined),
      version: "0.3.1",
    }
    const bindings = {
      check: vi.fn().mockResolvedValue(nativeUpdate),
      getVersion: vi.fn().mockResolvedValue("0.3.0"),
      relaunch: vi.fn().mockResolvedValue(undefined),
    }
    const client = createUpdaterClient({
      detectTauri: () => true,
      loadBindings: vi.fn().mockResolvedValue(bindings),
    })
    const update = await client.check()
    const events: DownloadProgressEvent[] = []

    await update?.download((event) => events.push(event))

    expect(update).toMatchObject({
      currentVersion: "0.3.0",
      date: "2026-07-20T00:00:00Z",
      notes: "- 修复更新",
      version: "0.3.1",
    })
    expect(events).toEqual([
      { type: "started", contentLength: 100 },
      { type: "progress", chunkLength: 40 },
      { type: "finished" },
    ])
    await update?.install()
    await update?.close()
    expect(nativeUpdate.install).toHaveBeenCalledOnce()
    expect(nativeUpdate.close).toHaveBeenCalledOnce()
  })

  it("delegates version lookup and relaunch to native bindings", async () => {
    const bindings = {
      check: vi.fn().mockResolvedValue(null),
      getVersion: vi.fn().mockResolvedValue("0.3.0"),
      relaunch: vi.fn().mockResolvedValue(undefined),
    }
    const loadBindings = vi.fn().mockResolvedValue(bindings)
    const client = createUpdaterClient({
      detectTauri: () => true,
      loadBindings,
    })

    await expect(client.getCurrentVersion()).resolves.toBe("0.3.0")
    await client.relaunch()

    expect(bindings.getVersion).toHaveBeenCalledOnce()
    expect(bindings.relaunch).toHaveBeenCalledOnce()
    expect(loadBindings).toHaveBeenCalledTimes(2)
  })
})
