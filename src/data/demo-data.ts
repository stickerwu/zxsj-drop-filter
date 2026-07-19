import { normalizeDataset } from "@/domain/normalize"
import { rawDefaultData } from "./default-data"

export const demoDataset = normalizeDataset(rawDefaultData)
