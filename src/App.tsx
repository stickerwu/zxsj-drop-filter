import { useMemo, useState } from "react"
import {
  Check,
  FileDown,
  Save,
  Search,
  Trash2,
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { recommendTreasures } from "@/domain/recommendations"
import { expandAttributeCombo } from "@/domain/attributes"
import { FILTER_ATTRIBUTES, type DropDataset, type DropEntry } from "@/domain/types"
import { useAppStore } from "@/store/app-store"
import { AppToolbar } from "@/components/app/app-toolbar"
import { DetailPanel } from "@/components/app/detail-panel"
import { FilterSidebar } from "@/components/app/filter-sidebar"
import { SummaryStrip } from "@/components/app/summary-strip"
import { ResultsTabs } from "@/components/results/results-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function DataEditorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dataset = useAppStore((state) => state.dataset)
  const setDataset = useAppStore((state) => state.setDataset)
  const [dungeonId, setDungeonId] = useState(dataset.dungeons[0]?.id ?? "")
  const dungeon = dataset.dungeons.find((item) => item.id === dungeonId) ?? dataset.dungeons[0]
  const [treasureId, setTreasureId] = useState(dungeon?.treasures[0]?.id ?? "")
  const treasure = dungeon?.treasures.find((item) => item.id === treasureId) ?? dungeon?.treasures[0]
  const [entries, setEntries] = useState<DropEntry[]>(treasure?.entries ?? [])

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
      <DialogContent className="flex h-[720px] max-h-[calc(100vh-2rem)] w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-slate-200 pb-4">
          <DialogTitle>掉落表编辑器</DialogTitle>
          <DialogDescription>维护副本、宝鉴和部位/属性/权重。保存前请确认权重为正数。</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] gap-4 py-4">
          <div className="min-h-0 overflow-y-auto rounded-md border bg-slate-50 p-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>副本</Label>
                <Select value={dungeon?.id} onValueChange={selectDungeon}>
                  <SelectTrigger><SelectValue placeholder="选择副本" /></SelectTrigger>
                  <SelectContent>
                    {dataset.dungeons.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>宝鉴</Label>
                <Select value={treasure?.id} onValueChange={selectTreasure}>
                  <SelectTrigger><SelectValue placeholder="选择宝鉴" /></SelectTrigger>
                  <SelectContent>
                    {dungeon?.treasures.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setEntries((current) => [...current, { id: crypto.randomUUID(), slot: dataset.slots[0] ?? "衣服", attributeCombo: "会心", expandedAttributes: ["会心"], weight: 1, verified: false }])}><FileDown />新增掉落行</Button>
              <Button className="w-full" variant="secondary" onClick={() => setEntries((current) => current.map((entry) => ({ ...entry, verified: true })))}><Check />全部标为已核对</Button>
            </div>
          </div>
          <ScrollArea className="min-h-0 rounded-md border">
            <div className="space-y-2 p-3">
              {entries.map((entry) => (
                <div key={entry.id} className="grid min-h-12 grid-cols-[116px_108px_88px_minmax(160px,1fr)_auto] items-center gap-2 rounded-md border bg-white p-2">
                  <Select value={entry.slot} onValueChange={(value) => updateEntry(entry.id, { slot: value })}>
                    <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="部位" /></SelectTrigger>
                    <SelectContent>{dataset.slots.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={entry.attributeCombo} onValueChange={(value) => updateEntry(entry.id, { attributeCombo: value })}>
                    <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="属性" /></SelectTrigger>
                    <SelectContent>{FILTER_ATTRIBUTES.map((attribute) => <SelectItem key={attribute} value={attribute}>{attribute}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="h-8 text-xs" type="number" min={0.01} step={0.01} value={entry.weight} onChange={(event) => updateEntry(entry.id, { weight: Number(event.target.value) })} />
                  <Input className="h-8 bg-slate-50 text-xs" value={entry.expandedAttributes.join(" + ")} readOnly />
                  <div className="flex items-center gap-1">
                    <Checkbox checked={entry.verified} onCheckedChange={(checked) => updateEntry(entry.id, { verified: Boolean(checked) })} />
                    <Button variant="ghost" size="icon" aria-label="删除掉落行" className="h-8 w-8 text-red-600" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}><Trash2 /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="mt-0 shrink-0 border-t border-slate-200 pt-4">
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
  const selectedRecommendationId = useAppStore((state) => state.selectedRecommendationId)
  const [editorOpen, setEditorOpen] = useState(false)
  const recommendations = useMemo(() => recommendTreasures(dataset, filters), [dataset, filters])
  const selected = recommendations.find((item) => item.id === selectedRecommendationId) ?? recommendations[0]
  const matchedRows = recommendations.reduce((sum, item) => sum + item.totalMatchedRows, 0)

  return (
    <TooltipProvider>
      <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-slate-100">
        <AppToolbar onOpenEditor={() => setEditorOpen(true)} />
        <div className="min-h-0 flex-1 p-3">
          <ResizablePanelGroup direction="horizontal" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <ResizablePanel defaultSize={21} minSize={17}>
              <FilterSidebar />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={49} minSize={35}>
              <main className="flex h-full min-w-0 flex-col">
                <SummaryStrip recommendationCount={recommendations.length} matchedRows={matchedRows} />
                <ResultsTabs recommendations={recommendations} />
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
