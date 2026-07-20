# GitHub/Gitee 自动发布与应用更新设计

## 目标

为“诛仙高手秘境掉落软件”建立可重复执行的 Windows 发布链路，并在桌面应用顶部工具栏增加自动更新能力。

本次实现需要满足：

- 推送正式版本标签后，由 GitHub Actions 生成唯一一套 Windows 构建产物。
- 自动创建 GitHub Release 和 Gitee Release，并向两端上传相同的安装包与校验文件。
- 应用启动后自动检查正式版更新。
- 默认从国内 Gitee 下载更新，Gitee 不可用时回退 GitHub。
- 检测到更新后自动后台下载，下载完成后由用户确认安装并重启。
- 所有自动更新包必须通过 Tauri 签名验证。
- 发布失败时不能覆盖现有稳定更新清单。

## 非目标

- 不建立 Gitee Go 或第二套独立构建环境。
- 不支持 macOS、Linux、移动端或增量更新。
- 不发布预览版、测试版或 nightly 更新频道。
- 不引入遥测、账号、云同步或强制更新。
- 不购买或配置 Windows Authenticode 商业证书。
- 不修改掉落筛选、数据编辑、推荐计算或 `.zx` 数据结构。

## 总体架构

GitHub Actions 是唯一构建与发布编排器。工作流在 `windows-latest` 上构建一次，然后把完全相同的文件上传到 GitHub 和 Gitee。

发布链路分为四个边界明确的部分：

1. **版本校验器**：确认标签与 npm、Cargo、Tauri 三处版本一致。
2. **Tauri 构建器**：运行质量检查并生成 NSIS 安装包、更新 ZIP 和签名。
3. **发布编排器**：创建两端 Release、上传附件并生成更新清单。
4. **应用更新器**：检查清单、下载签名包、提示安装并重启。

构建和发布只由 `vX.Y.Z` 格式的标签触发。普通分支和 Pull Request 只运行持续集成，不创建 Release。

## 仓库文件

计划新增或修改以下边界：

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `scripts/release/validate-version.mjs`
- `scripts/release/gitee-release.mjs`
- `scripts/release/generate-updater-manifest.mjs`
- `scripts/release/*.test.ts`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src/updater/updater-client.ts`
- `src/updater/use-app-updater.ts`
- `src/updater/update-status-control.tsx`
- `src/updater/update-ready-dialog.tsx`
- 对应的 updater 测试文件
- `src/components/app/app-toolbar.tsx`
- `src/components/app/app-shell.tsx`
- `README.md`

发布脚本使用 Node.js 标准 API 和 Gitee 官方 REST API，不依赖用途重叠的第三方 Release Action。

## Tauri 更新配置

Rust 端增加：

- `tauri-plugin-updater`
- `tauri-plugin-process`

应用启动时注册 updater 和 process 插件。Tauri capability 仅增加检查、下载、安装和重启所需权限。

`tauri.conf.json` 增加：

- `bundle.createUpdaterArtifacts: true`
- updater 公钥
- Gitee 主端点
- GitHub 备用端点
- Windows `passive` 安装模式

端点顺序固定为：

1. `https://gitee.com/stickerwu/zxsj-drop-filter/raw/updater/latest.json`
2. `https://github.com/stickerwu/zxsj-drop-filter/releases/latest/download/latest.json`

Gitee 返回非成功状态或网络失败时，Tauri 才尝试 GitHub。Gitee 正常返回清单时，更新包下载地址仍指向 Gitee Release 附件。

仓库只保存签名公钥。签名私钥和密码只能通过 GitHub Actions Secrets 注入。

## 发布密钥与 Secrets

GitHub 仓库需要配置：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `GITEE_TOKEN`

GitHub Release 使用工作流自带的 `GITHUB_TOKEN`。

`GITEE_TOKEN` 只需要具备当前 Gitee 仓库创建 Release、上传附件、创建或更新 `updater` 分支文件的权限。工作流不能输出令牌值、带令牌的 URL 或完整请求头。

如果任一必要 Secret 缺失，发布工作流必须在构建或上传前明确失败，不能降级生成未签名更新包。

Tauri 更新签名用于验证更新包来源和完整性，但不替代 Windows Authenticode。首次下载普通安装包时，Windows SmartScreen 仍可能提示未知发布者。

## 持续集成

`.github/workflows/ci.yml` 在 `main` 推送和 Pull Request 时运行：

1. 安装固定的 pnpm 版本。
2. 安装 Node.js 和 Rust 工具链。
3. 使用 lockfile 安装依赖。
4. 运行 `pnpm test`。
5. 运行 `pnpm lint`。
6. 运行 `pnpm build`。
7. 运行 `cargo check --manifest-path src-tauri/Cargo.toml`。

