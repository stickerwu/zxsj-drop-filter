import { BASE_ATTRIBUTES, type AttributeName } from "./types"

const COMBO_ALIASES: Record<string, AttributeName[]> = {
  会专: ["会心", "专精"],
  会调: ["会心", "调息"],
  会元: ["会心", "元御"],
  专调: ["专精", "调息"],
  专元: ["专精", "元御"],
  调元: ["调息", "元御"],
}

export function expandAttributeCombo(value: string): AttributeName[] {
  const normalized = value.replaceAll(/\s+/g, "").replaceAll("+", "")
  const alias = COMBO_ALIASES[normalized]
  if (alias) return alias
  return BASE_ATTRIBUTES.filter((attribute) => normalized.includes(attribute))
}

export function formatAttributeCombo(attributes: AttributeName[]): string {
  const ordered = BASE_ATTRIBUTES.filter((attribute) => attributes.includes(attribute))
  return ordered.join("+")
}
