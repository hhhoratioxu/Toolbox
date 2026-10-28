# v1.1 · 动态分流库与配置生成验证

日期：2026-10-28，Asia/Taipei。以下区分自动测试、仓库自动化、浏览器操作和真实客户端。

## 本地自动测试与构建

- `pnpm test`：7 个文件、132 项测试通过，包含原有 91 项与新增目录 / 生成器 41 项。
- `pnpm build:pages`：TypeScript 与 Vite 生产构建通过，独立 Web Worker 保留。
- 目录测试覆盖：六端原生文件、新分类无需改代码、文件新增 / 修改 / 删除、截断目录拒绝、失败保持错误、固定提交读取、Git blob SHA 校验、UTF-8 BOM 与 CRLF、只更新已追踪来源、公开目录优先及 API 回退。
- 生成器测试覆盖：六种原生规则地址、顺序与策略、兜底、Mihomo / Egern 独立 YAML、原生 Loon 再解析、片段不覆盖节点、HTTP 节点字段和输入校验、六端 ZIP 实际内容。

## Proxy 仓库自动目录

- 发布提交：[82b0fd4](https://github.com/hhhoratioxu/Proxy/commit/82b0fd47f7417e7b2709d42e53ffbce1f52f769e)。仅增加生成脚本、工作流、目录 JSON 和说明，已有规则文件 SHA 全部保持。
- 实际工作流：[40716789276](https://github.com/hhhoratioxu/Proxy/actions/runs/40716789276)，`catalog` 任务与目录生成步骤均为 `success`。
- 工作流自动提交：[edc2a7d](https://github.com/hhhoratioxu/Proxy/commit/edc2a7dd7892c9f0a0704a5b39d3ce2f3ab5f527)。公开目录包含 26 分类、156 个原生规则文件，记录源码提交与每个文件的 Git blob SHA。
- 生成脚本、工作流、说明已通过固定提交 Raw 逐字节核对。生成脚本另在临时真实 Git 仓库中验证：只扫描客户端规则目录，SHA / 源码提交 / tree 对应真实 Git 对象。
- 后续规则推送触发目录重建；读取者需要等待工作流完成。工作流普通推送、并发推进重试，不强制覆盖其他提交。

## 已实际执行的浏览器检查

在本地运行的真实浏览器中完成：

1. 打开「我的分流库」，通过公开目录读取 26 分类 / 156 文件，显示目录生成时间和版本 `82b0fd4`。正常路径不再依赖已实际遇到 403 限流的匿名 API。
2. 选择 AI、Parsec、Spotify；切换六客户端页签，选择跨端保留，原生文件地址分别显示对应客户端路径。
3. 修改 AI 策略、调整 Parsec 顺序，下载 Surge 单文件与六端 ZIP。实际打开下载文件，核对六个配置和说明均存在，两个 YAML 可解析，规则 URL 跟随各客户端的 main 路径，策略和顺序保留。
4. 添加三项 Loon 原生版本；实际下载并校验，分别解析为 Parsec 3 条、AI 971 条、Spotify 30 条。Spotify 中尚未支持的 USER-AGENT 保留并显示提示。
5. 查询 `api.parsec.app`，命中 `DOMAIN-SUFFIX,parsec.app`；规则库模式保持「未提供策略绑定」。点击结果定位原文件 L15。
6. 原文定位链接固定到实际加载版本：[Parsec.lsr L15](https://github.com/hhhoratioxu/Proxy/blob/82b0fd47f7417e7b2709d42e53ffbce1f52f769e/Loon/rule/Parsec.lsr#L15)，界面也展示已加载提交。
7. 生成 Loon 配置并「放入配置模拟」，所生成主配置被选中，Parsec 原生引用的策略绑定为 DIRECT，可追溯主配置引用位置与规则 L15。后续 FINAL 明确解释为前面的匹配已经决定策略。
8. 再点击「更新规则库」，完成公开目录检查，未改变文件无需重新下载。更新中按钮切为可取消状态。
9. 390 × 844 手机视口检查目录与生成器，文档没有水平溢出；底部添加、ZIP、模拟和下载按钮保持可见。

目录新增 / 修改 / 删除的组合行为通过自动测试验证；没有向正式规则目录添加假的服务来制造更新演示。

## 已完成的线上发布检查

- 正式地址：[Rule Finder](https://hhhoratioxu.github.io/Toolbox/RuleFinder/)，实际显示版本 1.1。
- 应用提交：[f57bd44](https://github.com/hhhoratioxu/Toolbox/commit/f57bd44a5e45e363f2c1889514401c7babc042ec)。本地 Git tree 与 GitHub 新 tree 一致；目录、生成器、App 和 package.json 通过固定提交 Raw 逐字节核对。
- Pages 工作流：[40719372062](https://github.com/hhhoratioxu/Toolbox/actions/runs/40719372062)，`build` 与 `deploy` 均为 `success`，包括 Rule Finder 的测试和构建步骤。
- 在正式 HTTPS 网站实际打开规则库，先显示快照与加载状态，随后读取公开目录，显示 `82b0fd4`、26 分类、156 文件。
- 在线选择 AI、Parsec 并添加，工作区加载 974 条规则；查询 `api.parsec.app` 命中 Parsec.lsr L15，独立规则显示「未提供策略绑定」，原文 GitHub 链接固定到已加载提交。
- 在线将 AI 绑定到「节点选择」，复制 Surge 配置后核对剪贴板；实际下载六端 ZIP，解包确认六个配置加说明，两个 YAML 均可解析，各自使用正确的原生 main 规则地址。
- 在线把生成的 Loon 配置放入模拟，自动选中新主配置。Parsec 规则确定采用 DIRECT，路径包含主配置 L20 与 Parsec.lsr L15；后续 FINAL 解释为已有更早匹配。浏览器错误日志为空。
- 已添加规则后再次检查目录，提示新增 / 修改 / 移除均为 0，已添加来源更新 0、失败 0；相同 blob 未重复下载。

![正式网站的动态规则库](images/live-library.jpg)

## 未验证的范围

没有运行六种代理软件的原生导入、VPN、节点连接或实际设备流量验收。Shadowrocket 为兼容格式，完整官方规范尚未取得。HTTP 节点只覆盖 TCP；没有填写节点的基础配置只含 DIRECT 组成员。非 Loon 的查询模拟仍未实现。自动目录的定时可用性依赖 GitHub Actions 与 GitHub Raw 服务，失败会在界面保留错误和旧快照。
