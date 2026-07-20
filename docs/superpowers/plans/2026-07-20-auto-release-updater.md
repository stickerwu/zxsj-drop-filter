# GitHub/Gitee Automated Release and Updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build signed Windows releases automatically on GitHub Actions, publish identical installers to GitHub and Gitee, and add a Gitee-first in-app updater with download progress and install/restart confirmation.

**Architecture:** GitHub Actions is the single build source. Focused Node.js release modules validate versions, prepare artifacts, call the official Gitee API, and generate the Tauri static updater manifest. The React application accesses Tauri through an injected updater client, while a reducer-backed hook owns update state and HeroUI components render the toolbar control and install dialog.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript 6, HeroUI v3, Vitest, Node.js ESM, GitHub Actions, GitHub CLI, Gitee Open API v5.

## Global Constraints

- Support Windows x86_64 NSIS releases only.
- Build each version once on GitHub Actions and upload identical bytes to GitHub and Gitee.
- Use Gitee as the first updater endpoint and GitHub only as endpoint fallback.
- Publish stable `vX.Y.Z` tags only; do not feed prereleases to the updater.
- Require Tauri updater signatures; never publish an unsigned NSIS updater installer.
- Keep `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and `GITEE_TOKEN` out of git and build output.
- Do not change drop filtering, recommendations, editor behavior, `.zx` serialization, or the existing data store.
- Keep the update UI at a stable toolbar height and defer its install dialog while the drop editor is open.
- Treat `v0.3.0` as the updater bootstrap release: `v0.2.1` users install it manually once, and automatic updates work from `v0.3.0` onward.
- Use test-driven development and commit after every independently reviewable task.

---

## File Structure

### Release Automation

- `scripts/release/release-utils.mjs`: pure version, changelog, artifact, hash, and manifest functions.
- `scripts/release/release-utils.test.mjs`: pure release utility tests in Node environment.
- `scripts/release/validate-release.mjs`: CLI entry point for tag/version/changelog validation.
- `scripts/release/prepare-artifacts.mjs`: discovers Tauri outputs, copies them to stable release names, and writes metadata.
- `scripts/release/gitee-api.mjs`: authenticated Gitee REST adapter.
- `scripts/release/gitee-api.test.mjs`: request/response and token redaction tests.
- `scripts/release/publish-gitee-release.mjs`: idempotent Gitee Release, attachment, and updater-branch orchestration.
- `.github/workflows/ci.yml`: non-release validation.
- `.github/workflows/release.yml`: signed build and dual-platform release.

### Application Updater

- `src/updater/updater-client.ts`: browser-safe adapter around Tauri app, updater, and process APIs.
- `src/updater/updater-client.test.ts`: adapter mapping and browser guard tests.
- `src/updater/use-app-updater.ts`: reducer-backed update lifecycle hook.
- `src/updater/use-app-updater.test.tsx`: timing, progress, retry, install, and cleanup tests.
- `src/updater/update-status-control.tsx`: compact toolbar status control.
- `src/updater/update-status-control.test.tsx`: toolbar state rendering tests.
- `src/updater/update-ready-dialog.tsx`: HeroUI install/restart confirmation.
- `src/updater/update-ready-dialog.test.tsx`: dialog action tests.

### Existing Files

- `package.json` and `pnpm-lock.yaml`: Tauri JavaScript plugins, release scripts, and TOML parser.
- `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`: updater and process Rust plugins.
- `src-tauri/src/lib.rs`: register native plugins.
- `src-tauri/tauri.conf.json`: updater public key, endpoints, passive install mode, updater artifacts.
- `src-tauri/capabilities/default.json`: minimum updater and process permissions.
- `src/components/app/app-toolbar.tsx`: mount update control.
- `src/components/app/app-shell.tsx`: own updater hook and defer dialog while editor is open.
- `src/components/app/app-shell.test.tsx`: updater/editor integration regression.
- `src/index.css`: stable update control tones and progress styling.
- `README.md` and `CHANGELOG.md`: release behavior, secrets, bootstrap limitation, and new version notes.

---

### Task 1: Build Tested Release Metadata Utilities

**Files:**
- Create: `scripts/release/release-utils.mjs`
- Create: `scripts/release/release-utils.test.mjs`
- Create: `scripts/release/validate-release.mjs`
- Create: `scripts/release/prepare-artifacts.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `parseReleaseTag(tag): string`
- Produces: `readProjectVersions(rootDir): Promise<Record<string, string>>`
- Produces: `assertMatchingVersions(tagVersion, versions): void`
- Produces: `extractChangelogSection(markdown, version): string`
- Produces: `discoverUpdaterArtifacts(bundleDir): Promise<ReleaseArtifacts>`
- Produces: `createUpdaterManifest(input): object`
- Produces: `sha256File(path): Promise<string>`
- `ReleaseArtifacts` contains `installerPath`, `updaterPath`, `signaturePath`, and stable output names.

- [ ] **Step 1: Add the Node TOML parser and release scripts**

