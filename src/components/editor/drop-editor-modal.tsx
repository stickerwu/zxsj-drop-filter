import { useState } from "react"
import {
  Button,
  Checkbox,
  Input,
  ListBox,
  Modal,
  Select,
} from "@heroui/react"
import { Check, CheckCircle2, Gem, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { expandAttributeCombo } from "@/domain/attributes"
import { FILTER_ATTRIBUTES, type DropDataset, type DropEntry } from "@/domain/types"
import { useAppStore } from "@/store/app-store"

type SelectOption = {
  id: string
  label: string
}

function EditorSelect({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  compact?: boolean
}) {
  return (
    <Select
      aria-label={label}
      fullWidth
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key))
      }}
    >
      <Select.Trigger className={compact ? "h-[38px] min-h-[38px] rounded-md" : "h-10 min-h-10 rounded-md"}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-h-72 min-w-[var(--trigger-width)]">
        <ListBox aria-label={label}>
          {options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              <span className="flex w-full items-center justify-between gap-3">
                <span className="truncate">{option.label}</span>
                <ListBox.ItemIndicator>
                  {({ isSelected }) =>
                    isSelected
                      ? <Check className="size-3.5 text-[var(--app-accent)]" />
                      : null
                  }
                </ListBox.ItemIndicator>
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

export function DropEditorModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const dataset = useAppStore((state) => state.dataset)
  const setDataset = useAppStore((state) => state.setDataset)
  const [dungeonId, setDungeonId] = useState(dataset.dungeons[0]?.id ?? "")
  const dungeon = dataset.dungeons.find((item) => item.id === dungeonId)
    ?? dataset.dungeons[0]
  const [treasureId, setTreasureId] = useState(dungeon?.treasures[0]?.id ?? "")
  const treasure = dungeon?.treasures.find((item) => item.id === treasureId)
    ?? dungeon?.treasures[0]
  const [entries, setEntries] = useState<DropEntry[]>(treasure?.entries ?? [])
  const hasInvalidWeight = entries.some(
    (entry) => !Number.isFinite(entry.weight) || entry.weight <= 0,
  )

  const selectDungeon = (id: string) => {
    const nextDungeon = dataset.dungeons.find((item) => item.id === id)
    setDungeonId(id)
    setTreasureId(nextDungeon?.treasures[0]?.id ?? "")
    setEntries(nextDungeon?.treasures[0]?.entries ?? [])
  }

  const selectTreasure = (id: string) => {
    setTreasureId(id)
    setEntries(dungeon?.treasures.find((item) => item.id === id)?.entries ?? [])
  }

  const updateEntry = (id: string, patch: Partial<DropEntry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              ...patch,
              ...(patch.attributeCombo
                ? { expandedAttributes: expandAttributeCombo(patch.attributeCombo) }
                : {}),
            }
          : entry,
      ),
    )
  }

  const apply = () => {
    if (!dungeon || !treasure || hasInvalidWeight) return

    const next: DropDataset = {
      ...dataset,
      dungeons: dataset.dungeons.map((item) =>
        item.id !== dungeon.id
          ? item
          : {
              ...item,
              treasures: item.treasures.map((itemTreasure) =>
                itemTreasure.id === treasure.id
                  ? { ...itemTreasure, entries }
                  : itemTreasure,
              ),
            },
      ),
    }
    setDataset(next)
    toast.success("当前掉落表已保存并应用")
    onOpenChange(false)
  }

  const dungeonOptions = dataset.dungeons.map((item) => ({
    id: item.id,
    label: item.name,
  }))
  const treasureOptions = (dungeon?.treasures ?? []).map((item) => ({
    id: item.id,
    label: item.name,
  }))
  const slotOptions = dataset.slots.map((slot) => ({ id: slot, label: slot }))
  const attributeOptions = FILTER_ATTRIBUTES.map((attribute) => ({
    id: attribute,
    label: attribute,
  }))

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Trigger aria-hidden="true" className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" scroll="inside" size="lg">
          <Modal.Dialog
            className="flex h-[720px] max-h-[calc(100vh-2rem)] w-[min(1060px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-lg"
            data-editor-layout="reference"
          >
            <Modal.Header
              className="relative flex h-[72px] shrink-0 items-center justify-center px-6 py-0"
              data-testid="drop-editor-header"
            >
              <div
                className="flex min-w-0 items-center justify-center gap-4 text-center"
                data-testid="drop-editor-title-group"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                  <Gem className="size-5" />
                </span>
                <div className="min-w-0">
                  <Modal.Heading className="text-lg font-semibold">
                    掉落表编辑器
                  </Modal.Heading>
                  <p className="mt-1 truncate text-xs text-[var(--app-text-muted)]">
                    维护副本、宝鉴和部位 / 属性 / 权重，保存前请确认权重为正数。
                  </p>
                </div>
              </div>
              <Modal.CloseTrigger
                aria-label="关闭编辑器"
                className="absolute right-6 top-1/2 -translate-y-1/2"
              />
            </Modal.Header>

            <Modal.Body
              className="min-h-0 flex-1 overflow-hidden bg-[var(--app-surface-muted)] p-4"
              data-testid="drop-editor-body"
            >
              <div className="grid h-full min-h-0 grid-cols-[230px_minmax(0,1fr)] gap-4">
                <div
                  className="min-h-0 overflow-y-auto rounded-lg bg-[var(--app-surface)] p-4 shadow-sm"
                  data-testid="drop-editor-controls-surface"
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-[var(--app-text)]">副本</p>
                      <EditorSelect
                        label="副本"
                        value={dungeon?.id ?? ""}
                        options={dungeonOptions}
                        onChange={selectDungeon}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-[var(--app-text)]">宝鉴</p>
                      <EditorSelect
                        label="宝鉴"
                        value={treasure?.id ?? ""}
                        options={treasureOptions}
                        onChange={selectTreasure}
                      />
                    </div>
                    <Button
                      className="h-10 rounded-md"
                      fullWidth
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        setEntries((current) => [
                          ...current,
                          {
                            id: crypto.randomUUID(),
                            slot: dataset.slots[0] ?? "衣服",
                            attributeCombo: "会心",
                            expandedAttributes: ["会心"],
                            weight: 1,
                            verified: false,
                          },
                        ])
                      }
                    >
                      <Plus className="size-3.5" />
                      新增掉落行
                    </Button>
                    <Button
                      className="h-10 rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                      fullWidth
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        setEntries((current) =>
                          current.map((entry) => ({ ...entry, verified: true })),
                        )
                      }
                    >
                      <CheckCircle2 className="size-3.5" />
                      全部标为已核对
                    </Button>
                  </div>
                </div>

                <div
                  className="min-h-0 overflow-y-auto rounded-lg bg-[var(--app-surface)] p-3 shadow-sm"
                  data-testid="drop-editor-entries-surface"
                >
                  <div className="space-y-2">
                    {entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        data-testid={`drop-entry-row-${index}`}
                        data-row-density="compact"
                        className="grid h-[46px] grid-cols-[108px_108px_80px_minmax(180px,1fr)_38px_38px] items-center gap-2 rounded-md bg-[var(--app-surface)] px-2 shadow-sm"
                      >
                        <EditorSelect
                          compact
                          label="部位"
                          value={entry.slot}
                          options={slotOptions}
                          onChange={(value) => updateEntry(entry.id, { slot: value })}
                        />
                        <EditorSelect
                          compact
                          label="属性"
                          value={entry.attributeCombo}
                          options={attributeOptions}
                          onChange={(value) =>
                            updateEntry(entry.id, { attributeCombo: value })
                          }
                        />
                        <Input
                          aria-label="权重"
                          className="h-[38px] rounded-md"
                          min={0.01}
                          step={0.01}
                          type="number"
                          value={String(entry.weight)}
                          onChange={(event) =>
                            updateEntry(entry.id, { weight: Number(event.target.value) })
                          }
                        />
                        <Input
                          aria-label="展开属性"
                          className="h-[38px] rounded-md bg-[var(--app-surface-muted)] text-xs"
                          readOnly
                          value={entry.expandedAttributes.join(" + ")}
                        />
                        <Checkbox
                          aria-label="已核对"
                          isSelected={entry.verified}
                          onChange={(checked) =>
                            updateEntry(entry.id, { verified: checked })
                          }
                        >
                          <Checkbox.Content className="flex size-8 items-center justify-center">
                            <Checkbox.Control
                              className="editor-verified-control"
                              data-control-tone="strong"
                              data-testid="verified-control"
                            >
                              <Checkbox.Indicator>
                                <Check className="size-3" />
                              </Checkbox.Indicator>
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                        <Button
                          aria-label="删除掉落行"
                          className="editor-delete-button size-8 min-w-8 rounded-md"
                          data-button-tone="strong"
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() =>
                            setEntries((current) =>
                              current.filter((item) => item.id !== entry.id),
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer
              className="flex h-[60px] shrink-0 items-center bg-[var(--app-surface-muted)] px-6 py-0 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]"
              data-testid="drop-editor-footer"
            >
              <div className="mr-auto min-h-5 text-xs text-red-600">
                {hasInvalidWeight ? "权重必须是大于 0 的数字" : null}
              </div>
              <Button className="h-10 rounded-md px-5" size="sm" variant="outline" onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                className="editor-save-button h-9 rounded-md px-5"
                data-button-tone="strong"
                isDisabled={hasInvalidWeight}
                size="sm"
                variant="primary"
                onPress={apply}
              >
                <Save className="size-3.5" />
                保存并应用
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
