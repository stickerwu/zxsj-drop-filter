# 诛仙世界 · 秘境掉落筛选

基于 Tauri 2、React、TypeScript 和 shadcn/ui 的本地掉落筛选工具。

## 功能

- 属性、部位、副本组合筛选
- “命中任一”和“同一词条全满足”两种匹配模式
- 推荐宝鉴、最佳副本、命中概率、期望次数
- 命中装备和副本表现明细
- JSON / `.zx` 数据导入，以及 JSON 导出
- 掉落表编辑器：新增、修改、核对、删除、应用当前表
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

## 数据说明

仓库中的数据仅用于演示。真实掉落表文件不会被 Git 跟踪。JSON 是公开协作格式；`.zx` 是兼容格式边界，载入失败时会显示具体错误。

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
