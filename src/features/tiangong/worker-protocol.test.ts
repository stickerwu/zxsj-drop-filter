import { describe, expect, it } from "vitest"
import { createDefaultTianGongConfig } from "./config"
import { executeSolveRequest } from "./worker-protocol"
import type { SolverWorkerResponse } from "./worker-protocol"

describe("tiangong worker protocol", () => {
  it("streams progress and completes with the same request id", async () => {
    const config = {
      ...createDefaultTianGongConfig(),
      activeCells: [
        { row: 1, column: 0 },
        { row: 1, column: 1 },
        { row: 2, column: 0 },
        { row: 2, column: 1 },
      ],
      inventory: { square: 0, l: 0, t: 0, line: 0, j: 0 },
    }
    const messages: SolverWorkerResponse[] = []

    await executeSolveRequest(
      { type: "solve", requestId: "request-7", config },
      (message) => messages.push(message),
    )

    expect(messages[0]).toMatchObject({
      type: "progress",
      requestId: "request-7",
    })
    expect(messages.at(-1)).toMatchObject({
      type: "complete",
      requestId: "request-7",
      result: { status: "solved" },
    })
  })

  it("converts solver failures to request-scoped error messages", async () => {
    const messages: SolverWorkerResponse[] = []

    await executeSolveRequest(
      {
        type: "solve",
        requestId: "broken",
        config: createDefaultTianGongConfig(),
      },
      (message) => messages.push(message),
      async () => {
        throw new Error("solver exploded")
      },
    )

    expect(messages).toEqual([{
      type: "error",
      requestId: "broken",
      message: "solver exploded",
    }])
  })
})
