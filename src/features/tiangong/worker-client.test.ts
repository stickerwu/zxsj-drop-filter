import { describe, expect, it, vi } from "vitest"
import { createDefaultTianGongConfig } from "./config"
import { createTianGongSolverClient } from "./worker-client"
import type { SolverWorkerResponse } from "./worker-protocol"

class FakeWorker {
  readonly listeners = new Map<string, Array<(event: MessageEvent) => void>>()
  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  emit(message: SolverWorkerResponse) {
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data: message } as MessageEvent)
    }
  }
}

describe("tiangong worker client", () => {
  it("terminates the previous worker and ignores stale responses", () => {
    const workers: FakeWorker[] = []
    const client = createTianGongSolverClient(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker
    })
    const firstComplete = vi.fn()
    const secondComplete = vi.fn()
    const handlers = (onComplete: typeof firstComplete) => ({
      onProgress: vi.fn(),
      onComplete,
      onError: vi.fn(),
    })

    const firstRequest = client.solve(
      createDefaultTianGongConfig(),
      handlers(firstComplete),
    )
    const secondRequest = client.solve(
      createDefaultTianGongConfig(),
      handlers(secondComplete),
    )
    const solvedResult = {
      status: "solved" as const,
      reason: "done" as const,
      solutions: [],
      truncated: null,
      durationMs: 1,
    }

    expect(workers[0].terminate).toHaveBeenCalledOnce()
    workers[0].emit({
      type: "complete",
      requestId: firstRequest,
      result: solvedResult,
    })
    workers[1].emit({
      type: "complete",
      requestId: secondRequest,
      result: solvedResult,
    })

    expect(firstComplete).not.toHaveBeenCalled()
    expect(secondComplete).toHaveBeenCalledWith(solvedResult)
  })
})
