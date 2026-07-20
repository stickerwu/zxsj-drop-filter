import { Button, Modal } from "@heroui/react"
import { ArrowRight, Download, RotateCw } from "lucide-react"
import type { AppUpdaterController } from "./use-app-updater"

export function UpdateReadyDialog({
  controller,
  canOpen,
}: {
  controller: AppUpdaterController
  canOpen: boolean
}) {
  const { state } = controller
  if (state.status !== "ready" && state.status !== "installing") {
    return null
  }

  const isInstalling = state.status === "installing"
  const isOpen =
    canOpen && (isInstalling || (state.status === "ready" && state.promptOpen))

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && state.status === "ready") {
          controller.dismissPrompt()
        }
      }}
    >
      <Modal.Trigger aria-hidden="true" className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center">
          <Modal.Dialog className="w-[min(520px,calc(100vw-2rem))] max-w-none overflow-hidden rounded-lg">
            <Modal.Header className="flex items-center gap-3 px-6 py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <Download className="size-5" />
              </span>
              <div className="min-w-0">
                <Modal.Heading className="text-lg font-semibold">
                  安装软件更新
                </Modal.Heading>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                  更新包已完成签名验证，可以立即安装。
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-4 px-6 pb-5 pt-0">
              <div className="flex items-center justify-center gap-3 rounded-md bg-[var(--app-surface-muted)] px-4 py-3">
                <span className="font-semibold text-[var(--app-text-muted)]">
                  v{state.currentVersion}
                </span>
                <ArrowRight className="size-4 text-[var(--app-accent)]" />
                <span className="font-semibold text-[var(--app-accent)]">
                  v{state.nextVersion}
                </span>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--app-text)]">
                  更新说明
                </p>
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-[var(--app-surface-muted)] p-3 text-sm leading-6 text-[var(--app-text-muted)]">
                  {state.notes || "本次更新包含稳定性与体验改进。"}
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-end gap-2 bg-[var(--app-surface-muted)] px-6 py-4">
              <Button
                isDisabled={isInstalling}
                size="sm"
                variant="outline"
                onPress={controller.dismissPrompt}
              >
                稍后安装
              </Button>
              <Button
                className="editor-save-button"
                isDisabled={isInstalling}
                size="sm"
                variant="primary"
                onPress={() => void controller.installAndRelaunch()}
              >
                {isInstalling ? (
                  <LoaderIcon />
                ) : (
                  <RotateCw className="size-3.5" />
                )}
                {isInstalling ? "正在安装" : "立即安装并重启"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function LoaderIcon() {
  return <RotateCw className="size-3.5 animate-spin" />
}