CI 不访问 Gitee Token，不生成 Release，也不使用 Tauri 私钥。

## Release 工作流

`.github/workflows/release.yml` 仅响应 `v*` 标签，并允许通过 GitHub 界面手动重跑。

发布顺序固定如下：

1. 校验标签严格匹配 `vX.Y.Z`。
2. 校验以下版本全部等于去掉 `v` 的标签版本：
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
3. 从 `CHANGELOG.md` 提取当前版本说明；缺少对应版本时失败。
4. 运行测试、lint、前端构建和 Rust 检查。
5. 使用 Tauri 签名 Secrets 构建 Windows NSIS 安装包和 updater artifacts。
6. 检查以下文件均存在且非空：
   - NSIS `.exe`
   - NSIS updater `.zip`
   - updater `.zip.sig`
7. 生成 `SHA256SUMS.txt`。
8. 创建 GitHub Draft Release。
9. 创建 Gitee prerelease；如果同标签 Release 已存在，则复用并清理同名旧附件。
10. 向两端上传安装包、更新 ZIP、签名和 SHA-256 文件。
11. 读取 Gitee 更新 ZIP 附件 ID，生成 `latest.json`。
12. 向 GitHub 和 Gitee Release 上传 `latest.json`。
13. 将 GitHub Draft 和 Gitee prerelease 转为正式 Release。
14. 最后创建或更新 Gitee `updater` 分支中的 `latest.json`。

第 14 步是稳定更新入口的唯一切换点。它执行前，旧版本客户端仍读取上一个稳定清单，因此不会看到半发布版本。

工作流使用 GitHub concurrency，按标签限制并发。同一标签重跑时执行幂等的“查找或创建、替换同名附件”逻辑，避免生成重复 Release 或重复附件。

## Gitee Release 编排

Gitee 脚本调用官方 API：

- 根据标签查询 Release。
- 创建或更新 Release。
- 上传 Release 附件。
- 查询附件并获得附件 ID。
- 删除同名旧附件。
- 创建 `updater` 分支。
- 创建或更新 `updater/latest.json`。

Gitee 更新 ZIP 使用公开下载端点：

```text
https://gitee.com/api/v5/repos/stickerwu/zxsj-drop-filter/releases/{release_id}/attach_files/{attach_file_id}/download
```

首次发布时，如果 `updater` 分支不存在，脚本从当前标签提交创建该分支。之后仅通过 Gitee Contents API 更新 `latest.json`，不向 `main` 写入自动提交。

## 更新清单

`latest.json` 使用 Tauri 静态更新清单格式：

```json
{
  "version": "0.3.0",
  "notes": "当前版本更新说明",
  "pub_date": "2026-07-20T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "更新 ZIP 对应的签名内容",
      "url": "Gitee 更新 ZIP 公开下载地址"
    }
  }
}
```

清单规则：

- `version` 不包含 `v`。
- `notes` 来自当前版本的 changelog 段落。
- `pub_date` 使用工作流生成的 RFC 3339 UTC 时间。
- `signature` 是 `.sig` 文件内容，不是签名文件 URL。
- `url` 必须指向 updater ZIP，不能指向普通 `.exe`。
- 只包含 `windows-x86_64`。
- 预发布版本不能写入稳定清单。

GitHub Release 中的 `latest.json` 与 Gitee `updater` 分支中的文件内容一致。即使 GitHub 回退端点返回该清单，实际更新包仍优先从 Gitee 下载。

## 应用更新状态机

更新状态独立于掉落业务 Zustand store，使用专用 hook 管理：

- `idle`
- `checking`
- `up-to-date`
- `downloading`
- `ready`
- `installing`
- `error`
- `unavailable`

状态转换：

```text
idle -> checking
checking -> up-to-date | downloading | error
downloading -> ready | error
ready -> installing | ready
installing -> error
error -> checking
```

浏览器开发环境进入 `unavailable`，不加载或调用原生 updater。正式 Tauri 环境在主界面渲染约 1.5 秒后进入 `checking`。

发现比当前版本新的正式版后立即自动下载。下载过程中通过 Tauri 事件累计 `contentLength` 和 `chunkLength`，得到可展示的真实进度；服务端未提供总长度时显示不确定进度，不伪造百分比。

下载完成后保留 Tauri `Update` 对象，等待用户安装。组件卸载或应用退出时释放该对象。

## 工具栏交互

更新状态控件放在顶部工具按钮组靠右、主题切换之前，保持与现有 HeroUI 工具栏尺寸一致。

各状态表现：