Run:

```powershell
pnpm add -D smol-toml
```

Add these package scripts:

```json
{
  "release:validate": "node scripts/release/validate-release.mjs",
  "release:prepare": "node scripts/release/prepare-artifacts.mjs prepare",
  "release:manifest": "node scripts/release/prepare-artifacts.mjs manifest"
}
```

Expected: `package.json` and `pnpm-lock.yaml` include `smol-toml`; no application dependency changes.

- [ ] **Step 2: Write failing pure utility tests**

Create `scripts/release/release-utils.test.mjs` with `// @vitest-environment node` and these exact initial tests:

```js
import { describe, expect, it } from "vitest"
import {
  assertMatchingVersions,
  createUpdaterManifest,
  extractChangelogSection,
  parseReleaseTag,
} from "./release-utils.mjs"

describe("release metadata", () => {
  it("accepts stable semantic version tags only", () => {
    expect(parseReleaseTag("v0.3.0")).toBe("0.3.0")
    expect(() => parseReleaseTag("0.3.0")).toThrow("vX.Y.Z")
    expect(() => parseReleaseTag("v0.3.0-beta.1")).toThrow("stable")
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

  it("extracts only the requested changelog section", () => {
    const text = "## 0.3.0 - 2026-07-20\\n\\n- updater\\n\\n## 0.2.1 - 2026-07-19"
    expect(extractChangelogSection(text, "0.3.0")).toBe("- updater")
  })

  it("creates a Gitee-backed Tauri manifest", () => {
    expect(
      createUpdaterManifest({
        version: "0.3.0",
        notes: "- updater",
        pubDate: "2026-07-20T00:00:00Z",
        signature: "signed-value",
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
})
```

- [ ] **Step 3: Run the utility tests and verify failure**

Run:

```powershell
pnpm vitest run scripts/release/release-utils.test.mjs
```

Expected: FAIL because `release-utils.mjs` does not exist.

- [ ] **Step 4: Implement the release utilities**

Implement `release-utils.mjs` using `node:fs/promises`, `node:path`, `node:crypto`, and `smol-toml`.

Key behavior:

```js
export function parseReleaseTag(tag) {
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag)
  if (!match) throw new Error("Release tag must be a stable vX.Y.Z tag")
  return match[1]
}

export function assertMatchingVersions(version, versions) {
  const mismatches = Object.entries(versions).filter(([, value]) => value !== version)
  if (mismatches.length) {
    throw new Error(
      `Version mismatch for ${mismatches.map(([name]) => name).join(", ")}`,
    )
  }
}

export function createUpdaterManifest(input) {
  return {
    version: input.version,
    notes: input.notes,
    pub_date: input.pubDate,
    platforms: {
      "windows-x86_64": {
        signature: input.signature.trim(),
        url: input.url,
      },
    },
  }
}
```

`discoverUpdaterArtifacts()` must recursively inspect `src-tauri/target/release/bundle`, require exactly one NSIS setup `.exe` and its matching `.exe.sig`, reuse the `.exe` as the Tauri v2 updater package, and reject zero or ambiguous matches.

- [ ] **Step 5: Implement validation and artifact preparation CLIs**

`validate-release.mjs` must read `GITHUB_REF_NAME` or one positional tag, load all three project versions, verify a matching changelog section, and print only non-secret validation results.

`prepare-artifacts.mjs prepare` must:

1. Discover Tauri outputs.
2. Create `artifacts/release`.
3. Copy files to ASCII stable names:

```text
zxsj-drop-filter_<version>_x64-setup.exe
zxsj-drop-filter_<version>_x64-setup.exe.sig
```

4. Write `SHA256SUMS.txt`.
5. Write `artifacts/release-metadata.json` with absolute source paths, stable names, hashes, notes, and version.

`prepare-artifacts.mjs manifest` must:

1. Read `artifacts/release-metadata.json`.
2. Read `artifacts/gitee-release.json`.
3. Read the prepared `.sig` file as trimmed text.
4. Call `createUpdaterManifest()`.
5. Write formatted UTF-8 JSON to `artifacts/release/latest.json`.

- [ ] **Step 6: Run utility tests and CLI validation**

Run:

```powershell
pnpm vitest run scripts/release/release-utils.test.mjs
pnpm release:validate -- v0.2.1
```

Expected: tests PASS; validation PASS against the current repository version and changelog.

- [ ] **Step 7: Commit the release utility layer**

```powershell
git add package.json pnpm-lock.yaml scripts/release
git commit -m "feat: add tested release metadata tooling"
```

---

### Task 2: Add an Idempotent Gitee Release Publisher

