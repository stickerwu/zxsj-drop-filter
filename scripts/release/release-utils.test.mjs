// @vitest-environment node

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
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

const temporaryDirectories = []

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "zxsj-release-"))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe("release metadata", () => {
  it("accepts stable semantic version tags only", () => {
    expect(parseReleaseTag("v0.3.0")).toBe("0.3.0")
    expect(() => parseReleaseTag("0.3.0")).toThrow("vX.Y.Z")
    expect(() => parseReleaseTag("v0.3.0-beta.1")).toThrow("stable")
  })

  it("resolves a release tag after pnpm's argument separator", () => {
    expect(resolveReleaseTag(["--", "v0.3.0"], {})).toBe("v0.3.0")
    expect(
      resolveReleaseTag(["v9.9.9"], { GITHUB_REF_NAME: "v0.3.0" }),
    ).toBe("v0.3.0")
  })

  it("requires all project versions to match the tag", () => {
    expect(() =>
      assertMatchingVersions("0.3.0", {
        packageJson: "0.3.0",
        cargoToml: "0.2.1",
        tauriConfig: "0.3.0",
      }),
    ).toThrow("cargoToml")
  })

  it("reads JSON and TOML versions with structured parsers", async () => {
    const root = await createTemporaryDirectory()
    await mkdir(path.join(root, "src-tauri"), { recursive: true })
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ version: "0.3.0" }),
    )
    await writeFile(
      path.join(root, "src-tauri", "Cargo.toml"),
      '[package]\nname = "app"\nversion = "0.3.0"\n',
    )
    await writeFile(
      path.join(root, "src-tauri", "tauri.conf.json"),
      JSON.stringify({ version: "0.3.0" }),
    )

    await expect(readProjectVersions(root)).resolves.toEqual({
      packageJson: "0.3.0",
      cargoToml: "0.3.0",
      tauriConfig: "0.3.0",
    })
  })

  it("extracts only the requested changelog section", () => {
    const text =
      "## 0.3.0 - 2026-07-20\n\n- updater\n- release\n\n## 0.2.1 - 2026-07-19\n\n- fix"

    expect(extractChangelogSection(text, "0.3.0")).toBe(
      "- updater\n- release",
    )
    expect(() => extractChangelogSection(text, "9.9.9")).toThrow("9.9.9")
  })

  it("discovers a v2 NSIS installer reused by the updater", async () => {
    const root = await createTemporaryDirectory()
    const nsis = path.join(root, "nsis")
    await mkdir(nsis, { recursive: true })
    await writeFile(path.join(nsis, "app_0.3.0_x64-setup.exe"), "installer")
    await writeFile(
      path.join(nsis, "app_0.3.0_x64-setup.exe.sig"),
      "signature",
    )

    const artifacts = await discoverUpdaterArtifacts(root)

    expect(path.basename(artifacts.installerPath)).toBe(
      "app_0.3.0_x64-setup.exe",
    )
    expect(artifacts.updaterPath).toBe(artifacts.installerPath)
    expect(artifacts.signaturePath).toBe(
      `${artifacts.installerPath}.sig`,
    )
  })

  it("rejects ambiguous installer output", async () => {
    const root = await createTemporaryDirectory()
    await writeFile(path.join(root, "first-setup.exe"), "first")
    await writeFile(path.join(root, "second-setup.exe"), "second")
    await writeFile(path.join(root, "first-setup.exe.sig"), "signature")

    await expect(discoverUpdaterArtifacts(root)).rejects.toThrow(
      "exactly one NSIS installer",
    )
  })

  it("creates a Gitee-backed Tauri manifest", () => {
    expect(
      createUpdaterManifest({
        version: "0.3.0",
        notes: "- updater",
        pubDate: "2026-07-20T00:00:00Z",
        signature: "signed-value\n",
        url: "https://gitee.com/api/v5/repos/stickerwu/zxsj-drop-filter/releases/1/attach_files/2/download",
      }),
    ).toEqual({
      version: "0.3.0",
      notes: "- updater",
      pub_date: "2026-07-20T00:00:00Z",
      platforms: {
        "windows-x86_64": {
          signature: "signed-value",
          url: expect.stringContaining("gitee.com"),
        },
      },
    })
  })

  it("computes an uppercase SHA-256 digest", async () => {
    const root = await createTemporaryDirectory()
    const file = path.join(root, "payload.txt")
    await writeFile(file, "abc")

    expect(await sha256File(file)).toBe(
      "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD",
    )
    expect(await readFile(file, "utf8")).toBe("abc")
  })

  it("documents release secrets and the updater bootstrap", async () => {
    const readme = await readFile(
      path.join(process.cwd(), "README.md"),
      "utf8",
    )

    for (const requiredText of [
      "TAURI_SIGNING_PRIVATE_KEY",
      "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
      "GITEE_TOKEN",
      "v0.2.1",
      "v0.3.0",
      "Gitee",
      "GitHub",
      "SmartScreen",
    ]) {
      expect(readme).toContain(requiredText)
    }
  })
})