- `checking`：旋转图标和“正在检查”。
- `up-to-date`：短暂显示“已是最新 vX.Y.Z”，随后收为可点击检查图标。
- `downloading`：显示“下载 vX.Y.Z”和真实百分比或不确定进度。
- `ready`：强调色按钮“更新已就绪 vX.Y.Z”。
- `installing`：禁用按钮“正在安装”。
- `error`：警告色“更新失败”，点击重试，Tooltip 展示可读错误。
- `unavailable`：隐藏控件。

用户可以在非下载和非安装状态下手动重新检查。连续点击必须合并为同一个检查请求。

## 安装确认

自动下载完成后显示 HeroUI 确认框，内容包括：

- 当前版本。
- 新版本。
- 从清单读取的更新说明。
- “稍后安装”按钮。
- “立即安装并重启”主按钮。

如果掉落表编辑器正在打开，不叠加第二个 Modal。更新状态保持 `ready`，等编辑器关闭后再显示安装确认框。

选择“稍后安装”只关闭确认框，不丢弃已下载更新。工具栏继续显示“更新已就绪”，用户可再次打开确认框。

选择“立即安装并重启”后：

1. 状态切换为 `installing`。
2. 调用 Tauri `update.install()`。
3. 安装成功后调用 process plugin 的 `relaunch()`。
4. 安装失败时返回 `error`，保留可重试入口，不主动退出旧版本。

## 错误处理

- 无网络：显示检查失败，筛选、编辑和本地数据继续工作。
- Gitee 端点失败：由 Tauri 尝试 GitHub 端点。
- 下载中断：不调用安装，下一次启动或手动操作重新检查和下载。
- 签名错误：拒绝安装，并显示“更新包签名验证失败”。
- 清单结构错误：显示“更新信息无效”，不猜测下载地址。
- 安装失败：应用保持当前版本运行，提供重试。
- Release 上传失败：不更新 Gitee 稳定清单。
- Gitee 稳定清单更新失败：工作流失败，但已经发布的安装包仍可手动下载；客户端继续停留在上一稳定版本。

用户可见错误不显示私钥、Token、绝对构建路径、请求头或原始堆栈。详细错误只进入开发日志。

## 测试设计

### 前端单元测试

通过注入 fake updater client 覆盖：

- 启动延迟后自动检查。
- 无更新进入 `up-to-date`。
- 发现更新后自动下载。
- 已知大小时计算下载进度。
- 未知大小时使用不确定进度。
- 下载完成进入 `ready`。
- “稍后安装”不丢弃更新。
- 安装成功后调用 relaunch。
- 检查、下载、安装失败进入可重试状态。
- 重复点击不会并发检查。
- 非 Tauri 环境不调用原生 API。
- 编辑器打开时延迟显示安装确认框。

### 组件测试

覆盖：

- 工具栏各状态的文字、图标、颜色语义和禁用状态。
- 错误 Tooltip 与点击重试。
- 安装确认框的版本和更新说明。
- “稍后安装”和“立即安装并重启”事件。

### 发布脚本测试

覆盖：

- 标签格式校验。
- 三处版本不一致时失败。
- changelog 版本段提取。
- updater ZIP 与 `.sig` 配对。
- 缺少任何必要附件时失败。
- Gitee 附件响应转为公开下载 URL。
- `latest.json` schema 和内容。
- Gitee Release 重跑时替换同名附件。

网络发布脚本拆分纯函数和 API adapter。单元测试只 mock API adapter，不调用真实 GitHub/Gitee Release。

## 验收标准

- `pnpm test`、`pnpm lint`、`pnpm build` 和 Cargo 检查全部通过。
- 本地 Tauri 构建生成 NSIS 安装包、updater ZIP 和 `.sig`。
- 测试清单可被旧版本应用识别，并显示正确的新版本和说明。
- 下载进度能在工具栏稳定显示，不改变工具栏高度。
- 编辑器打开时不会出现叠加更新 Modal。
- 签名损坏的更新包无法安装。
- 推送新正式标签后，两端出现版本、说明和附件一致的正式 Release。
- Gitee `updater/latest.json` 最后更新，并指向该 Gitee Release 的 updater ZIP。
- Gitee 正常时从 Gitee 下载；Gitee 失败时能使用 GitHub 清单回退。
- 用户选择“立即安装并重启”后完成安装并启动新版本。

## 官方参考

- Tauri Updater Plugin: `https://v2.tauri.app/plugin/updater/`
- Tauri GitHub Actions Pipeline: `https://v2.tauri.app/distribute/pipelines/github/`
- GitHub Actions Release 文档: `https://docs.github.com/actions`
- Gitee Open API Swagger: `https://gitee.com/api/v5/swagger`
- Gitee Open API JSON: `https://gitee.com/api/v5/swagger_doc.json`
