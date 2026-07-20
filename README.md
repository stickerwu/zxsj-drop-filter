# 诛仙高手工具箱

基于 Tauri 2、React、TypeScript 和 HeroUI v3 的《诛仙世界》本地辅助工具箱。

当前提供“秘境掉落”和“天工机巧盘”两个完全本地运行的工具模式，不上传游戏数据。

## 功能

### 秘境掉落

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

### 天工机巧盘

- 7 行 × 6 列异形盘面，支持点击和拖拽编辑实际解锁区域
- 默认解锁中间四行 24 格，可全部解锁、全部锁定或恢复默认
- 匠心石固定 `2×2` 且必须放置 1 个
- 支持正方形、L 型、T 型、一字型和 J 型机巧石库存
- 机巧石允许旋转、不允许镜像，不要求用完全部库存
- Web Worker 中使用 SAT 约束求解器本地计算，不阻塞界面
- 最多求解 5000 个方案，支持上一解/下一解和用石统计
- 配置自动保存，并支持 `tiangong-board.json` 导入导出
- 通过“库存扫描”读取游戏中机巧石和匠心石页面，核对后同步五类库存数量
- 支持 `Ctrl+Shift+F8` 手动采集、多个游戏窗口选择、低置信度修正和漏项手动补充

### 库存扫描使用方法

1. 启动《诛仙世界》，请打开个人游戏角色的“天工机巧盘”页面并进入机巧石库存，游戏窗口不能最小化。
2. 在工具箱的“天工机巧盘”模式点击“库存扫描”，选择游戏窗口并开启扫描。
3. 在游戏中切换“机巧石 / 匠心石”页签，手动滚动列表，每次保留至少一行重叠后按 `Ctrl+Shift+F8`。
4. 在独立核对窗口修正低置信度字段、未知形状、误识别项和漏项。
5. 两个页签条目数与游戏显示总数一致后，点击“应用库存”同步到求解器。

### 安全与隐私边界

- 仅使用 Windows 窗口捕获和本地 OCR，不注入 DLL、不读取游戏内存、不分析封包。
- 不自动激活游戏、不发送鼠标键盘输入、不自动点击或滚动。
- 原始截图和卡片裁剪只存在于当前进程内存，确认、取消或退出后释放，不写入磁盘。
- 仅最后一次确认后的结构化清单保存到 Tauri `app_data_dir/tiangong-inventory-v1.json`。
- OCR 可能受游戏更新、分辨率、界面缩放和遮挡影响；锚点或数量无法核实时不会猜测或写入库存。
- 首版仅支持 Windows x64 和简体中文游戏客户端。
- 核对窗口使用 HeroUI 的下拉框、数字输入、开关、页签和文本输入组件，并跟随工具箱亮色、暗色或系统主题。

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
src-tauri/target/release/bundle/nsis/诛仙高手工具箱_<版本号>_x64-setup.exe
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

应用首先读取 Gitee 更新清单和 Gitee Release 附件；Gitee 请求失败时，再尝试 GitHub Release 的 `latest.json`。发布阶段若 Gitee 大附件连续重试仍失败，Gitee 清单会临时指向同版本 GitHub Release 安装包，保证更新链路可用。检测到新正式版后自动后台下载，下载完成后提供“稍后安装”和“立即安装并重启”。

本项目使用 Tauri v2 updater 格式：同一个 NSIS `setup.exe` 同时用于手动安装和应用内更新，Release 还会附带对应的 `setup.exe.sig`。不生成只用于兼容 Tauri v1 客户端的 `.nsis.zip`。

### 首次启用限制

`v0.2.1` 没有内置 updater，无法自行升级。现有用户需要手动下载安装一次 `v0.3.0`；从 `v0.3.0` 开始，后续正式版本才支持应用内自动更新。

Tauri updater 签名负责校验更新包完整性，但不等同于 Windows Authenticode 证书。当前首次下载安装包时，Windows SmartScreen 仍可能显示“未知发布者”提示。

## 数据说明

默认数据来自原程序提供的 `data/drop_tables.zx`，包含 5 个副本、40 组副本/宝鉴和 252 条装备掉落。JSON 是公开协作格式；`.zx` 可读取原版 `drop_tables.zx`，导出时会生成原程序可读取的目录表结构。

秘境掉落模式明确借鉴 **“诛仙世界-秘境掉落筛选”** 的页面组织、装备部位/属性筛选方式和掉落数据结构，并在此基础上独立重实现和优化 UI。

天工机巧盘模式参考公开的 **“天工机巧盘 · 自动排列求解器”** 所展示的盘面规则与交互方式，求解逻辑和界面均在本仓库内独立实现，不依赖或嵌入参考网站。

库存扫描使用 PaddleOCR 官方 PP-OCRv5 mobile detection/recognition ONNX 模型，模型与字典随安装包离线提供；OCR 运行库使用 `paddleocr_rs_onnx`，窗口捕获使用 `windows-capture`。相关第三方组件遵循各自开源许可。

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
