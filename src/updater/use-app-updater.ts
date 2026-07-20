import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react"
import {
  tauriUpdaterClient,
  type AppUpdate,
  type UpdaterClient,
} from "./updater-client"

export type AppUpdaterState =
  | { status: "unavailable" }
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date"; currentVersion: string }
  | {
      status: "downloading"
      currentVersion: string
      nextVersion: string
      progress: number | null
    }
  | {
      status: "ready"
      currentVersion: string
      nextVersion: string
      notes: string
      promptOpen: boolean
    }
  | {
      status: "installing"
      currentVersion: string
      nextVersion: string
      notes: string
    }
  | {
      status: "error"
      currentVersion: string | null
      message: string
    }

export interface AppUpdaterController {
  state: AppUpdaterState
  checkNow(): Promise<void>
  dismissPrompt(): void
  openPrompt(): void
  installAndRelaunch(): Promise<void>
}

interface UseAppUpdaterOptions {
  client?: UpdaterClient
  startupDelayMs?: number
}

type UpdaterAction =
  | { type: "checking" }
  | { type: "up-to-date"; currentVersion: string }
  | {
      type: "downloading"
      currentVersion: string
      nextVersion: string
      progress: number | null
    }
  | {
      type: "ready"
      currentVersion: string
      nextVersion: string
      notes: string
    }
  | { type: "dismiss-prompt" }
  | { type: "open-prompt" }
  | { type: "installing" }
  | {
      type: "error"
      currentVersion: string | null
      message: string
    }

function updaterReducer(
  state: AppUpdaterState,
  action: UpdaterAction,
): AppUpdaterState {
  switch (action.type) {
    case "checking":
      return { status: "checking" }
    case "up-to-date":
      return {
        status: "up-to-date",
        currentVersion: action.currentVersion,
      }
    case "downloading":
      return {
        status: "downloading",
        currentVersion: action.currentVersion,
        nextVersion: action.nextVersion,
        progress: action.progress,
      }
    case "ready":
      return {
        status: "ready",
        currentVersion: action.currentVersion,
        nextVersion: action.nextVersion,
        notes: action.notes,
        promptOpen: true,
      }
    case "dismiss-prompt":
      return state.status === "ready"
        ? { ...state, promptOpen: false }
        : state
    case "open-prompt":
      return state.status === "ready"
        ? { ...state, promptOpen: true }
        : state
    case "installing":
      return state.status === "ready"
        ? {
            status: "installing",
            currentVersion: state.currentVersion,
            nextVersion: state.nextVersion,
            notes: state.notes,
          }
        : state
    case "error":
      return {
        status: "error",
        currentVersion: action.currentVersion,
        message: action.message,
      }
  }
}

export function formatUpdaterError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  if (normalized.includes("signature")) {
    return "更新包签名验证失败"
  }
  if (normalized.includes("json") || normalized.includes("manifest")) {
    return "更新信息无效"
  }
  if (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("timeout")
  ) {
    return "网络连接失败，请稍后重试"
  }
  return "更新失败，请稍后重试"
}

export function useAppUpdater({
  client = tauriUpdaterClient,
  startupDelayMs = 1500,
}: UseAppUpdaterOptions = {}): AppUpdaterController {
  const [state, dispatch] = useReducer(
    updaterReducer,
    client.isAvailable()
      ? { status: "idle" }
      : { status: "unavailable" },
  )
  const updateRef = useRef<AppUpdate | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const mountedRef = useRef(true)

  const safeDispatch = useCallback((action: UpdaterAction) => {
    if (mountedRef.current) dispatch(action)
  }, [])

  const checkNow = useCallback(() => {
    if (!client.isAvailable()) return Promise.resolve()
    if (inFlightRef.current) return inFlightRef.current

    const operation = (async () => {
      let currentVersion: string | null = null
      safeDispatch({ type: "checking" })

      try {
        const resolvedCurrentVersion = await client.getCurrentVersion()
        currentVersion = resolvedCurrentVersion
        const previousUpdate = updateRef.current
        updateRef.current = null
        if (previousUpdate) await previousUpdate.close()

        const update = await client.check()
        if (!update) {
          safeDispatch({
            type: "up-to-date",
            currentVersion: resolvedCurrentVersion,
          })
          return
        }

        updateRef.current = update
        let totalBytes: number | null = null
        let receivedBytes = 0
        safeDispatch({
          type: "downloading",
          currentVersion: resolvedCurrentVersion,
          nextVersion: update.version,
          progress: null,
        })
        await update.download((event) => {
          if (event.type === "started") {
            totalBytes = event.contentLength
            receivedBytes = 0
          } else if (event.type === "progress") {
            receivedBytes += event.chunkLength
          }

          if (event.type !== "finished") {
            safeDispatch({
              type: "downloading",
              currentVersion:
                update.currentVersion || resolvedCurrentVersion,
              nextVersion: update.version,
              progress:
                totalBytes && totalBytes > 0
                  ? Math.min(
                      100,
                      Math.round((receivedBytes / totalBytes) * 100),
                    )
                  : null,
            })
          }
        })
        safeDispatch({
          type: "ready",
          currentVersion: update.currentVersion || resolvedCurrentVersion,
          nextVersion: update.version,
          notes: update.notes,
        })
      } catch (error) {
        const failedUpdate = updateRef.current
        updateRef.current = null
        if (failedUpdate) {
          try {
            await failedUpdate.close()
          } catch {
            // The original updater error is more useful than cleanup failure.
          }
        }
        safeDispatch({
          type: "error",
          currentVersion,
          message: formatUpdaterError(error),
        })
      }
    })()

    inFlightRef.current = operation
    void operation.finally(() => {
      if (inFlightRef.current === operation) {
        inFlightRef.current = null
      }
    })
    return operation
  }, [client, safeDispatch])

  const dismissPrompt = useCallback(() => {
    safeDispatch({ type: "dismiss-prompt" })
  }, [safeDispatch])

  const openPrompt = useCallback(() => {
    safeDispatch({ type: "open-prompt" })
  }, [safeDispatch])

  const installAndRelaunch = useCallback(async () => {
    const update = updateRef.current
    if (!update) return

    safeDispatch({ type: "installing" })
    try {
      await update.install()
      await client.relaunch()
    } catch (error) {
      safeDispatch({
        type: "error",
        currentVersion: update.currentVersion,
        message: formatUpdaterError(error),
      })
    }
  }, [client, safeDispatch])

  useEffect(() => {
    if (!client.isAvailable()) return
    const timer = window.setTimeout(() => {
      void checkNow()
    }, startupDelayMs)
    return () => window.clearTimeout(timer)
  }, [checkNow, client, startupDelayMs])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const update = updateRef.current
      updateRef.current = null
      if (update) void update.close()
    }
  }, [])

  return {
    state,
    checkNow,
    dismissPrompt,
    openPrompt,
    installAndRelaunch,
  }
}