**Files:**
- Create: `scripts/release/gitee-api.mjs`
- Create: `scripts/release/gitee-api.test.mjs`
- Create: `scripts/release/publish-gitee-release.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createUpdaterManifest`, release metadata JSON, and prepared artifacts from Task 1.
- Produces: `createGiteeApi({ token, owner, repo, fetchImpl })`
- Produces methods: `getReleaseByTag`, `createRelease`, `updateRelease`, `listAssets`, `deleteAsset`, `uploadAsset`, `ensureBranch`, `upsertFile`.
- Produces CLI phases:
  - `prepare`: create/update prerelease and upload non-manifest assets.
  - `publish`: upload `latest.json`, publish Release, and update `updater/latest.json`.
- Writes: `artifacts/gitee-release.json` with `releaseId`, `updaterAssetId`, and public updater URL.

- [ ] **Step 1: Write failing Gitee adapter tests**

Create tests with an injected `fetchImpl`:

```js
// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { createGiteeApi } from "./gitee-api.mjs"

describe("Gitee API", () => {
  it("looks up a release by tag and never includes the token in errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "denied" }), { status: 403 }),
    )
    const api = createGiteeApi({
      token: "secret-token",
      owner: "stickerwu",
      repo: "zxsj-drop-filter",
      fetchImpl,
    })

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
})
```

- [ ] **Step 2: Run Gitee tests and verify failure**

Run:

```powershell
pnpm vitest run scripts/release/gitee-api.test.mjs
```

Expected: FAIL because `gitee-api.mjs` does not exist.

- [ ] **Step 3: Implement the Gitee API adapter**

Implement one private `request()` function and focused public methods. Use `FormData` for Release creation, updates, and file uploads. Authenticate using the official API's `access_token` field, never log request bodies, and sanitize thrown response text:

```js
function redact(value, token) {
  return String(value).split(token).join("[REDACTED]")
}

export function createGiteeApi({ token, owner, repo, fetchImpl = fetch }) {
  if (!token) throw new Error("GITEE_TOKEN is required")

  const base = `https://gitee.com/api/v5/repos/${owner}/${repo}`

  return {
    assetDownloadUrl(releaseId, assetId) {
      return `${base}/releases/${releaseId}/attach_files/${assetId}/download`
    },
    async getReleaseByTag(tag) {
      return request(`/releases/tags/${encodeURIComponent(tag)}`)
    },
    async createRelease(input) {
      return request("/releases", { method: "POST", form: input })
    },
    async updateRelease(releaseId, input) {
      return request(`/releases/${releaseId}`, {
        method: "PATCH",
        form: input,
      })
    },
    async listAssets(releaseId) {
      return request(`/releases/${releaseId}/attach_files`)
    },
    async deleteAsset(releaseId, assetId) {
      return request(`/releases/${releaseId}/attach_files/${assetId}`, {
        method: "DELETE",
      })
    },
    async uploadAsset(releaseId, file) {
      return request(`/releases/${releaseId}/attach_files`, {
        method: "POST",
        file,
      })
    },
    async ensureBranch(branchName, refs) {
      const existing = await lookupBranch(branchName)
      return existing ?? request("/branches", {
        method: "POST",
        form: { branch_name: branchName, refs },
      })
    },
    async upsertFile({ branch, path, content, message }) {
      const existing = await lookupFile(path, branch)
      return request(`/contents/${path}`, {
        method: existing ? "PUT" : "POST",
        form: {
          branch,
          content: Buffer.from(content, "utf8").toString("base64"),
          message,
          ...(existing ? { sha: existing.sha } : {}),
        },
      })
    },
  }
}
```

Implement `lookupBranch()` with GET `/branches/{branch}` and `lookupFile()` with GET `/contents/{path}?ref={branch}`. Treat Gitee `404` as `null` only for release, branch, and content lookup methods. All mutation errors must fail the process.

- [ ] **Step 4: Implement idempotent Gitee orchestration**

`publish-gitee-release.mjs prepare` must:

1. Read `GITEE_TOKEN`, `GITHUB_REF_NAME`, `artifacts/release-metadata.json`.
2. Find or create the tag Release with `prerelease: true`.
3. Update title, notes, target branch, and prerelease state on reruns.
4. List attachments and delete any attachment whose name matches a new upload.
5. Upload the NSIS setup/update installer, signature, and `SHA256SUMS.txt`.
6. Find the uploaded NSIS installer attachment.
7. Write `artifacts/gitee-release.json`.

`publish-gitee-release.mjs publish` must:

1. Replace and upload `latest.json`.
2. Patch the Gitee Release to `prerelease: false`.
3. Create the `updater` branch from the release tag if absent.
4. Create or update `latest.json` on `updater`.

Add:

```json
{
  "release:gitee:prepare": "node scripts/release/publish-gitee-release.mjs prepare",
  "release:gitee:publish": "node scripts/release/publish-gitee-release.mjs publish"
}
```

- [ ] **Step 5: Complete adapter and orchestration tests**

Add tests for:

- `404` release lookup returns `null`.
- Same-name attachment is deleted before upload.
- Prepare output identifies the NSIS installer attachment ID used by updater.
- Publish updates the Release before writing `updater/latest.json`.
- API failures contain status and endpoint but not token.

Run:

```powershell
pnpm vitest run scripts/release/gitee-api.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Gitee publishing**

