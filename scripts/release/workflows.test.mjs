// @vitest-environment node

import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"

async function readWorkflow(name) {
  const filePath = path.join(process.cwd(), ".github", "workflows", name)
  return parse(await readFile(filePath, "utf8"))
}

describe("GitHub workflows", () => {
  it("runs all project checks on Windows for main and pull requests", async () => {
    const workflow = await readWorkflow("ci.yml")
    const job = workflow.jobs.verify
    const commands = job.steps
      .map((step) => step.run)
      .filter(Boolean)
      .join("\n")

    expect(workflow.on.push.branches).toContain("main")
    expect(workflow.on).toHaveProperty("pull_request")
    expect(job["runs-on"]).toBe("windows-latest")
    expect(commands).toContain("pnpm test")
    expect(commands).toContain("pnpm lint")
    expect(commands).toContain("pnpm build")
    expect(commands).toContain(
      "cargo check --manifest-path src-tauri/Cargo.toml",
    )
  })

  it("builds signed tags and publishes GitHub before the stable Gitee manifest", async () => {
    const workflow = await readWorkflow("release.yml")
    const job = workflow.jobs.release
    const serialized = JSON.stringify(workflow)
    const steps = job.steps.map((step) => `${step.name ?? ""}\n${step.run ?? ""}`)
    const githubPublishIndex = steps.findIndex((step) =>
      step.includes("Publish GitHub release"),
    )
    const giteePublishIndex = steps.findIndex((step) =>
      step.includes("Publish Gitee release and updater manifest"),
    )

    expect(workflow.on.push.tags).toContain("v*")
    expect(workflow.permissions.contents).toBe("write")
    expect(job["runs-on"]).toBe("windows-latest")
    expect(serialized).toContain("TAURI_SIGNING_PRIVATE_KEY")
    expect(serialized).toContain("TAURI_SIGNING_PRIVATE_KEY_PASSWORD")
    expect(serialized).toContain("GITEE_TOKEN")
    expect(serialized).toContain("pnpm tauri build --bundles nsis")
    expect(serialized).toContain("pnpm release:gitee:prepare")
    expect(serialized).toContain("pnpm release:manifest")
    expect(githubPublishIndex).toBeGreaterThan(-1)
    expect(giteePublishIndex).toBeGreaterThan(githubPublishIndex)
  })
})
