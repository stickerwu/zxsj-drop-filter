import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  assertMatchingVersions,
  extractChangelogSection,
  parseReleaseTag,
  readProjectVersions,
  resolveReleaseTag,
} from "./release-utils.mjs"

const rootDirectory = process.cwd()
const tag = resolveReleaseTag(process.argv.slice(2))
const version = parseReleaseTag(tag)
const versions = await readProjectVersions(rootDirectory)
assertMatchingVersions(version, versions)
const changelog = await readFile(
  path.join(rootDirectory, "CHANGELOG.md"),
  "utf8",
)
const notes = extractChangelogSection(changelog, version)

console.log(`Validated release ${tag}`)
console.log(`Changelog entries: ${notes.split("\n").length}`)
