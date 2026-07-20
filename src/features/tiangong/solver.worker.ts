/// <reference lib="webworker" />

import {
  executeSolveRequest,
  type SolverWorkerRequest,
} from "./worker-protocol"

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

workerScope.addEventListener("message", (event: MessageEvent<SolverWorkerRequest>) => {
  if (event.data.type !== "solve") return
  void executeSolveRequest(event.data, (message) => workerScope.postMessage(message))
})

export {}
