import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import {
  assertMatchingVersions,
  createUpdaterManifest,
  discoverUpdaterArtifacts,
  extractChangelogSection,
  parseReleaseTag,
  readProjectVersions,
  resolveReleaseTag,
  sha256File,
} from "./release-utils.mjs"

const rootDirectory = process.cwd()
const artifactsDirectory = path.join(rootDirectory, "artifacts")
const releaseDirectory = path.join(artifactsDirectory, "release")

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

async function prepare() {
  const tag = resolveReleaseTag(process.argv.slice(3))
  const version = parseReleaseTag(tag)
  const versions = await readProjectVersions(rootDirectory)
  assertMatchingVersions(version, versions)
  const changelog = await readFile(
    path.join(rootDirectory, "CHANGELOG.md"),
    "utf8",
  )
  const notes = extractChangelogSection(changelog, version)
  const source = await discoverUpdaterArtifacts(
    path.join(rootDirectory, "src-tauri", "target", "release", "bundle"),
    version,
  )
  const names = {
    installer: `zxsj-drop-filter_${version}_x64-setup.exe`,
    updater: `zxsj-drop-filter_${version}_x64.nsis.zip`,
    signature: `zxsj-drop-filter_${version}_x64.nsis.zip.sig`,
  }

  await rm(releaseDirectory, { force: true, recursive: true })
  await mkdir(releaseDirectory, { recursive: true })

  const output = {
    installerPath: path.join(releaseDirectory, names.installer),
    updaterPath: path.join(releaseDirectory, names.updater),
    signaturePath: path.join(releaseDirectory, names.signature),
  }
  await Promise.all([
    copyFile(source.installerPath, output.installerPath),
    copyFile(source.updaterPath, output.updaterPath),
    copyFile(source.signaturePath, output.signaturePath),
  ])

  const hashes = {
    [names.installer]: await sha256File(output.installerPath),
    [names.updater]: await sha256File(output.updaterPath),
    [names.signature]: await sha256File(output.signaturePath),
  }
  const checksumText = Object.entries(hashes)
    .map(([name, hash]) => `${hash}  ${name}`)
    .join("\n")

  await writeFile(
    path.join(releaseDirectory, "SHA256SUMS.txt"),
    `${checksumText}\n`,
  )
  await writeFile(
    path.join(artifactsDirectory, "release-notes.md"),
    `${notes}\n`,
  )
  await writeFile(
    path.join(artifactsDirectory, "release-metadata.json"),
    `${JSON.stringify(
      {
        version,
        tag,
        notes,
        names,
        output,
        hashes,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`Prepared release artifacts for ${tag}`)
}

async function manifest() {
  const metadata = await readJson(
    path.join(artifactsDirectory, "release-metadata.json"),
  )
  const gitee = await readJson(
    path.join(artifactsDirectory, "gitee-release.json"),
  )
  const signature = await readFile(metadata.output.signaturePath, "utf8")
  const latest = createUpdaterManifest({
    version: metadata.version,
    notes: metadata.notes,
    pubDate: new Date().toISOString(),
    signature,
    url: gitee.updaterUrl,
  })
  await mkdir(releaseDirectory, { recursive: true })
  await writeFile(
    path.join(releaseDirectory, "latest.json"),
    `${JSON.stringify(latest, null, 2)}\n`,
  )
  console.log(`Generated latest.json for v${metadata.version}`)
}

const mode = process.argv[2]
if (mode === "prepare") {
  await prepare()
} else if (mode === "manifest") {
  await manifest()
} else {
  throw new Error("Expected prepare or manifest mode")
}
