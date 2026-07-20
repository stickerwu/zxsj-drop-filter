import { solveTianGong } from "./solver"
import type {
  TianGongConfigV1,
  TianGongSolution,
  TianGongSolveResult,
} from "./types"

export interface SolverWorkerRequest {
  type: "solve"
  requestId: string
  config: TianGongConfigV1
}

export type SolverWorkerResponse =
  | {
      type: "progress"
      requestId: string
      solutions: TianGongSolution[]
    }
  | {
      type: "complete"
      requestId: string
      result: TianGongSolveResult
    }
  | {
      type: "error"
      requestId: string
      message: string
    }

type SolveFunction = typeof solveTianGong

export async function executeSolveRequest(
  request: SolverWorkerRequest,
  emit: (message: SolverWorkerResponse) => void,
  solve: SolveFunction = solveTianGong,
) {
  try {
    const result = await solve(request.config, {
      onProgress: (solutions) => {
        emit({
          type: "progress",
          requestId: request.requestId,
          solutions,
        })
      },
    })
    emit({
      type: "complete",
      requestId: request.requestId,
      result,
    })
  } catch (error) {
    emit({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "机巧盘求解失败",
    })
  }
}
