import { readFile } from "node:fs/promises"

function redact(value, token) {
  return String(value).split(token).join("[REDACTED]")
}

function encodePath(filePath) {
  return filePath.split("/").map(encodeURIComponent).join("/")
}

function appendFields(formData, fields) {
  for (const [name, value] of Object.entries(fields ?? {})) {
    if (value !== undefined && value !== null) {
      formData.append(name, String(value))
    }
  }
}

export function createGiteeApi({
  token,
  owner,
  repo,
  fetchImpl = fetch,
}) {
  if (!token) throw new Error("GITEE_TOKEN is required")

  const base = `https://gitee.com/api/v5/repos/${owner}/${repo}`

  async function request(
    endpoint,
    {
      method = "GET",
      form = null,
      file = null,
      query = null,
      allowNotFound = false,
    } = {},
  ) {
    const url = new URL(`${base}${endpoint}`)
    appendFields(url.searchParams, query)
    let body

    if (form || file) {
      body = new FormData()
      body.append("access_token", token)
      appendFields(body, form)
      if (file) {
        const bytes = await readFile(file.path)
        body.append("file", new Blob([bytes]), file.name)
      }
    } else {
      url.searchParams.set("access_token", token)
    }

    const response = await fetchImpl(url, { body, method })
    if (response.status === 404 && allowNotFound) return null

    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const detail =
        typeof payload === "string"
          ? payload
          : payload?.message ?? JSON.stringify(payload)
      throw new Error(
        redact(
          `Gitee API ${method} ${url.pathname} failed (${response.status}): ${detail}`,
          token,
        ),
      )
    }

    return payload
  }

  async function lookupBranch(branchName) {
    return request(`/branches/${encodeURIComponent(branchName)}`, {
      allowNotFound: true,
    })
  }

  async function lookupFile(filePath, branch) {
    const content = await request(`/contents/${encodePath(filePath)}`, {
      allowNotFound: true,
      query: { ref: branch },
    })
    return Array.isArray(content) && content.length === 0 ? null : content
  }

  return {
    assetDownloadUrl(releaseId, assetId) {
      return `${base}/releases/${releaseId}/attach_files/${assetId}/download`
    },
    async getReleaseByTag(tag) {
      return request(`/releases/tags/${encodeURIComponent(tag)}`, {
        allowNotFound: true,
      })
    },
    async createRelease(input) {
      return request("/releases", { form: input, method: "POST" })
    },
    async updateRelease(releaseId, input) {
      return request(`/releases/${releaseId}`, {
        form: input,
        method: "PATCH",
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
    async uploadAsset(releaseId, filePath, name) {
      return request(`/releases/${releaseId}/attach_files`, {
        file: { name, path: filePath },
        method: "POST",
      })
    },
    async ensureBranch(branchName, refs) {
      const existing = await lookupBranch(branchName)
      return (
        existing ??
        request("/branches", {
          form: { branch_name: branchName, refs },
          method: "POST",
        })
      )
    },
    async upsertFile({ branch, path: filePath, content, message }) {
      const existing = await lookupFile(filePath, branch)
      return request(`/contents/${encodePath(filePath)}`, {
        form: {
          branch,
          content: Buffer.from(content, "utf8").toString("base64"),
          message,
          ...(existing ? { sha: existing.sha } : {}),
        },
        method: existing ? "PUT" : "POST",
      })
    },
  }
}
