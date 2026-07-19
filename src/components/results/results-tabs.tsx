import { Tabs } from "@heroui/react"
import { CheckCircle2, Database, Sparkles } from "lucide-react"
import type { Recommendation } from "@/domain/types"
import { useAppStore } from "@/store/app-store"
import { DungeonDetailTable } from "./dungeon-detail-table"
import { HitItemTable } from "./hit-item-table"
import { RecommendationTable } from "./recommendation-table"

type ResultTab = "recommendations" | "dungeon-details" | "hit-items"

function TabLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles
  children: string
}) {
  return (
    <>
      <Icon className="size-3.5" />
      <span>{children}</span>
      <Tabs.Indicator />
    </>
  )
}

export function ResultsTabs({
  recommendations,
}: {
  recommendations: Recommendation[]
}) {
  const activeResultTab = useAppStore((state) => state.activeResultTab)
  const setResultTab = useAppStore((state) => state.setResultTab)

  return (
    <Tabs
      className="reference-tabs flex min-h-0 flex-1 flex-col"
      selectedKey={activeResultTab}
      variant="secondary"
      onSelectionChange={(key) => setResultTab(String(key) as ResultTab)}
    >
      <Tabs.ListContainer className="shrink-0 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-0">
        <Tabs.List
          aria-label="掉落结果"
          className="grid w-full grid-cols-3 gap-0"
          data-layout="full-width"
          data-results-tab-list
        >
          <Tabs.Tab id="recommendations" className="h-12 w-full justify-center gap-2 px-3 text-[13px]">
            <TabLabel icon={Sparkles}>推荐宝鉴</TabLabel>
          </Tabs.Tab>
          <Tabs.Tab id="dungeon-details" className="h-12 w-full justify-center gap-2 px-3 text-[13px]">
            <TabLabel icon={Database}>副本 × 宝鉴明细</TabLabel>
          </Tabs.Tab>
          <Tabs.Tab id="hit-items" className="h-12 w-full justify-center gap-2 px-3 text-[13px]">
            <TabLabel icon={CheckCircle2}>命中装备列表</TabLabel>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel
        id="recommendations"
        className="m-0 flex min-h-0 flex-1 animate-[tab-enter_150ms_ease-out] p-0"
      >
        <RecommendationTable recommendations={recommendations} />
      </Tabs.Panel>
      <Tabs.Panel
        id="dungeon-details"
        className="m-0 flex min-h-0 flex-1 animate-[tab-enter_150ms_ease-out] p-0"
      >
        <DungeonDetailTable recommendations={recommendations} />
      </Tabs.Panel>
      <Tabs.Panel
        id="hit-items"
        className="m-0 flex min-h-0 flex-1 animate-[tab-enter_150ms_ease-out] p-0"
      >
        <HitItemTable recommendations={recommendations} />
      </Tabs.Panel>
    </Tabs>
  )
}
