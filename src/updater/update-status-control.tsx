import { useEffect, useId, useState } from "react"
import { Button, Tooltip } from "@heroui/react"
import {
  CircleCheck,
  Download,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import type { AppUpdaterController } from "./use-app-updater"

export function UpdateStatusControl({
  controller,
}: {
  controller: AppUpdaterController
}) {
  const { state } = controller
  const latestVersion =
    state.status === "up-to-date" ? state.currentVersion : null
  const [showLatestLabel, setShowLatestLabel] = useState(true)
  const errorDescriptionId = useId()

  useEffect(() => {
    if (!latestVersion) return
    const timer = window.setTimeout(() => setShowLatestLabel(false), 4000)
    return () => window.clearTimeout(timer)
  }, [latestVersion])

  if (state.status === "unavailable") return null

  let label = "检查更新"
  let icon = <RefreshCw className="size-3.5" />
  let disabled = false
  let primary = false
  let onPress: () => void = () => void controller.checkNow()

  if (state.status === "checking") {
    label = "正在检查更新"
    icon = <LoaderCircle className="size-3.5 animate-spin" />
    disabled = true
  } else if (state.status === "up-to-date") {
    label = showLatestLabel
      ? `已是最新 v${state.currentVersion}`
      : "检查更新"
    icon = <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-300" />
  } else if (state.status === "downloading") {
    label =
      state.progress === null
        ? `下载 v${state.nextVersion}`
        : `下载 v${state.nextVersion} · ${state.progress}%`
    icon = <Download className="size-3.5" />
    disabled = true
  } else if (state.status === "ready") {
    label = `更新已就绪 v${state.nextVersion}`
    icon = <CircleCheck className="size-3.5" />
    primary = true
    onPress = controller.openPrompt
  } else if (state.status === "installing") {
    label = "正在安装更新"
    icon = <LoaderCircle className="size-3.5 animate-spin" />
    disabled = true
    primary = true
  } else if (state.status === "error") {
    label = "更新失败，点击重试"
    icon = <TriangleAlert className="size-3.5" />
  }

  const button = (
    <Button
      aria-describedby={
        state.status === "error" ? errorDescriptionId : undefined
      }
      aria-label={label}
      className="toolbar-command update-status-command"
      data-update-status={state.status}
      isDisabled={disabled}
      isIconOnly={state.status === "up-to-date" && !showLatestLabel}
      size="sm"
      variant={primary ? "primary" : "outline"}
      onPress={onPress}
    >
      {icon}
      {state.status !== "up-to-date" || showLatestLabel ? label : null}
    </Button>
  )

  if (state.status !== "error") return button

  return (
    <>
      <Tooltip>
        {button}
        <Tooltip.Content>{state.message}</Tooltip.Content>
      </Tooltip>
      <span id={errorDescriptionId} className="sr-only">
        {state.message}
      </span>
    </>
  )
}
