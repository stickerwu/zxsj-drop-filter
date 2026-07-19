import { useState } from "react"
import {
  Button,
  Checkbox,
  Input,
  ListBox,
  Modal,
  Select,
  Surface,
} from "@heroui/react"
import { Check, CheckCircle2, Plus, Save, Trash2 } from "lucide-react"
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
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
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
      <Select.Trigger className="h-9 min-h-9">
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
          <Modal.Dialog className="flex h-[720px] max-h-[calc(100vh-2rem)] w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-lg">
            <Modal.Header className="shrink-0 border-b border-[var(--app-border)]">
              <div className="min-w-0">
                <Modal.Heading className="text-base font-semibold">
                  掉落表编辑器
                </Modal.Heading>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                  维护副本、宝鉴和部位 / 属性 / 权重，保存前请确认权重为正数。
                </p>
              </div>
              <Modal.CloseTrigger aria-label="关闭编辑器" />
            </Modal.Header>

            <Modal.Body className="min-h-0 flex-1 overflow-hidden p-0">
              <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
                <Surface className="min-h-0 overflow-y-auto rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3">
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
                    <div className="border-t border-[var(--app-border)] pt-3">
                      <p className="text-[11px] leading-5 text-[var(--app-text-muted)]">
                        当前表共 {entries.length} 条掉落。切换副本或宝鉴时，右侧列表会立即更新。
                      </p>
                    </div>
                    <Button
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
                </Surface>

                <div className="min-h-0 overflow-y-auto rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)]">
                  <div className="sticky top-0 z-10 grid grid-cols-[116px_116px_88px_minmax(160px,1fr)_86px] gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 text-[11px] font-medium text-[var(--app-text-muted)]">
                    <span>部位</span>
                    <span>属性</span>
                    <span>权重</span>
                    <span>展开属性</span>
                    <span className="text-center">操作</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        data-testid={`drop-entry-row-${index}`}
                        className="grid min-h-14 grid-cols-[116px_116px_88px_minmax(160px,1fr)_86px] items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2"
                      >
                        <EditorSelect
                          label="部位"
                          value={entry.slot}
                          options={slotOptions}
                          onChange={(value) => updateEntry(entry.id, { slot: value })}
                        />
                        <EditorSelect
                          label="属性"
                          value={entry.attributeCombo}
                          options={attributeOptions}
                          onChange={(value) =>
                            updateEntry(entry.id, { attributeCombo: value })
                          }
                        />
                        <Input
                          aria-label="权重"
                          className="h-9"
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
                          className="h-9 bg-[var(--app-surface-muted)] text-xs"
                          readOnly
                          value={entry.expandedAttributes.join(" + ")}
                        />
                        <div className="flex items-center justify-end gap-1">
                          <Checkbox
                            aria-label="已核对"
                            isSelected={entry.verified}
                            onChange={(checked) =>
                              updateEntry(entry.id, { verified: checked })
                            }
                          >
                            <Checkbox.Content>
                              <Checkbox.Control>
                                <Checkbox.Indicator>
                                  <Check className="size-3" />
                                </Checkbox.Indicator>
                              </Checkbox.Control>
                            </Checkbox.Content>
                          </Checkbox>
                          <Button
                            aria-label="删除掉落行"
                            className="text-red-600"
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="shrink-0 border-t border-[var(--app-border)]">
              <div className="mr-auto min-h-5 text-xs text-red-600">
                {hasInvalidWeight ? "权重必须是大于 0 的数字" : null}
              </div>
              <Button size="sm" variant="ghost" onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
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