```powershell
git add package.json scripts/release
git commit -m "feat: automate Gitee release publishing"
```

---

### Task 3: Add Signed Tauri Updater Support and a Browser-Safe Client

**Files:**
- Create: `src/updater/updater-client.ts`
- Create: `src/updater/updater-client.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces:

```ts
export interface AppUpdate {
  version: string
  currentVersion: string
  notes: string
  date: string | null
  download(onEvent: (event: DownloadProgressEvent) => void): Promise<void>
  install(): Promise<void>
  close(): Promise<void>
}

export interface UpdaterClient {
  isAvailable(): boolean
  getCurrentVersion(): Promise<string>
  check(): Promise<AppUpdate | null>
  relaunch(): Promise<void>
}
```

- `DownloadProgressEvent` is a normalized union of `started`, `progress`, and `finished`.

- [ ] **Step 1: Write failing updater client tests**

Test a factory with injected native bindings:

```ts
import { describe, expect, it, vi } from "vitest"
import { createUpdaterClient } from "./updater-client"

it("does not load native bindings outside Tauri", async () => {
  const loadBindings = vi.fn()
  const client = createUpdaterClient({
    detectTauri: () => false,
    loadBindings,
  })

  expect(client.isAvailable()).toBe(false)
  expect(await client.check()).toBeNull()
  expect(loadBindings).not.toHaveBeenCalled()
})

it("maps updater download events", async () => {
  // Inject a native update whose download callback emits Started,
  // Progress, and Finished; assert normalized events and metadata.
})
```

- [ ] **Step 2: Run client tests and verify failure**

Run:

```powershell
pnpm vitest run src/updater/updater-client.test.ts
```

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Install Tauri JavaScript and Rust plugins**

Run:

```powershell
pnpm add @tauri-apps/api@^2 @tauri-apps/plugin-updater@^2 @tauri-apps/plugin-process@^2
cargo add tauri-plugin-updater@2 --manifest-path src-tauri/Cargo.toml
cargo add tauri-plugin-process@2 --manifest-path src-tauri/Cargo.toml
```

Expected: package and Cargo lockfiles update without changing the Tauri major version.

- [ ] **Step 4: Implement the lazy updater client**

The default binding loader must use dynamic imports:

```ts
async function loadTauriBindings() {
  const [{ getVersion }, { check }, { relaunch }] = await Promise.all([
    import("@tauri-apps/api/app"),
    import("@tauri-apps/plugin-updater"),
    import("@tauri-apps/plugin-process"),
  ])
  return { getVersion, check, relaunch }
}
```

`check()` returns `null` outside Tauri. Inside Tauri it wraps the native `Update`, normalizes `body` to `notes`, maps download events, and exposes `install()` and `close()` without leaking Tauri types to React components.

- [ ] **Step 5: Generate the updater signing key**

Run outside the repository:

```powershell
$keyDir = Join-Path $HOME '.tauri'
New-Item -ItemType Directory -Force $keyDir | Out-Null
pnpm tauri signer generate -w (Join-Path $keyDir 'zxsj-drop-filter.key')
```

Use a strong password and retain:

- Private key: `C:\Users\98521\.tauri\zxsj-drop-filter.key`
- Password: local secret manager and GitHub Secret only.
- Public key: committed in `src-tauri/tauri.conf.json`.

Add local key filename patterns to `.gitignore` as defense in depth. Never move the private key into the repository.

- [ ] **Step 6: Register and configure native plugins**

Update `src-tauri/src/lib.rs`:

```rust
tauri::Builder::default()
  .plugin(tauri_plugin_process::init())
  .plugin(tauri_plugin_updater::Builder::new().build())
```

Update `tauri.conf.json` with:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://gitee.com/stickerwu/zxsj-drop-filter/raw/updater/latest.json",
        "https://github.com/stickerwu/zxsj-drop-filter/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

Also set `plugins.updater.pubkey` to the exact public key emitted in Step 5.

Update capabilities with the minimum permissions required by the installed plugin schemas:

```json
[
  "core:default",
  "updater:default",
  "process:allow-restart"
]
```

- [ ] **Step 7: Run adapter and native checks**

Run:

```powershell
pnpm vitest run src/updater/updater-client.test.ts
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: updater client tests PASS and Cargo check exits 0.

- [ ] **Step 8: Commit native updater support**

```powershell
git add package.json pnpm-lock.yaml .gitignore src/updater src-tauri
git commit -m "feat: add signed Tauri updater client"
```

---

### Task 4: Implement the Update State Machine with TDD

**Files:**
- Create: `src/updater/use-app-updater.ts`
- Create: `src/updater/use-app-updater.test.tsx`

**Interfaces:**
- Consumes: `UpdaterClient` and `AppUpdate` from Task 3.
- Produces:

