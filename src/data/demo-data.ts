import { normalizeDataset } from "@/domain/normalize"
import type { RawDataset } from "@/domain/types"

const rawDemoData: RawDataset = {
  schemaVersion: 2,
  attributes: ["会心", "专精", "调息", "元御"],
  slots: ["头部", "衣服", "手部", "腰带", "腿部", "脚部", "护符", "护佩", "法印", "令牌", "颈部", "腕饰", "天灵", "地宝"],
  dungeons: [
    {
      name: "斩恨磨蛰境",
      treasures: [
        {
          name: "致知",
          entries: [
            { slot: "衣服", attributeCombo: "会专", weight: 1, verified: true },
            { slot: "腰带", attributeCombo: "专元", weight: 1, verified: true },
            { slot: "护符", attributeCombo: "会专", weight: 1, verified: true },
            { slot: "护佩", attributeCombo: "元御", weight: 1, verified: true },
            { slot: "法印", attributeCombo: "会调", weight: 1, verified: true },
            { slot: "令牌", attributeCombo: "会专", weight: 1, verified: true },
            { slot: "腕饰", attributeCombo: "专调", weight: 1, verified: true },
            { slot: "颈部", attributeCombo: "专调", weight: 1, verified: true },
            { slot: "地宝", attributeCombo: "专元", weight: 1, verified: true },
          ],
        },
        {
          name: "御风",
          entries: [
            { slot: "衣服", attributeCombo: "会心", weight: 3, verified: true },
            { slot: "腰带", attributeCombo: "专精", weight: 1, verified: true },
            { slot: "脚部", attributeCombo: "会调", weight: 2, verified: true },
            { slot: "地宝", attributeCombo: "专元", weight: 2, verified: true },
          ],
        },
      ],
    },
    {
      name: "护塔破冥幻",
      treasures: [
        {
          name: "致知",
          entries: [
            { slot: "头部", attributeCombo: "会心", weight: 2, verified: true },
            { slot: "脚部", attributeCombo: "专精", weight: 2, verified: true },
            { slot: "护符", attributeCombo: "会专", weight: 2, verified: true },
            { slot: "法印", attributeCombo: "元御", weight: 1, verified: true },
          ],
        },
        {
          name: "灵宝",
          entries: [
            { slot: "手部", attributeCombo: "专调", weight: 2, verified: true },
            { slot: "腕饰", attributeCombo: "会调", weight: 2, verified: true },
            { slot: "颈部", attributeCombo: "专元", weight: 1, verified: true },
          ],
        },
      ],
    },
    {
      name: "幻月归心劫",
      treasures: [
        {
          name: "致知",
          entries: [
            { slot: "衣服", attributeCombo: "会调", weight: 2, verified: true },
            { slot: "手部", attributeCombo: "会专", weight: 2, verified: true },
            { slot: "腰带", attributeCombo: "会元", weight: 2, verified: true },
            { slot: "天灵", attributeCombo: "会心", weight: 1, verified: true },
          ],
        },
        {
          name: "守御",
          entries: [
            { slot: "腿部", attributeCombo: "元御", weight: 1, verified: true },
            { slot: "法印", attributeCombo: "专元", weight: 2, verified: true },
            { slot: "地宝", attributeCombo: "调元", weight: 1, verified: true },
          ],
        },
      ],
    },
    {
      name: "雪岭斩三拐",
      treasures: [
        {
          name: "玄铁",
          entries: [
            { slot: "头部", attributeCombo: "专精", weight: 3, verified: true },
            { slot: "腰带", attributeCombo: "会专", weight: 1, verified: true },
            { slot: "护佩", attributeCombo: "调息", weight: 1, verified: true },
          ],
        },
        {
          name: "归元",
          entries: [
            { slot: "衣服", attributeCombo: "会元", weight: 2, verified: true },
            { slot: "腿部", attributeCombo: "元御", weight: 2, verified: true },
            { slot: "法印", attributeCombo: "会心", weight: 1, verified: true },
          ],
        },
      ],
    },
    {
      name: "焚境西游录",
      treasures: [
        {
          name: "凝神",
          entries: [
            { slot: "手部", attributeCombo: "调息", weight: 1, verified: true },
            { slot: "脚部", attributeCombo: "专调", weight: 1, verified: true },
            { slot: "颈部", attributeCombo: "会调", weight: 1, verified: true },
          ],
        },
        {
          name: "超心",
          entries: [
            { slot: "头部", attributeCombo: "会心", weight: 3, verified: true },
            { slot: "衣服", attributeCombo: "会专", weight: 1, verified: true },
            { slot: "腕饰", attributeCombo: "会元", weight: 1, verified: true },
          ],
        },
      ],
    },
  ],
}

export const demoDataset = normalizeDataset(rawDemoData)
