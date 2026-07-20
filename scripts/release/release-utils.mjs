import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { parse as parseToml } from "smol-toml"

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath]
    }),
  )
  return nested.flat()
}

async function requireOneFile(files, description) {
  const nonEmpty = []
  for (const file of files) {
    if ((await stat(file)).size > 0) nonEmpty.push(file)
  }

  if (nonEmpty.length !== 1) {
    throw new Error(
      `Expected exactly one ${description}, found ${nonEmpty.length}`,
    )
  }
  return nonEmpty[0]
}

export function parseReleaseTag(tag) {
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag ?? "")
  if (!match) {
    const reason = String(tag).includes("-") ? "stable " : ""
    throw new Error(`Release tag must be a ${reason}vX.Y.Z tag`)
  }
  return match[1]
}

export function resolveReleaseTag(args, environment = process.env) {
  return environment.GITHUB_REF_NAME || args.find((argument) => argument !== "--")
}

export function assertMatchingVersions(version, versions) {
  const mismatches = Object.entries(versions).filter(
    ([, value]) => value !== version,
  )
  if (mismatches.length > 0) {
    throw new Error(
      `Version mismatch for ${mismatches
        .map(([name, value]) => `${name}=${value}`)
        .join(", ")}; expected ${version}`,
    )
  }
}

export async function readProjectVersions(rootDirectory) {
  const [packageText, cargoText, tauriText] = await Promise.all([
    readFile(path.join(rootDirectory, "package.json"), "utf8"),
    readFile(path.join(rootDirectory, "src-tauri", "Cargo.toml"), "utf8"),
    readFile(
      path.join(rootDirectory, "src-tauri", "tauri.conf.json"),
      "utf8",
    ),
  ])
  const packageJson = JSON.parse(packageText)
  const cargoToml = parseToml(cargoText)
  const tauriConfig = JSON.parse(tauriText)

  return {
    packageJson: String(packageJson.version ?? ""),
    cargoToml: String(cargoToml.package?.version ?? ""),
    tauriConfig: String(tauriConfig.version ?? ""),
  }
}

export function extractChangelogSection(markdown, version) {
  const heading = new RegExp(
    `^##\\s+${escapeRegExp(version)}\\s+-[^\\n]*$`,
    "m",
  ).exec(markdown)
  const remainder = heading
    ? markdown.slice(heading.index + heading[0].length).replace(/^\s+/, "")
    : ""
  const nextHeadingIndex = remainder.search(/^##\s+/m)
  const notes = (
    nextHeadingIndex >= 0 ? remainder.slice(0, nextHeadingIndex) : remainder
  ).trim()
  if (!notes) {
    throw new Error(`CHANGELOG.md does not contain release ${version}`)
  }
  return notes
}

export async function discoverUpdaterArtifacts(
  bundleDirectory,
  version = null,
) {
  const files = await listFiles(bundleDirectory)
  const versionMatches = version
    ? files.filter((file) => path.basename(file).includes(`_${version}_`))
    : files
  const installerCandidates = versionMatches.filter((file) =>
    file.toLowerCase().endsWith("-setup.exe"),
  )

  const installerPath = await requireOneFile(
    installerCandidates,
    "NSIS installer",
  )
  const updaterPath = installerPath
  const signaturePath = `${installerPath}.sig`

  try {
    if ((await stat(signaturePath)).size <= 0) throw new Error()
  } catch {
    throw new Error(
      `Expected a non-empty updater signature at ${signaturePath}`,
    )
  }

  return { installerPath, updaterPath, signaturePath }
}

export function createUpdaterManifest({
  version,
  notes,
  pubDate,
  signature,
  url,
}) {
  return {
    version,
    notes,
    pub_date: pubDate,
    platforms: {
      "windows-x86_64": {
        signature: signature.trim(),
        url,
      },
    },
  }
}

export async function sha256File(filePath) {
  const hash = createHash("sha256")
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("error", reject)
    stream.on("end", resolve)
  })
  return hash.digest("hex").toUpperCase()
}