```ts
export type AppUpdaterState =
  | { status: "unavailable" }
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date"; currentVersion: string }
  | { status: "downloading"; currentVersion: string; nextVersion: string; progress: number | null }
  | { status: "ready"; currentVersion: string; nextVersion: string; notes: string; promptOpen: boolean }
  | { status: "installing"; currentVersion: string; nextVersion: string; notes: string }
  | { status: "error"; currentVersion: string | null; message: string }

export interface AppUpdaterController {
  state: AppUpdaterState
  checkNow(): Promise<void>
  dismissPrompt(): void
  openPrompt(): void
  installAndRelaunch(): Promise<void>
}
```

- [ ] **Step 1: Write failing startup and no-update tests**

Use `renderHook`, `act`, and fake timers:

```ts
it("checks 1500ms after mount and reports the current version", async () => {
  vi.useFakeTimers()
  const client = fakeClient({ currentVersion: "0.3.0", update: null })
  const { result } = renderHook(() =>
    useAppUpdater({ client, startupDelayMs: 1500 }),
  )

  expect(result.current.state.status).toBe("idle")
  await act(() => vi.advanceTimersByTimeAsync(1500))
  expect(client.check).toHaveBeenCalledOnce()
  expect(result.current.state).toEqual({
    status: "up-to-date",
    currentVersion: "0.3.0",
  })
})
```

- [ ] **Step 2: Write failing download, retry, and install tests**

Add tests proving:

- update discovery automatically calls `download()`;
- `started` plus `progress` events produce a bounded `0..100` percentage;
- missing content length produces `progress: null`;
- `finished` enters `ready` with `promptOpen: true`;
- `dismissPrompt()` keeps the downloaded update;
- `openPrompt()` reopens it;
- `installAndRelaunch()` installs before relaunch;
- errors expose a readable message;
- multiple `checkNow()` calls share one in-flight operation;
- unmount calls `update.close()`.

- [ ] **Step 3: Run state-machine tests and verify failure**

Run:

```powershell
pnpm vitest run src/updater/use-app-updater.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 4: Implement reducer and hook**

Use a reducer for state transitions and refs for the downloaded update and in-flight check:

```ts
export function useAppUpdater({
  client = tauriUpdaterClient,
  startupDelayMs = 1500,
}: UseAppUpdaterOptions = {}): AppUpdaterController {
  const [state, dispatch] = useReducer(reducer, initialState(client))
  const updateRef = useRef<AppUpdate | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)

  // checkNow obtains currentVersion, checks, downloads automatically,
  // dispatches normalized progress, and stores the completed update.
}
```

Use accumulated bytes rather than the most recent chunk size:

```ts
receivedBytes += event.chunkLength
const progress =
  totalBytes && totalBytes > 0
    ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
    : null
```

Do not retry automatically in a loop. Startup performs one attempt; user actions trigger later attempts.

Add a `formatUpdaterError(error)` helper that maps known text to these user-facing messages and never returns a stack trace:

```ts
if (message.toLowerCase().includes("signature")) {
  return "更新包签名验证失败"
}
if (message.toLowerCase().includes("json")) {
  return "更新信息无效"
}
if (message.toLowerCase().includes("network")) {
  return "网络连接失败，请稍后重试"
}
return "更新失败，请稍后重试"
```

- [ ] **Step 5: Run state-machine tests**

Run:

```powershell
pnpm vitest run src/updater/use-app-updater.test.tsx
```

Expected: all updater lifecycle tests PASS without unhandled promise warnings.

- [ ] **Step 6: Commit the updater state machine**

```powershell
git add src/updater/use-app-updater.ts src/updater/use-app-updater.test.tsx
git commit -m "feat: manage automatic update lifecycle"
```

---

### Task 5: Add HeroUI Update Status and Install Confirmation

**Files:**
- Create: `src/updater/update-status-control.tsx`
- Create: `src/updater/update-status-control.test.tsx`
- Create: `src/updater/update-ready-dialog.tsx`
- Create: `src/updater/update-ready-dialog.test.tsx`
- Modify: `src/components/app/app-toolbar.tsx`
- Modify: `src/components/app/app-shell.tsx`
- Modify: `src/components/app/app-shell.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `AppUpdaterController` and `AppUpdaterState` from Task 4.
- `UpdateStatusControl` props: `controller: AppUpdaterController`.
- `UpdateReadyDialog` props: `controller: AppUpdaterController`, `canOpen: boolean`.
- `AppToolbar` adds `updater: AppUpdaterController`.

- [ ] **Step 1: Write failing toolbar control tests**

Cover visible states:

```tsx
render(
  <UpdateStatusControl
    controller={controllerWith({
      status: "downloading",
      currentVersion: "0.3.0",
      nextVersion: "0.3.1",
      progress: 42,
    })}
  />,
)
expect(screen.getByRole("button", { name: /下载 v0.3.1 · 42%/ })).toBeDisabled()
```

Also assert:

