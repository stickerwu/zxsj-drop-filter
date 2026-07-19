import {
  BASE_ATTRIBUTES,
  FILTER_ATTRIBUTES,
  type AttributeFilterName,
  type AttributeName,
} from "./types"

const COMBO_ALIASES: Record<string, AttributeName[]> = {
  会专: ["会心", "专精"],
  会调: ["会心", "调息"],
  会元: ["会心", "元御"],
  会御: ["会心", "元御"],
  专调: ["专精", "调息"],
  专元: ["专精", "元御"],
  专御: ["专精", "元御"],
  调元: ["调息", "元御"],
  调御: ["调息", "元御"],
  元御: ["元御"],
  元: ["元御"],
  御: ["元御"],
  元力: ["元御"],
  御劲: ["元御"],
}

export function expandAttributeCombo(value: string): AttributeName[] {
  const normalized = value.replaceAll(/\s+/g, "").replaceAll("+", "")
  const alias = COMBO_ALIASES[normalized]
  if (alias) return alias
  return BASE_ATTRIBUTES.filter((attribute) => normalized.includes(attribute))
}

export function normalizeExpandedAttributes(values: string[] | undefined, fallbackCombo: string): AttributeName[] {
  const normalized = [...new Set((values ?? []).flatMap(expandAttributeCombo))]
  return BASE_ATTRIBUTES.filter((attribute) => normalized.includes(attribute))
    .concat(normalized.length === 0 ? expandAttributeCombo(fallbackCombo) : [])
}

export function isFilterAttribute(value: string): value is AttributeFilterName {
  return FILTER_ATTRIBUTES.includes(value as AttributeFilterName)
}

export function formatAttributeCombo(attributes: AttributeName[]): string {
  const ordered = BASE_ATTRIBUTES.filter((attribute) => attributes.includes(attribute))
  return ordered.join("+")
}
