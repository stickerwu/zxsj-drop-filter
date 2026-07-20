# 诛仙高手秘境掉落软件

基于 Tauri 2、React、TypeScript 和 HeroUI v3 的本地掉落筛选工具。

本项目明确借鉴 **“诛仙世界-秘境掉落筛选”** 的页面组织、装备部位/属性筛选方式和掉落数据结构，在此基础上进行独立重实现和 UI 优化。本项目不是原项目的官方版本，也不代表与原项目作者或游戏运营方存在关联。

## 功能

- 属性、部位、副本组合筛选
- 与原版一致的 4 个基础属性 + 6 个双属性筛选项
- “命中任一”和“同一词条全满足”两种匹配模式
- 推荐宝鉴、最佳副本、命中概率、期望次数
- 命中装备和副本表现明细
- 亮色、暗色、跟随系统三档主题
- JSON / `.zx` 数据导入，以及 JSON 和兼容版 `.zx` 导出
- 兼容旧版 `zx1`：SHA-256 计数器流、XOR、zlib level 9 和旧目录表结构
- 固定高度掉落表编辑器：下拉切换副本、宝鉴、部位和属性，支持正权重校验
- 启动后自动检查更新，默认从 Gitee 下载，失败时回退 GitHub
- 后台显示下载进度，下载完成后由用户确认安装并重启
- 本地计算，不上传游戏数据

## 开发

```powershell
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm tauri:dev
```

构建 Windows 安装包：

```powershell
pnpm tauri:build
```

生成的 NSIS 安装包位于：

```text
src-tauri/target/release/bundle/nsis/诛仙高手秘境掉落软件_<版本号>_x64-setup.exe
```

## 自动发布与更新

推送 `vX.Y.Z` 标签会触发 GitHub Actions：

1. 校验 `package.json`、`Cargo.toml`、`tauri.conf.json` 和标签版本一致。
2. 运行测试、lint、前端构建和 Rust 检查。
3. 构建 Windows NSIS 安装包和对应的 Tauri updater 签名。
4. 自动创建 GitHub Release 和 Gitee Release，并上传相同产物。
5. 最后更新 Gitee `updater/latest.json` 稳定清单。

GitHub 仓库需要配置以下 Secrets：

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
GITEE_TOKEN
```

签名私钥和密码不能提交到仓库。私钥丢失后无法继续为现有客户端发布可验证的自动更新包，必须在仓库之外保留加密备份。

应用首先读取 Gitee 更新清单和 Gitee Release 附件；Gitee 请求失败时，再尝试 GitHub Release 的 `latest.json`。检测到新正式版后自动后台下载，下载完成后提供“稍后安装”和“立即安装并重启”。

本项目使用 Tauri v2 updater 格式：同一个 NSIS `setup.exe` 同时用于手动安装和应用内更新，Release 还会附带对应的 `setup.exe.sig`。不生成只用于兼容 Tauri v1 客户端的 `.nsis.zip`。

### 首次启用限制

`v0.2.1` 没有内置 updater，无法自行升级。现有用户需要手动下载安装一次 `v0.3.0`；从 `v0.3.0` 开始，后续正式版本才支持应用内自动更新。

Tauri updater 签名负责校验更新包完整性，但不等同于 Windows Authenticode 证书。当前首次下载安装包时，Windows SmartScreen 仍可能显示“未知发布者”提示。

## 数据说明

默认数据来自原程序提供的 `data/drop_tables.zx`，包含 5 个副本、40 组副本/宝鉴和 252 条装备掉落。JSON 是公开协作格式；`.zx` 可读取原版 `drop_tables.zx`，导出时会生成原程序可读取的目录表结构。

命中概率：

```text
命中权重之和 / 当前副本 + 宝鉴总权重
```

期望次数：

```text
1 / 命中概率
```

## 许可

MIT License。游戏名称和游戏数据的权利归其各自权利人所有。