- `unavailable` renders nothing;
- `checking` is disabled;
- `up-to-date` initially shows `已是最新 vX.Y.Z`, collapses to an icon-only `检查更新` button after 4 seconds, and can trigger `checkNow`;
- `ready` triggers `openPrompt`;
- `error` triggers `checkNow` and exposes the message in Tooltip.

- [ ] **Step 2: Write failing install dialog tests**

Assert:

- dialog shows current and target version plus release notes;
- `canOpen={false}` suppresses the dialog while state remains ready;
- “稍后安装” calls `dismissPrompt`;
- “立即安装并重启” calls `installAndRelaunch`;
- installing state disables both actions.

- [ ] **Step 3: Run component tests and verify failure**

Run:

```powershell
pnpm vitest run src/updater/update-status-control.test.tsx src/updater/update-ready-dialog.test.tsx
```

Expected: FAIL because both components are missing.

- [ ] **Step 4: Implement the compact toolbar control**

Use HeroUI `Button`, `Tooltip`, and Lucide icons:

- `RefreshCw` for manual check.
- `LoaderCircle` for checking/installing.
- `Download` for downloading.
- `CircleCheck` for up-to-date/ready.
- `TriangleAlert` for errors.

Add stable attributes for tests and CSS:

```tsx
<Button
  className="toolbar-command update-status-command"
  data-update-status={state.status}
  size="sm"
  variant={state.status === "ready" ? "primary" : "outline"}
>
  {label}
</Button>
```

Do not add a separate card, toolbar row, or animated width based on viewport size.

For `up-to-date`, keep a local four-second display timer:

```ts
const [showLatestLabel, setShowLatestLabel] = useState(true)
const latestVersion =
  state.status === "up-to-date" ? state.currentVersion : null

useEffect(() => {
  if (!latestVersion) return
  setShowLatestLabel(true)
  const timer = window.setTimeout(() => setShowLatestLabel(false), 4000)
  return () => window.clearTimeout(timer)
}, [latestVersion])
```

- [ ] **Step 5: Implement the HeroUI install dialog**

Follow the existing `DropEditorModal` compound API. Use a compact fixed-width dialog, version comparison, scrollable notes, and two actions:

```tsx
<Modal isOpen={isReady && state.promptOpen && canOpen}>
  <Modal.Backdrop variant="blur">
    <Modal.Container placement="center">
      <Modal.Dialog className="w-[min(520px,calc(100vw-2rem))] rounded-lg">
        ...
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>
</Modal>
```

Render notes as plain text with preserved line breaks. Do not render changelog HTML.

- [ ] **Step 6: Integrate the updater with AppShell**

In `AppShell`:

```tsx
export function AppShell({
  updaterController,
}: {
  updaterController?: AppUpdaterController
} = {}) {
  const nativeUpdater = useAppUpdater()
  const updater = updaterController ?? nativeUpdater

  // Existing shell render follows.
  <AppToolbar
    onOpenEditor={() => setEditorOpen(true)}
    updater={updater}
  />

  <UpdateReadyDialog
    controller={updater}
    canOpen={!editorOpen}
  />
}
```

Place `<UpdateStatusControl controller={updater} />` immediately before `<ThemeMenu />` in `AppToolbar`.

- [ ] **Step 7: Add the editor deferral regression test**

Inject a ready `AppUpdaterController` through `AppShell`'s optional `updaterController` prop. Verify:

1. Ready update opens the dialog when the editor is closed.
2. Opening the editor hides/defer the update dialog.
3. Closing the editor reveals the still-ready update dialog.
4. The downloaded update is not discarded.

- [ ] **Step 8: Add stable toolbar CSS and run tests**

Add only narrowly scoped styles:

```css
.update-status-command {
  min-width: 34px !important;
  max-width: 180px;
  box-shadow: none !important;
}

.update-status-command[data-update-status="ready"] {
  background: var(--app-accent) !important;
  color: #ffffff !important;
}
```

Run:

```powershell
pnpm vitest run src/updater src/components/app/app-shell.test.tsx
pnpm lint
pnpm build
```

Expected: updater and shell tests PASS; lint/build exit 0.

- [ ] **Step 9: Commit updater UI**

```powershell
git add src/updater src/components/app/app-toolbar.tsx src/components/app/app-shell.tsx src/components/app/app-shell.test.tsx src/index.css
git commit -m "feat: add automatic update controls"
```

---

### Task 6: Add GitHub CI and Dual-Release Workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Modify: `scripts/release/publish-gitee-release.mjs`

**Interfaces:**
- Consumes all release scripts and updater configuration from Tasks 1-3.
- Produces GitHub and Gitee Releases with identical prepared files.
- Uses Secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `GITEE_TOKEN`.

- [ ] **Step 1: Add the CI workflow**

Create `ci.yml` with:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm build
      - run: cargo check --manifest-path src-tauri/Cargo.toml
```

- [ ] **Step 2: Add the release workflow trigger and validation**

Create `release.yml` with:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

concurrency:
  group: release-${{ github.ref_name }}
  cancel-in-progress: false

permissions:
  contents: write
```

