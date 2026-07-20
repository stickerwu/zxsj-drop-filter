import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { createGiteeApi } from "./gitee-api.mjs"

const owner = "stickerwu"
const repo = "zxsj-drop-filter"

function releaseFields(metadata, prerelease) {
  return {
    body: metadata.notes,
    name: `诛仙高手秘境掉落软件 v${metadata.version}`,
    prerelease,
    tag_name: metadata.tag,
  }
}

function releaseAssetFiles(metadata) {
  const checksumPath =
    metadata.checksumPath ??
    path.join(path.dirname(metadata.output.installerPath), "SHA256SUMS.txt")
  return [
    [metadata.output.installerPath, metadata.names.installer],
    [metadata.output.updaterPath, metadata.names.updater],
    [metadata.output.signaturePath, metadata.names.signature],
    [checksumPath, "SHA256SUMS.txt"],
  ]
}

export async function prepareGiteeRelease({ api, metadata }) {
  const existing = await api.getReleaseByTag(metadata.tag)
  const release = existing
    ? await api.updateRelease(
        existing.id,
        releaseFields(metadata, true),
      )
    : await api.createRelease({
        ...releaseFields(metadata, true),
        target_commitish: metadata.tag,
      })
  const releaseId = release.id ?? existing?.id
  if (!releaseId) throw new Error("Gitee Release response is missing id")

  const files = releaseAssetFiles(metadata)
  const replaceNames = new Set(files.map(([, name]) => name))
  const currentAssets = await api.listAssets(releaseId)
  for (const asset of currentAssets) {
    if (replaceNames.has(asset.name)) {
      await api.deleteAsset(releaseId, asset.id)
    }
  }

  const uploaded = []
  for (const [filePath, name] of files) {
    uploaded.push(await api.uploadAsset(releaseId, filePath, name))
  }
  const updaterAsset = uploaded.find(
    (asset) => asset.name === metadata.names.updater,
  )
  if (!updaterAsset?.id) {
    throw new Error("Gitee updater attachment response is missing id")
  }

  return {
    releaseId,
    updaterAssetId: updaterAsset.id,
    updaterUrl: api.assetDownloadUrl(releaseId, updaterAsset.id),
  }
}

export async function publishGiteeRelease({
  api,
  metadata,
  release,
  latestPath,
}) {
  const currentAssets = await api.listAssets(release.releaseId)
  for (const asset of currentAssets) {
    if (asset.name === "latest.json") {
      await api.deleteAsset(release.releaseId, asset.id)
    }
  }
  await api.uploadAsset(release.releaseId, latestPath, "latest.json")
  await api.updateRelease(
    release.releaseId,
    releaseFields(metadata, false),
  )
  await api.ensureBranch("updater", metadata.tag)
  const content = (await readFile(latestPath, "utf8")).trim()
  await api.upsertFile({
    branch: "updater",
    content,
    message: `chore: update manifest for ${metadata.tag}`,
    path: "latest.json",
  })
}

async function main() {
  const rootDirectory = process.cwd()
  const artifactsDirectory = path.join(rootDirectory, "artifacts")
  const metadata = JSON.parse(
    await readFile(
      path.join(artifactsDirectory, "release-metadata.json"),
      "utf8",
    ),
  )
  const api = createGiteeApi({
    token: process.env.GITEE_TOKEN,
    owner,
    repo,
  })
  const mode = process.argv[2]

  if (mode === "prepare") {
    const release = await prepareGiteeRelease({ api, metadata })
    await writeFile(
      path.join(artifactsDirectory, "gitee-release.json"),
      `${JSON.stringify(release, null, 2)}\n`,
    )
    console.log(`Prepared Gitee Release ${metadata.tag}`)
    return
  }

  if (mode === "publish") {
    const release = JSON.parse(
      await readFile(
        path.join(artifactsDirectory, "gitee-release.json"),
        "utf8",
      ),
    )
    await publishGiteeRelease({
      api,
      latestPath: path.join(
        artifactsDirectory,
        "release",
        "latest.json",
      ),
      metadata,
      release,
    })
    console.log(`Published Gitee Release ${metadata.tag}`)
    return
  }

  throw new Error("Expected prepare or publish mode")
}

const entryUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null
if (entryUrl === import.meta.url) {
  await main()
}
