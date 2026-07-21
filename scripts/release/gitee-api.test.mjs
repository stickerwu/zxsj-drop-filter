// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createGiteeApi } from "./gitee-api.mjs"
import {
  prepareGiteeRelease,
  publishGiteeRelease,
} from "./publish-gitee-release.mjs"

const temporaryDirectories = []

async function createTemporaryFile(name, content) {
  const directory = await mkdtemp(path.join(tmpdir(), "zxsj-gitee-"))
  temporaryDirectories.push(directory)
  const filePath = path.join(directory, name)
  await writeFile(filePath, content)
  return filePath
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe("Gitee API", () => {
  it("redacts the access token from request errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "denied secret-token" }), {
        headers: { "content-type": "application/json" },
        status: 403,
      }),
    )
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl,
    })

    await expect(api.getReleaseByTag("v0.3.0")).rejects.toThrow(
      /\[REDACTED\]/,
    )
    await expect(api.getReleaseByTag("v0.3.0")).rejects.not.toThrow(
      "secret-token",
    )
  })

  it("builds the public attachment download URL", () => {
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl: vi.fn(),
    })

    expect(api.assetDownloadUrl(12, 34)).toBe(
      "https://gitee.com/api/v5/repos/stickerwu/zxsj-drop-filter/releases/12/attach_files/34/download",
    )
  })

  it("returns null for a missing release", async () => {
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "404 Not Found" }), {
          headers: { "content-type": "application/json" },
          status: 404,
        }),
      ),
    })

    await expect(api.getReleaseByTag("v0.3.0")).resolves.toBeNull()
  })

  it("retries transient attachment upload failures", async () => {
    const filePath = await createTemporaryFile("installer.exe", "payload")
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 42, name: "installer.exe" }), {
          headers: { "content-type": "application/json" },
          status: 201,
        }),
      )
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl,
      retryDelayMs: 0,
    })

    await expect(
      api.uploadAsset(12, filePath, "installer.exe"),
    ).resolves.toMatchObject({ id: 42 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("creates a missing branch only after a 404 lookup", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "not found" }), {
          headers: { "content-type": "application/json" },
          status: 404,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "updater" }), {
          headers: { "content-type": "application/json" },
          status: 201,
        }),
      )
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl,
    })

    await expect(api.ensureBranch("updater", "v0.3.0")).resolves.toEqual({
      name: "updater",
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1][1].method).toBe("POST")
    expect(
      Object.fromEntries(fetchImpl.mock.calls[1][1].body.entries()),
    ).toMatchObject({
      access_token: "secret-token",
      branch_name: "updater",
      refs: "v0.3.0",
    })
  })

  it("updates an existing file with base64 content and sha", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: "existing-sha" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ content: { path: "latest.json" } }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl,
    })

    await api.upsertFile({
      branch: "updater",
      path: "latest.json",
      content: '{"version":"0.3.0"}',
      message: "release v0.3.0",
    })

    expect(fetchImpl.mock.calls[1][1].method).toBe("PUT")
    expect(
      Object.fromEntries(fetchImpl.mock.calls[1][1].body.entries()),
    ).toMatchObject({
      branch: "updater",
      content: Buffer.from('{"version":"0.3.0"}').toString("base64"),
      sha: "existing-sha",
    })
  })

  it("creates a file when Gitee returns an empty content list", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ content: { path: "latest.json" } }), {
          headers: { "content-type": "application/json" },
          status: 201,
        }),
      )
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl,
    })

    await api.upsertFile({
      branch: "updater",
      path: "latest.json",
      content: '{"version":"0.3.0"}',
      message: "release v0.3.0",
    })

    expect(fetchImpl.mock.calls[1][1].method).toBe("POST")
    expect(
      Object.fromEntries(fetchImpl.mock.calls[1][1].body.entries()),
    ).not.toHaveProperty("sha")
  })
})