Start the release job with these exact setup steps:

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm
- uses: dtolnay/rust-toolchain@stable
- uses: Swatinem/rust-cache@v2
  with:
    workspaces: src-tauri
- run: pnpm install --frozen-lockfile
```

Before build, fail if any required Secret is empty and run:

```yaml
- run: pnpm release:validate -- "${{ github.ref_name }}"
```

- [ ] **Step 3: Build signed NSIS artifacts**

Expose Secrets only to the build step:

```yaml
- name: Build signed updater artifacts
  run: pnpm tauri build --bundles nsis
  env:
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

- run: pnpm release:prepare -- "${{ github.ref_name }}"
```

The prepare command must fail unless the NSIS installer and matching `.exe.sig` both exist.

- [ ] **Step 4: Create and upload the GitHub Draft Release**

Use the official GitHub CLI:

```powershell
gh release view $env:GITHUB_REF_NAME 2>$null
if ($LASTEXITCODE -ne 0) {
  gh release create $env:GITHUB_REF_NAME --draft --title $env:GITHUB_REF_NAME --notes-file artifacts/release-notes.md
}
gh release upload $env:GITHUB_REF_NAME artifacts/release/* --clobber
```

Set `GH_TOKEN: ${{ github.token }}`. At this stage `latest.json` does not exist yet.

- [ ] **Step 5: Prepare the Gitee Release and generate latest.json**

Run:

```yaml
- run: pnpm release:gitee:prepare
  env:
    GITEE_TOKEN: ${{ secrets.GITEE_TOKEN }}
    GITHUB_REF_NAME: ${{ github.ref_name }}
```

Then generate `latest.json` from `artifacts/release-metadata.json`, `artifacts/gitee-release.json`, and the signature file:

```yaml
- run: pnpm release:manifest
```

The command writes:

```text
artifacts/release/latest.json
```

Upload it to the GitHub draft:

```powershell
gh release upload $env:GITHUB_REF_NAME artifacts/release/latest.json --clobber
```

- [ ] **Step 6: Publish both Releases and switch the stable manifest**

Order:

```yaml
- name: Publish GitHub release
  run: gh release edit "${{ github.ref_name }}" --draft=false
  env:
    GH_TOKEN: ${{ github.token }}

- name: Publish Gitee release and updater manifest
  run: pnpm release:gitee:publish
  env:
    GITEE_TOKEN: ${{ secrets.GITEE_TOKEN }}
    GITHUB_REF_NAME: ${{ github.ref_name }}
```

`release:gitee:publish` must publish the Gitee Release before updating `updater/latest.json`. If the final manifest write fails, the workflow fails and clients continue reading the old manifest.

- [ ] **Step 7: Upload workflow diagnostics without secrets**

Use `actions/upload-artifact@v4` to retain:

- `artifacts/release/*`
- `artifacts/release-metadata.json`
- `artifacts/gitee-release.json`

Do not upload private keys, environment dumps, request bodies, or token-bearing URLs.

- [ ] **Step 8: Validate workflow syntax locally**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

Also inspect both YAML files with:

```powershell
git diff --check
```

Expected: all commands exit 0; no malformed indentation or trailing whitespace.

- [ ] **Step 9: Commit CI and release workflows**

```powershell
git add .github scripts/release
git commit -m "ci: publish signed releases to GitHub and Gitee"
```

---

### Task 7: Document Operations and Verify a Local Signed Build

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-07-20-auto-release-updater-design.md` only if implementation reveals a factual correction.

**Interfaces:**
- Documents the three GitHub Secrets, release tag procedure, artifact locations, updater bootstrap, and key recovery constraints.

- [ ] **Step 1: Write documentation assertions first**

Add a small Node test or extend `release-utils.test.mjs` to read `README.md` and assert it contains:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
GITEE_TOKEN
v0.2.1
v0.3.0
Gitee
GitHub
```

Run:

```powershell
pnpm vitest run scripts/release/release-utils.test.mjs
```

Expected: FAIL until README is updated.

- [ ] **Step 2: Update README release and update sections**

Document:

- `v*` tag triggers both Releases.
- Gitee is the default update source.
- GitHub is fallback.
- `v0.2.1` users must manually install `v0.3.0` once.
- Future versions auto-download and ask before install/restart.
- Private key loss prevents publishing compatible future updater packages; keep an external backup.
- Initial installers may show SmartScreen because Authenticode is separate.

Do not put actual Secret values or local private-key contents in README.

- [ ] **Step 3: Add the v0.3.0 changelog section**

Add a dated `0.3.0` entry describing:

- GitHub/Gitee automated Releases.
- Signed Tauri updater.
- Gitee-first automatic download.
- Toolbar progress and install confirmation.
- One-time manual bootstrap from `v0.2.1`.

- [ ] **Step 4: Run all code verification**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: all tests PASS, lint/build/check exit 0.

- [ ] **Step 5: Build signed updater artifacts locally**

Load the private key and password into the current PowerShell process without printing them:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw (Join-Path $HOME '.tauri\zxsj-drop-filter.key')
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = Read-Host 'Updater key password'
pnpm tauri build --bundles nsis
```

Expected under `src-tauri/target/release/bundle/nsis`:

- setup `.exe`
- updater-enabled NSIS `.exe`
- updater `.exe.sig`

Clear both environment variables after build.

- [ ] **Step 6: Prepare and inspect release metadata**

Run:

```powershell
pnpm release:prepare -- v0.3.0
Get-Content -Raw artifacts/release-metadata.json
Get-Content artifacts/release/SHA256SUMS.txt
```

Expected: metadata names one NSIS installer reused by updater, one matching `.exe.sig`, and non-empty SHA-256 values.

- [ ] **Step 7: Commit documentation**

```powershell
git add README.md CHANGELOG.md scripts/release/release-utils.test.mjs
git commit -m "docs: explain releases and automatic updates"
```

---

### Task 8: Configure Secrets, Publish v0.3.0, and Verify Both Platforms

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `CHANGELOG.md` if final release notes need a factual correction.

**Interfaces:**
- Produces tag `v0.3.0`.
- Produces GitHub and Gitee Releases with identical artifacts.
- Produces stable Gitee `updater/latest.json`.

- [ ] **Step 1: Synchronize the v0.3.0 version**

Set `0.3.0` in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Regenerate lockfiles through normal package/Cargo commands rather than hand-editing lock entries.

Run:

```powershell
pnpm release:validate -- v0.3.0
```

Expected: PASS.

- [ ] **Step 2: Configure GitHub Secrets**

Confirm GitHub CLI authentication:

```powershell
gh auth status
```

Set the private key without echoing it:

```powershell
Get-Content -Raw (Join-Path $HOME '.tauri\zxsj-drop-filter.key') |
  gh secret set TAURI_SIGNING_PRIVATE_KEY --repo stickerwu/zxsj-drop-filter
```

Set the password and Gitee token through hidden interactive input or the authenticated GitHub repository settings UI. Verify names only:

```powershell
gh secret list --repo stickerwu/zxsj-drop-filter
```

Expected list contains all three required names. Do not print their values.

- [ ] **Step 3: Run pre-release verification**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
git status --short
```

Expected: all checks pass and only intentional release-version files are modified.

- [ ] **Step 4: Commit and tag the bootstrap release**

```powershell
git add package.json pnpm-lock.yaml src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: release v0.3.0"
git tag -a v0.3.0 -m "release: 诛仙高手秘境掉落软件 0.3.0"
```

- [ ] **Step 5: Push main and tag to GitHub**

```powershell
git push github main
git push github v0.3.0
```

Expected: GitHub Actions `Release` workflow starts for `v0.3.0`.

- [ ] **Step 6: Wait for and inspect the Release workflow**

Run:

```powershell
gh run list --workflow Release --limit 5 --repo stickerwu/zxsj-drop-filter
gh run watch --repo stickerwu/zxsj-drop-filter --exit-status
```

Expected: workflow succeeds. If it fails, inspect with `gh run view --log-failed`, fix the code, move the tag only after deleting the failed remote Release/tag artifacts deliberately, and rerun all verification.

- [ ] **Step 7: Verify GitHub and Gitee artifacts**

Verify both Releases contain matching names and hashes:

```text
zxsj-drop-filter_0.3.0_x64-setup.exe
zxsj-drop-filter_0.3.0_x64-setup.exe.sig
SHA256SUMS.txt
latest.json
```

Fetch Gitee:

```powershell
curl.exe -fsSL https://gitee.com/stickerwu/zxsj-drop-filter/raw/updater/latest.json
```

Expected manifest:

- version is `0.3.0`;
- platform is `windows-x86_64`;
- URL uses `gitee.com`;
- signature is non-empty.

- [ ] **Step 8: Push synchronized source and tag to Gitee**

GitHub Actions creates the Gitee Release through the API but does not replace normal git synchronization:

```powershell
git push gitee main
git push gitee v0.3.0
```

Expected: GitHub and Gitee source tags resolve to the same commit.

- [ ] **Step 9: Install and smoke-test v0.3.0**

Download the Gitee installer, verify its SHA-256 against `SHA256SUMS.txt`, install it, and check:

- app starts normally;
- toolbar update control appears;
- current version reports `0.3.0`;
- no-update state is reached without blocking the app;
- data import/export, editor, filters, tables, and theme switching still work.

This release cannot prove a live upgrade from `v0.2.1`, because `v0.2.1` has no updater. The first real production auto-upgrade will be `v0.3.0 -> v0.3.1`; unit tests and signed artifact checks cover the update path until that release exists.

- [ ] **Step 10: Record final release evidence**

Record in the final response:

- release commit and tag;
- GitHub and Gitee Release status;
- installer path and size;
- SHA-256;
- test count and build commands;
- exact one-time bootstrap limitation.
