# Tabkeep · 四种视觉方向与 OFFSET 完整原型

打开 `index.html` 比较四种方向。**03 已按用户提供的 `Pickmark-OFFSET-03-Mono-2026-10-13.zip` 原样更新为「拾签 / Pickmark」单色完整双面板设计**；其余三版仍保留原来的书签单页研究。更新范围是当前独立原型，生产插件未修改。

| 入口 | 方向 | 内容 |
| --- | --- | --- |
| `01-optic.html` | 光学界面 | 冷白、电蓝定位、行内展开预览 |
| `02-signal.html` | 信号界面 | 近黑、橙色焦点、内容索引与固定预览台 |
| `03-offset.html` | 拾签 · OFFSET MONO | 黑白灰、点阵页头、紧凑列表、状态栏、八个主要页面、分段反色与浮动网页缩略图 |
| `04-prism.html` | 棱镜视窗 | 冷银灰、细光谱边缘、层叠预览视窗 |

## OFFSET 页面与交互

从顶部切换「标签页 / 书签」，从左侧导航切换页面。窄屏使用左上角菜单。

| 页面 | 可操作内容 |
| --- | --- |
| 标签工作区 | 分类筛选、列表 / 画廊、待分类整理、人工调整、预览 |
| 每日回顾 | 网站 / 工作区时间分布、选择小时、浏览路径与预览 |
| 继续浏览 | 选择日期、历史补分类、人工调整、恢复清单演示 |
| 书签原文件夹 | 保留目录、按文件夹筛选、列表 / 画廊、预览 |
| 书签智能分类 | 按主题筛选、整理待分类、人工调整，原目录保持不变 |
| 工作区管理 | 新建、重命名，同时更新对应模拟记录与分类规则 |
| 分类规则 | 标签与书签分别配置，添加网站规则、启停规则 |
| 设置与隐私 | 系统 / 浅色 / 深色外观、悬停预览开关、重置演示 |

搜索可从顶部按钮或 ⌘/Ctrl K 打开。各面板保留自己的搜索、筛选与列表 / 画廊选择。内容页的眼睛按钮打开固定预览，更多按钮调整分类。点击标题只展示打开行为说明，不访问该网站。

新版沿用参考包的紧凑 / 舒适密度切换、固定底部状态栏、可独立滚动和筛选的分类区、固定管理入口及吸顶列表工具栏。键盘 ↑↓ 或 J/K 移动选择，空格预览，Enter 演示打开，/ 搜索，E 整理；标签工作区中 Backspace / Delete 关闭选中的模拟标签。网站示意图标保留原色，界面为黑白灰。

列表悬停参考用户提供的 Inkfish List 录屏：左侧色块先展开，12 道递减竖条依次展开，然后右侧反色，缩略图在列表右下方浮现。文字和行尺寸保持固定，缩略图不跟随鼠标移动。快速切换行会取消尚未显示的旧预览；移出或 Esc 隐藏；键盘聚焦也能显示预览。窄屏使用眼睛按钮，系统减少动态效果时保留静态反色与预览。

## 模拟数据与功能边界

完整版包含 74 个标签、64 条书签和 9 条历史记录。历史演示日期为 **2026-10-12**；其他日期显示空状态。书签中包含同一网址在不同文件夹的两条记录，也包含没有缩略图的记录。

历史补分类只处理当前范围内未人工调整的「待整理」记录，保留已有分类；后续人工调整会同步到恢复快照。恢复清单模拟复用已有标签。书签补分类保留原文件夹，标签与书签规则独立生效。所有这些都只是页面内存中的交互演示，刷新即重置；不替代生产插件的真实逻辑。

SVG 缩略图为本地绘制的示意网页，域名为模拟内容或公开网站名称。没有外部资源、网络请求、Chrome API、账号接入或浏览器存储写入。**不读取真实书签、邮箱或 Chrome 个人资料；未修改 `extension/` 及真实历史补分类实现。** 配色避开墨绿与纸白。

## 文件与验证

完整版由 `03-offset.html`、`offset-app.css`、`offset-app.js` 组成。01 / 02 / 04 继续使用原来的 `shared.css` 和 `shared.js`。`03-offset-desktop.png` 与 `03-offset-mobile.png` 保留为旧方向的截图；完整版截图使用 `offset-full-*.png`。

`check-offset-app.mjs` 使用临时隔离的 Chrome，并拦截所有 HTTP(S) 请求。已通过：分段动画时序、行尺寸固定、预览位置固定、快速切换、移出 / Esc、缺图、键盘与窄屏按钮预览、八个页面、手动分类和原目录保护、历史补分类及恢复、分面板规则、搜索空状态、画廊与主题；在 1440 / 1024 / 818 / 768 / 390 / 320 px 检查布局溢出。页面错误、控制台错误、外部请求均为零。

`check-designs.mjs` 单独检查其余三版原型及对比入口。截图已人工查看桌面、悬停、每日回顾、深色设置与手机布局。生产插件的 Git 状态摘要与本轮开始前一致。

`check-offset-mono.mjs` 补测新版密度切换、键盘选择 / 预览 / 搜索 / 关闭、状态数量更新、分类筛选与固定管理入口、吸顶工具栏。提供 `OFFSET_REFERENCE_DIR`（原始参考包的解压目录）时，还会核对三个运行文件内容，并将八个桌面页面、两个手机页面、悬停和深色设置共 12 个状态在同一隔离浏览器中截图比较。本轮 12 组截图字节完全一致；新增交互检查通过，零错误和外部请求。

复查命令（需 Playwright 与 Chrome）：

```sh
PLAYWRIGHT_MODULE=/Users/abelguan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node archive/2026-10-26/prototypes/bookmark-directions/check-offset-app.mjs
PLAYWRIGHT_MODULE=/Users/abelguan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node archive/2026-10-26/prototypes/bookmark-directions/check-designs.mjs
PLAYWRIGHT_MODULE=/Users/abelguan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node archive/2026-10-26/prototypes/bookmark-directions/check-offset-mono.mjs
```
