# 开发文件归档 · 2026-10-26

这里保存历次设计实验和导出物，不属于当前插件运行入口，也不作为当前功能或发布状态的依据。

| 原位置 | 归档位置 |
| --- | --- |
| `prototypes/` | [原型与配套测试](prototypes/README.md) |
| `tabkeep-prototype.html` | [早期参考页面](tabkeep-prototype.html) |
| `previews/` | [颗粒实验](previews/brand-lab/index.html)、[液态实验](previews/material-lab/index.html)及性能记录 |
| `exports/` | [历史交接包](exports/Tabkeep-OFFSET-03-AI-Handoff-2026-10-13.zip)与配套说明 |
| `docs/prototype-redesign/` | [历史视觉截图](screenshots/prototype-redesign/) |
| `docs/screenshots-20261011/` | [2026-10-11 截图](screenshots/screenshots-20261011/) |
| `dist/Pickmark-0.1.1` 至 `0.1.3` 的 ZIP 与 SHA256 | [早期回退包](releases/) |

历史交接包以 ZIP 内的完整内容为准；`exports/offset-03-package-notes/` 是当时的替换说明文件，不是完整的独立演示目录。原型测试保存在原型目录中，继续使用相邻的模拟页面。

如需运行 `scripts/liquid-parity-check.mjs` 的历史样例对照，样例服务目录已改为 `archive/2026-10-26/previews/material-lab`，端口仍为 4197。仅在需要对照时手动启动，结束后关闭：

```sh
python3 scripts/preview-server.py --port 4197 --directory archive/2026-10-26/previews/material-lab
```

## 保留在原位

- 当前插件源码、全部现用测试与 `docs/offset-live/` 回归素材。
- `tabkeep-icons/` 图标源文件和现用扩展图标，图标导出脚本仍使用其中的 SVG。
- `dist/Pickmark-0.1.4.zip`、`dist/Pickmark-0.1.5.zip` 及其校验文件。
- `dist/Pickmark-0.1.2/`、`dist/Pickmark-0.1.3/`、`dist/tabtrail-chrome-store-0.1.0/`，作为可能的 Chrome 加载目录，未修改内容；其中两个 `.DS_Store` 也保留。

这些 ZIP 是历史回退产物。尤其是 `dist/Pickmark-0.1.5.zip` 已落后于当前源码，本次没有重新打包或覆盖它。

## 已清理

- 加载目录之外的 6 个 `.DS_Store`。
- 重复截图压缩包；其中 14 张图片与保留的归档截图逐字节相同。
- 未被运行入口引用的旧原型样式，以及旧标志、GitHub、Gmail、哔哩哔哩共 4 个 SVG。

## 清理验证

已核对移动前后的文件哈希、五份回退包校验值及 43 处相关文档链接；旧 Chrome 目录内容未变。语法与元素引用检查、153 项单元测试、12 组界面检查、4 组模拟设置保存与分组预览流程均通过，实际页面加载未发现缺失模块、样式或图标。测试未访问真实书签或邮箱，临时服务均已关闭。

复审补充：55 个保留的运行文件及受保护目录仍与清理前一致，项目文档链接检查扩大至 112 处。已在临时目录实际打包并运行解压后的模拟界面，4 组设置保存与分组预览流程通过；归档液态样例的 16 项逐像素对照通过。两篇历史观察笔记中已过期的临时截图改为文字记录，未补造图片。原回退包未覆盖，临时构建文件和服务已清除。