describe("Gitee release orchestration", () => {
  it("replaces same-name attachments and records the updater URL", async () => {
    const api = {
      assetDownloadUrl: vi.fn(() => "https://gitee.example/updater"),
      createRelease: vi.fn(),
      deleteAsset: vi.fn(),
      getReleaseByTag: vi.fn().mockResolvedValue({
        id: 12,
        tag_name: "v0.3.0",
      }),
      listAssets: vi.fn().mockResolvedValue([
        { id: 1, name: "zxsj-drop-filter_0.3.0_x64-setup.exe" },
        { id: 2, name: "unrelated.txt" },
      ]),
      updateRelease: vi.fn().mockResolvedValue({ id: 12 }),
      uploadAsset: vi
        .fn()
        .mockImplementation(async (_releaseId, filePath, name) => ({
          id: name.endsWith("-setup.exe") ? 44 : name.length,
          name,
          filePath,
        })),
    }
    const metadata = {
      version: "0.3.0",
      tag: "v0.3.0",
      notes: "- updater",
      names: {
        installer: "zxsj-drop-filter_0.3.0_x64-setup.exe",
        updater: "zxsj-drop-filter_0.3.0_x64-setup.exe",
        signature: "zxsj-drop-filter_0.3.0_x64-setup.exe.sig",
      },
      output: {
        installerPath: "installer.exe",
        updaterPath: "installer.exe",
        signaturePath: "installer.exe.sig",
      },
      checksumPath: "SHA256SUMS.txt",
    }

    await expect(prepareGiteeRelease({ api, metadata })).resolves.toEqual({
      releaseId: 12,
      updaterAssetId: 44,
      updaterUrl: "https://gitee.example/updater",
      mirror: "gitee",
    })
    expect(api.deleteAsset).toHaveBeenCalledWith(12, 1)
    expect(api.deleteAsset).not.toHaveBeenCalledWith(12, 2)
    expect(api.uploadAsset).toHaveBeenCalledTimes(3)
    expect(api.updateRelease).toHaveBeenCalledWith(
      12,
      expect.not.objectContaining({ target_commitish: expect.anything() }),
    )
  })

  it("falls back to the GitHub release asset when Gitee upload keeps failing", async () => {
    const api = {
      assetDownloadUrl: vi.fn(),
      createRelease: vi.fn(),
      deleteAsset: vi.fn(),
      getReleaseByTag: vi.fn().mockResolvedValue({
        id: 12,
        tag_name: "v0.5.1",
      }),
      listAssets: vi.fn().mockResolvedValue([]),
      updateRelease: vi.fn().mockResolvedValue({ id: 12 }),
      uploadAsset: vi.fn().mockRejectedValue(new Error("upload timeout")),
    }
    const metadata = {
      version: "0.5.1",
      tag: "v0.5.1",
      notes: "- retry uploads",
      names: {
        installer: "zxsj-drop-filter_0.5.1_x64-setup.exe",
        updater: "zxsj-drop-filter_0.5.1_x64-setup.exe",
        signature: "zxsj-drop-filter_0.5.1_x64-setup.exe.sig",
      },
      output: {
        installerPath: "installer.exe",
        updaterPath: "installer.exe",
        signaturePath: "installer.exe.sig",
      },
      checksumPath: "SHA256SUMS.txt",
    }

    await expect(
      prepareGiteeRelease({ api, metadata }),
    ).resolves.toMatchObject({
      releaseId: 12,
      updaterUrl:
        "https://github.com/stickerwu/zxsj-drop-filter/releases/download/v0.5.1/zxsj-drop-filter_0.5.1_x64-setup.exe",
      mirror: "github",
    })
  })

  it("publishes the release before updating the stable manifest", async () => {
    const callOrder = []
    const latestPath = await createTemporaryFile(
      "latest.json",
      '{"version":"0.3.0"}',
    )
    const api = {
      deleteAsset: vi.fn(async () => callOrder.push("delete")),
      ensureBranch: vi.fn(async () => callOrder.push("branch")),
      listAssets: vi
        .fn()
        .mockResolvedValue([{ id: 9, name: "latest.json" }]),
      updateRelease: vi.fn(async () => callOrder.push("release")),
      uploadAsset: vi.fn(async () => callOrder.push("upload")),
      upsertFile: vi.fn(async () => callOrder.push("manifest")),
    }

    await publishGiteeRelease({
      api,
      metadata: {
        tag: "v0.3.0",
        notes: "- updater",
        version: "0.3.0",
      },
      release: { releaseId: 12 },
      latestPath,
    })

    expect(callOrder).toEqual([
      "delete",
      "upload",
      "release",
      "branch",
      "manifest",
    ])
    expect(api.upsertFile).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "updater",
        content: '{"version":"0.3.0"}',
        path: "latest.json",
      }),
    )
  })

  it("continues publishing when the optional latest attachment upload fails", async () => {
    const latestPath = await createTemporaryFile(
      "latest.json",
      '{"version":"0.5.7"}',
    )
    const api = {
      deleteAsset: vi.fn(),
      ensureBranch: vi.fn(),
      listAssets: vi.fn().mockResolvedValue([]),
      updateRelease: vi.fn(),
      uploadAsset: vi.fn().mockRejectedValue(new Error("upload timeout")),
      upsertFile: vi.fn(),
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    await expect(
      publishGiteeRelease({
        api,
        metadata: {
          tag: "v0.5.7",
          notes: "- resilient manifest publish",
          version: "0.5.7",
        },
        release: { releaseId: 12 },
        latestPath,
      }),
    ).resolves.toBeUndefined()

    expect(api.updateRelease).toHaveBeenCalled()
    expect(api.ensureBranch).toHaveBeenCalledWith("updater", "v0.5.7")
    expect(api.upsertFile).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "updater",
        content: '{"version":"0.5.7"}',
        path: "latest.json",
      }),
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Gitee latest.json attachment upload failed"),
    )
    warn.mockRestore()
  })
})
