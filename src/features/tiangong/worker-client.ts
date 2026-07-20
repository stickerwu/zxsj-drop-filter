import type { TianGongConfigV1, TianGongSolution, TianGongSolveResult } from "./types"
import type { SolverWorkerRequest, SolverWorkerResponse } from "./worker-protocol"

export interface TianGongSolverHandlers {
  onProgress: (solutions: TianGongSolution[]) => void
  onComplete: (result: TianGongSolveResult) => void
  onError: (message: string) => void
}

export interface TianGongSolverClient {
  solve: (
    config: TianGongConfigV1,
    handlers: TianGongSolverHandlers,
  ) => string
  cancel: () => void
  dispose: () => void
}

export interface SolverWorkerPort {
  addEventListener: (
    type: "message" | "error",
    listener: (event: MessageEvent<SolverWorkerResponse> | Event) => void,
  ) => void
  postMessage: (request: SolverWorkerRequest) => void
  terminate: () => void
}

type SolverWorkerFactory = () => SolverWorkerPort

function createBrowserWorker(): SolverWorkerPort {
  return new Worker(
    new URL("./solver.worker.ts", import.meta.url),
    { type: "module" },
  )
}

export function createTianGongSolverClient(
  createWorker: SolverWorkerFactory = createBrowserWorker,
): TianGongSolverClient {
  let worker: SolverWorkerPort | null = null
  let activeRequestId: string | null = null

  const cancel = () => {
    worker?.terminate()
    worker = null
    activeRequestId = null
  }

  return {
    solve(config, handlers) {
      cancel()
      const requestId = crypto.randomUUID()
      const nextWorker = createWorker()
      worker = nextWorker
      activeRequestId = requestId

      nextWorker.addEventListener(
        "message",
        (event) => {
          if (!("data" in event)) return
          if (event.data.requestId !== activeRequestId) return
          if (event.data.type === "progress") {
            handlers.onProgress(event.data.solutions)
            return
          }
          if (event.data.type === "complete") {
            handlers.onComplete(event.data.result)
            cancel()
            return
          }
          handlers.onError(event.data.message)
          cancel()
        },
      )
      nextWorker.addEventListener("error", () => {
        if (activeRequestId !== requestId) return
        handlers.onError("机巧盘求解进程异常退出")
        cancel()
      })

      const request: SolverWorkerRequest = {
        type: "solve",
        requestId,
        config,
      }
      nextWorker.postMessage(request)
      return requestId
    },
    cancel,
    dispose: cancel,
  }
}
