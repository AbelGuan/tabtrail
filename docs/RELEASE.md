# 首次开源与版本发布指南

面向第一次发布项目的维护者。本文介绍两件独立的事：**公开源码仓库**，以及**提供便于安装的版本包**。Chrome Web Store 上架是之后的另一个流程。

截至 2026-09-20，本地仓库尚无提交、未配置 Git 远程地址；文档整理不代表已经上传。今后状态有变化时，以实际仓库和 Releases 为准。

## 一、先明确哪些文件会公开

| 提交到源码仓库 | 不提交到源码仓库 |
| --- | --- |
| `extension/`、`tests/`、`scripts/` | `node_modules/`、浏览器用户目录 |
| README、LICENSE、PRIVACY、CONTRIBUTING、CHANGELOG | API Key、`.env`、私人导出记录、含令牌的网址 |
| `docs/` 中已核对的文档和截图 | `dist/` 生成包和临时日志 |
| `.github/` 反馈模板、`.gitignore`、`package.json` | `.git/` 不手动上传；它由 Git 自行管理 |

`.gitignore` 已忽略依赖、生成包和常见日志，但不能识别截图中的个人信息。发布前核对 [素材清单](ASSETS.md)。文件是否齐全及本次修改见 [开源准备核查](OPEN-SOURCE-REVIEW.md)。

尚需确定：

- [ ] GitHub 用户名和仓库名；建议名称可用 `tabtrail`，最终由维护者决定。
- [ ] LICENSE 的公开署名。目前为 `Attention Atlas contributors`，不要替别人填写姓名。
- [x] 演示数据已改为常见网站的虚构场景，全部文档截图同步更新。后续新增截图仍需核对。
- [ ] 网站品牌图标及扩展图标的实际来源；补记录或换成来源明确的素材。
- [ ] 实际可用的反馈与私密安全报告渠道。

## 二、先做本地验证

在项目根目录运行，开发环境安装见 [贡献指南](../CONTRIBUTING.md)：

```sh
npm test
npm run check
```

界面改动还应运行相应浏览器回归。至少在 Chrome 中手动加载 `extension/`，确认侧边栏、跳转、规则、恢复、排除和清空行为。

当前已有 68 项 Node 测试及三套网页回归结果，但真实扩展侧载脚本、后台休眠恢复、真实供应商调用、特殊播放器和存储压力尚未完成验收。manifest 声明最低 Chrome 114，并不代表已在该最低版本逐项实测；发布时不要据此承诺所有旧版本兼容。

## 三、用 GitHub Desktop 上传

建议选这一条路径，避免首次操作同时混用网页上传和命令行。

1. 安装 GitHub Desktop 并登录自己的 GitHub 账号。
2. 在菜单 **File → Add Local Repository** 选择项目根目录，即同时包含 README 和 `extension` 的目录；不要只选择 `extension`。仓库已有本地 Git 目录，可直接添加。[添加本地仓库说明](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)
3. 在 Changes 中逐个核对待提交文件。设置希望公开的提交作者名和邮箱；有邮箱隐私需求时使用自己账号提供的 noreply 邮箱。
4. 填写提交摘要，例如 `Prepare initial open-source version`，点击 **Commit to main**。这一步只在本机保存版本。
5. 点击 **Publish repository**，填写仓库名和简短说明，个人账号发布时不选择组织。准备公开时取消 **Keep this code private**，然后发布。[上传已有项目说明](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)
6. 在 GitHub 打开新仓库，确认 README、图片、文档链接、LICENSE 和目录都正常。确认 Issues 已开启，才把它作为公开反馈渠道。

如果你已经在网站创建了同名仓库，不要再创建第二个；应连接现有仓库。第一次上传时，避免在空远程仓库额外生成另一套 README、LICENSE，以免与本地内容冲突。

本项目的 `package.json` 中 `private: true` 只防止误发 npm，与上面的 GitHub Public/Private 选择不是一回事。

## 四、填入真实仓库信息

仓库地址确定后再填写，未确定时不使用示例用户的地址冒充实际信息：

- `package.json` 的 `repository`、`bugs`、`homepage`。
- GitHub About 中的简介和关键词；未部署的网站不要填写成在线演示地址。
- 文档需要的直接下载或支持链接。
- 私密报告入口配置完成后，再补充具体的 `SECURITY.md`。

GitHub 提供需由维护者启用的私密漏洞报告功能；本地文档不能代替服务器端配置。见 [官方配置说明](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)。

README 和许可证已具备，Issue/PR 模板本轮已补。CI 自动检查、英文 README、行为准则可以按后续维护需要添加，不是首次把代码上传的必需文件。不要为了勾满列表，写下尚未提供的支持承诺。

## 五、需要安装包时再创建 Release

公开源码后，别人已可下载源码并加载 `extension/`。若希望提供更方便的安装包：

1. 确认 manifest 和 `package.json` 的版本一致，更新 [版本记录](../CHANGELOG.md)。
2. 运行测试，然后执行 `npm run package`；它生成 `dist/Pickmark-版本号.zip`，附安装更新说明和校验文件。
3. 解压该 ZIP 并在 Chrome 加载，检查压缩包根目录直接有 `manifest.json`，再验证基本使用。
4. 确保本地打包源码与 GitHub 上准备发布的提交一致。
5. 在仓库 Releases 创建版本，选择对应提交并创建版本标签，例如首次 `v0.1.0`。当前实验性版本应说明限制，可标记为 pre-release。
6. 将生成的 ZIP 作为 Release 附件上传，不把它放入源码提交。
7. 从 Release 重新下载，按 README 的安装步骤检查一次。

GitHub 的自动 Source code 压缩包是整个仓库，不等于脚本生成的扩展 ZIP。两者安装时选择的目录不同。

## 六、Chrome Web Store 后续单独办理

GitHub 公开不等于扩展上架。提交商店前，还要完成开发者账号、商店素材、真实支持地址、公开隐私说明、权限和数据处理披露，并进一步做真实环境验收。

商店要求以提交当时的 [Chrome 官方发布说明](https://developer.chrome.com/docs/webstore/publish) 为准。当前项目不声称已通过审核，也不包含已发布的商店安装链接。
