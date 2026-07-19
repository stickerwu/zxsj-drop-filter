import { useMemo, useRef, useState } from "react"
import {
  Check,
  Clipboard,
  Database,
  FileDown,
  FileUp,
  Info,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { recommendTreasures } from "@/domain/recommendations"
import { parseJsonData, parseZxData, serializeJsonData, serializeZxData } from "@/domain/serialization"
import { expandAttributeCombo } from "@/domain/attributes"
import type { AttributeName, DropDataset, DropEntry, MatchMode } from "@/domain/types"
import { useAppStore } from "@/store/app-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const attributes: AttributeName[] = ["会心", "专精", "调息", "元御"]

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatExpected(value: number | null) {
  return value === null ? "不可命中" : value.toFixed(2)
}

function sectionTitle(title: string, count?: number) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {count !== undefined && <Badge variant="secondary">{count}</Badge>}
    </div>
  )
}

function FilterGroup({
  title,
  values,
  selected,
  onChange,
  columns = 3,
}: {
  title: string
  values: string[]
  selected: string[]
  onChange: (value: string[]) => void
  columns?: number
}) {
  const gridClass = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3"
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }
  return (
    <section className="border-b border-slate-200 px-4 py-3">
      {sectionTitle(title, selected.length || undefined)}
      <div className={`grid ${gridClass} gap-1.5`}>
        {values.map((value) => (
          <Button
            key={value}
            type="button"
            variant={selected.includes(value) ? "default" : "outline"}
            size="sm"
            className="h-8 justify-center px-2 text-xs"
            onClick={() => toggle(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onChange(values)}>
          全选
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
          不限
        </Button>
      </div>
    </section>
  )
}

function FilterSidebar() {
  const filters = useAppStore((state) => state.filters)
  const dataset = useAppStore((state) => state.dataset)
  const setFilter = useAppStore((state) => state.setFilter)
  return (
    <aside className="flex h-full min-w-0 flex-col bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontalIcon />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-950">筛选条件</h1>
            <p className="mt-0.5 text-xs text-slate-500">可以不选，结果会自动刷新</p>
          </div>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <FilterGroup
          title="想要的属性"
          values={attributes}
          selected={filters.attributes}
          onChange={(value) => setFilter("attributes", value as AttributeName[])}
        />
        <div className="border-b border-slate-200 px-4 py-3">
          <Label className="text-xs font-semibold text-slate-700">属性匹配</Label>
          <RadioGroup
            className="mt-2 grid gap-2"
            value={filters.mode}
            onValueChange={(value) => setFilter("mode", value as MatchMode)}
          >
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <RadioGroupItem value="any" />
              命中任一（推荐）
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <RadioGroupItem value="all" />
              同一词条全满足
            </label>
          </RadioGroup>
        </div>
        <FilterGroup
          title="装备部位"
          values={dataset.slots}
          selected={filters.slots}
          onChange={(value) => setFilter("slots", value)}
        />
        <FilterGroup
          title="限定副本"
          values={dataset.dungeons.map((dungeon) => dungeon.name)}
          selected={filters.dungeons}
          onChange={(value) => setFilter("dungeons", value)}
          columns={1}
        />
        <div className="px-4 py-4">
          <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-xs leading-5 text-teal-900">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><Info className="h-3.5 w-3.5" />计算说明</div>
            <p>命中概率 = 命中词条权重之和 ÷ 当前宝鉴总权重。</p>
            <p>期望次数 = 1 ÷ 命中概率。</p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}

function SlidersHorizontalIcon() {
  return <Settings2 className="h-4 w-4 text-teal-700" />
}

function CommandBar({ onOpenEditor }: { onOpenEditor: () => void }) {
  const clearFilters = useAppStore((state) => state.clearFilters)
  const setDataset = useAppStore((state) => state.setDataset)
  const inputRef = useRef<HTMLInputElement>(null)
  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = file.name.toLowerCase().endsWith(".zx")
        ? parseZxData(new Uint8Array(await file.arrayBuffer()))
        : parseJsonData(await file.text())
      setDataset(parsed.dataset)
      toast.success(`已载入 ${file.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "数据文件解析失败")
    }
  }
  const copyAll = async () => {
    await navigator.clipboard.writeText("诛仙世界 · 秘境掉落筛选")
    toast.success("已复制项目标题")
  }
  const exportJson = () => {
    const dataset = useAppStore.getState().dataset
    const blob = new Blob([serializeJsonData(dataset)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "drop-tables.json"
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("JSON 数据已导出")
  }
  const exportZx = () => {
    const dataset = useAppStore.getState().dataset
    const bytes = serializeZxData(dataset)
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    const blob = new Blob([copy.buffer], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "drop_tables.zx"
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("旧版 .zx 数据已导出")
  }
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm"><Sparkles className="h-4 w-4" /></div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-slate-950">秘境掉落筛选</span>
            <Badge className="bg-teal-50 text-teal-800 hover:bg-teal-50">演示数据</Badge>
          </div>
          <p className="text-xs text-slate-500">选择属性/部位即可自动推荐宝鉴</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept=".json,.zx,application/json,application/octet-stream" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}><FileUp />打开数据</Button>
        <Button variant="outline" size="sm" onClick={exportJson}><FileDown />导出 JSON</Button>
        <Button variant="outline" size="sm" onClick={exportZx}><FileDown />导出 .zx</Button>
        <Button variant="outline" size="sm" onClick={onOpenEditor}><Database />数据编辑</Button>
        <Button variant="outline" size="sm" onClick={() => { clearFilters(); toast.success("筛选条件已清空") }}><RotateCcw />清空条件</Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="复制标题" onClick={() => void copyAll()}><Clipboard /></Button></TooltipTrigger>
            <TooltipContent>复制当前摘要</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  )
}

function SummaryBanner({ recommendationCount, matchedRows }: { recommendationCount: number; matchedRows: number }) {
  const filters = useAppStore((state) => state.filters)
  const attributesText = filters.attributes.length ? filters.attributes.join(" + ") : "不限属性"
  const modeText = filters.mode === "any" ? "命中任一" : "同一词条全满足"
  return (
    <div className="border-b border-teal-200 bg-teal-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-teal-950">
        <span className="font-semibold">条件：</span>
        <span>{attributesText}</span><span className="text-teal-500">|</span>
        <span>{modeText}</span><span className="text-teal-500">|</span>
        <span>{filters.slots.length ? `${filters.slots.length} 个部位` : "部位不限"}</span><span className="text-teal-500">|</span>
        <span>{filters.dungeons.length ? `${filters.dungeons.length} 个副本` : "副本不限"}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-teal-800">
        <Check className="h-3.5 w-3.5" />
        <span>共命中 {matchedRows} 条掉落</span>
        <span className="text-teal-500">·</span>
        <span>{recommendationCount} 个推荐宝鉴</span>
      </div>
    </div>
  )
}

function RecommendationTable({ recommendations }: { recommendations: ReturnType<typeof recommendTreasures> }) {
  const selectedId = useAppStore((state) => state.selectedRecommendationId)
  const selectRecommendation = useAppStore((state) => state.selectRecommendation)
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <Table className="min-w-[760px]">
          <TableHeader className="sticky top-0 z-10 bg-slate-50">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>宝鉴</TableHead>
              <TableHead>最佳概率</TableHead>
              <TableHead>最佳副本</TableHead>
              <TableHead>平均概率</TableHead>
              <TableHead>命中组合</TableHead>
              <TableHead>命中条数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((item, index) => (
              <TableRow
                key={item.id}
                className={`cursor-pointer ${selectedId === item.id ? "bg-teal-50 hover:bg-teal-50" : "hover:bg-slate-50"}`}
                onClick={() => selectRecommendation(item.id)}
              >
                <TableCell className="text-center font-mono text-xs text-slate-500">{index + 1}</TableCell>
                <TableCell className="font-semibold text-slate-900">{item.treasureName}</TableCell>
                <TableCell><Badge variant={item.bestProbability >= 0.75 ? "default" : "secondary"}>{formatPercent(item.bestProbability)}</Badge></TableCell>
                <TableCell className="whitespace-nowrap">{item.bestDungeonName}</TableCell>
                <TableCell>{formatPercent(item.averageProbability)}</TableCell>
                <TableCell>{item.matchedCombinationCount}</TableCell>
                <TableCell>{item.totalMatchedRows}</TableCell>
              </TableRow>
            ))}
            {recommendations.length === 0 && (
              <TableRow><TableCell colSpan={7} className="h-40 text-center text-sm text-slate-500">当前条件没有命中掉落，请放宽属性或部位限制。</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

function DetailPanel({ recommendation }: { recommendation: ReturnType<typeof recommendTreasures>[number] | undefined }) {
  if (!recommendation) {
    return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">点击中央表格中的宝鉴查看完整命中装备。</div>
  }
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-700" />
            <h2 className="text-base font-bold text-slate-950">{recommendation.treasureName}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">{recommendation.bestDungeonName} · 最佳概率 {formatPercent(recommendation.bestProbability)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-slate-50 p-3"><p className="text-xs text-slate-500">命中概率</p><p className="mt-1 text-lg font-bold text-teal-800">{formatPercent(recommendation.bestMatch.probability)}</p></div>
          <div className="rounded-md border bg-slate-50 p-3"><p className="text-xs text-slate-500">期望次数</p><p className="mt-1 text-lg font-bold text-slate-900">{formatExpected(recommendation.bestMatch.expectedRuns)}</p></div>
        </div>
        <section>
          {sectionTitle("全部命中装备", recommendation.bestMatch.matchedEntries.length)}
          <div className="space-y-2">
            {recommendation.bestMatch.matchedEntries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between rounded-md border bg-white px-3 py-2">
                <div><p className="text-sm font-medium text-slate-900">{entry.slot} · {entry.attributeCombo}</p><p className="text-xs text-slate-500">展开属性：{entry.expandedAttributes.join(" + ")}</p></div>
                <Badge variant="outline">权重 {entry.weight}</Badge>
              </div>
            ))}
          </div>
        </section>
        <section>
          {sectionTitle("各副本表现")}
          <div className="space-y-1.5">
            {recommendation.dungeonDetails.map((detail) => (
              <div key={detail.dungeonId} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                <span className="truncate pr-2 text-slate-700">{detail.dungeonName}</span>
                <span className="font-semibold text-teal-800">{formatPercent(detail.probability)}</span>
              </div>
            ))}
          </div>
        </section>
        <Button className="w-full" variant="outline" onClick={() => {
          void navigator.clipboard.writeText(`${recommendation.bestDungeonName} + ${recommendation.treasureName}\n命中概率：${formatPercent(recommendation.bestProbability)}\n期望次数：${formatExpected(recommendation.bestMatch.expectedRuns)}\n${recommendation.bestMatch.matchedEntries.map((entry) => `${entry.slot} · ${entry.attributeCombo}`).join("\n")}`)
          toast.success("完整明细已复制")
        }}>
          <Clipboard />复制完整明细
        </Button>
      </div>
    </ScrollArea>
  )
}

function DataEditorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dataset = useAppStore((state) => state.dataset)
  const setDataset = useAppStore((state) => state.setDataset)
  const [dungeonId, setDungeonId] = useState(dataset.dungeons[0]?.id ?? "")
  const dungeon = dataset.dungeons.find((item) => item.id === dungeonId) ?? dataset.dungeons[0]
  const [treasureId, setTreasureId] = useState(dungeon?.treasures[0]?.id ?? "")
  const treasure = dungeon?.treasures.find((item) => item.id === treasureId) ?? dungeon?.treasures[0]
  const [entries, setEntries] = useState<DropEntry[]>(treasure?.entries ?? [])

  const selectTreasure = (id: string) => {
    setTreasureId(id)
    setEntries(dungeon?.treasures.find((item) => item.id === id)?.entries ?? [])
  }
  const updateEntry = (id: string, patch: Partial<DropEntry>) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch, ...(patch.attributeCombo ? { expandedAttributes: expandAttributeCombo(patch.attributeCombo) } : {}) } : entry))
  const apply = () => {
    if (!dungeon || !treasure) return
    const next: DropDataset = {
      ...dataset,
      dungeons: dataset.dungeons.map((item) => item.id !== dungeon.id ? item : {
        ...item,
        treasures: item.treasures.map((itemTreasure) => itemTreasure.id === treasure.id ? { ...itemTreasure, entries } : itemTreasure),
      }),
    }
    setDataset(next)
    toast.success("当前表已应用")
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>掉落表编辑器</DialogTitle>
          <DialogDescription>维护副本、宝鉴和部位/属性/权重。保存前请确认权重为正数。</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] grid-cols-[220px_1fr] gap-4 overflow-hidden">
          <div className="space-y-3 overflow-y-auto rounded-md border bg-slate-50 p-3">
            <Label>副本</Label>
            <select className="h-9 w-full rounded-md border bg-white px-2 text-sm" value={dungeon?.id} onChange={(event) => { setDungeonId(event.target.value); const next = dataset.dungeons.find((item) => item.id === event.target.value); setTreasureId(next?.treasures[0]?.id ?? ""); setEntries(next?.treasures[0]?.entries ?? []) }}>
              {dataset.dungeons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Label>宝鉴</Label>
            <select className="h-9 w-full rounded-md border bg-white px-2 text-sm" value={treasure?.id} onChange={(event) => selectTreasure(event.target.value)}>
              {dungeon?.treasures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Button className="w-full" variant="outline" onClick={() => setEntries((current) => [...current, { id: crypto.randomUUID(), slot: dataset.slots[0] ?? "衣服", attributeCombo: "会心", expandedAttributes: ["会心"], weight: 1, verified: false }])}><FileDown />新增掉落行</Button>
            <Button className="w-full" variant="secondary" onClick={() => setEntries((current) => current.map((entry) => ({ ...entry, verified: true })))}><Check />全部标为已核对</Button>
          </div>
          <ScrollArea className="rounded-md border">
            <div className="space-y-2 p-3">
              {entries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[120px_110px_90px_1fr_auto] items-center gap-2 rounded-md border bg-white p-2">
                  <select className="h-8 rounded border px-2 text-xs" value={entry.slot} onChange={(event) => updateEntry(entry.id, { slot: event.target.value })}>{dataset.slots.map((slot) => <option key={slot}>{slot}</option>)}</select>
                  <Input className="h-8 text-xs" value={entry.attributeCombo} onChange={(event) => updateEntry(entry.id, { attributeCombo: event.target.value })} />
                  <Input className="h-8 text-xs" type="number" min={0.01} step={0.01} value={entry.weight} onChange={(event) => updateEntry(entry.id, { weight: Number(event.target.value) })} />
                  <Input className="h-8 text-xs" value={entry.expandedAttributes.join(" + ")} readOnly />
                  <div className="flex items-center gap-1">
                    <Checkbox checked={entry.verified} onCheckedChange={(checked) => updateEntry(entry.id, { verified: Boolean(checked) })} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}><Trash2 /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => { apply(); onOpenChange(false) }}><Save />应用当前表</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function App() {
  const dataset = useAppStore((state) => state.dataset)
  const filters = useAppStore((state) => state.filters)
  const activeResultTab = useAppStore((state) => state.activeResultTab)
  const setResultTab = useAppStore((state) => state.setResultTab)
  const selectedRecommendationId = useAppStore((state) => state.selectedRecommendationId)
  const [editorOpen, setEditorOpen] = useState(false)
  const recommendations = useMemo(() => recommendTreasures(dataset, filters), [dataset, filters])
  const selected = recommendations.find((item) => item.id === selectedRecommendationId) ?? recommendations[0]
  const matchedRows = recommendations.reduce((sum, item) => sum + item.totalMatchedRows, 0)

  return (
    <TooltipProvider>
      <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-slate-100">
        <CommandBar onOpenEditor={() => setEditorOpen(true)} />
        <div className="min-h-0 flex-1 p-3">
          <ResizablePanelGroup direction="horizontal" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <ResizablePanel defaultSize={21} minSize={17}>
              <FilterSidebar />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={49} minSize={35}>
              <main className="flex h-full min-w-0 flex-col">
                <SummaryBanner recommendationCount={recommendations.length} matchedRows={matchedRows} />
                <Tabs value={activeResultTab} onValueChange={(value) => setResultTab(value as typeof activeResultTab)} className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-slate-200 px-4 pt-3">
                    <TabsList className="bg-slate-100">
                      <TabsTrigger value="recommendations">推荐宝鉴</TabsTrigger>
                      <TabsTrigger value="dungeon-details">副本 × 宝鉴明细</TabsTrigger>
                      <TabsTrigger value="hit-items">命中装备列表</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="recommendations" className="m-0 min-h-0 flex-1 p-0"><RecommendationTable recommendations={recommendations} /></TabsContent>
                  <TabsContent value="dungeon-details" className="m-0 min-h-0 flex-1 overflow-auto p-4">
                    <div className="grid gap-2">{recommendations.flatMap((item) => item.dungeonDetails.map((detail) => <div key={`${item.id}-${detail.dungeonId}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{detail.dungeonName} · {item.treasureName}</span><Badge variant="outline">{formatPercent(detail.probability)}</Badge></div>))}</div>
                  </TabsContent>
                  <TabsContent value="hit-items" className="m-0 min-h-0 flex-1 overflow-auto p-4">
                    <div className="grid gap-2">{recommendations.flatMap((item) => item.bestMatch.matchedEntries.map((entry) => <div key={`${item.id}-${entry.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{item.treasureName} · {entry.slot} · {entry.attributeCombo}</span><span className="text-xs text-slate-500">权重 {entry.weight}</span></div>))}</div>
                  </TabsContent>
                </Tabs>
              </main>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={22}>
              <aside className="flex h-full min-w-0 flex-col bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">推荐宝鉴</p><p className="mt-0.5 text-sm font-bold text-slate-950">{selected?.treasureName ?? "暂无结果"}</p></div>
                  {selected && <Badge>{formatPercent(selected.bestProbability)}</Badge>}
                </div>
                <DetailPanel recommendation={selected} />
              </aside>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <footer className="flex h-8 items-center justify-between border-t border-slate-200 bg-white px-5 text-xs text-slate-500">
          <span>已扫描 {dataset.dungeons.length} 个副本 · {dataset.dungeons.reduce((sum, dungeon) => sum + dungeon.treasures.length, 0)} 个宝鉴</span>
          <span className="flex items-center gap-1"><Search className="h-3.5 w-3.5" />本地计算 · 无网络上传</span>
        </footer>
        <DataEditorDialog open={editorOpen} onOpenChange={setEditorOpen} />
        <Toaster position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  )
}

export default App
