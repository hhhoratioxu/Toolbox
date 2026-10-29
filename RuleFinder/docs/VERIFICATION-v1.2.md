# v1.2 · 按软件一键写规则

日期：2026-10-29，Asia/Taipei。

## 实现与范围

- 新增「按软件写规则」入口，选择六端输出格式、明确策略和现有策略组 / 节点名，输入软件名后生成、复制、下载原生分流片段。
- 常见中文 / 英文别名指向实时目录中的真实分类。共享分类说明整类覆盖；模糊多结果需要选择；专用新分类优先于旧的宽泛别名，删除的分类不再出现。抖音不等同于 TikTok。
- 无匹配时提供手动域名生成；仅使用用户提供的域名，不猜测软件域名、不调用 AI 或上传搜索词。支持 URL hostname、IDN、完整域名与后缀两种模式。
- 片段不添加 FINAL / MATCH、节点或策略组定义。按客户端分别生成引用 / 本地规则，给出合并说明。修改输入、格式、策略、分类或目录版本后隐藏旧预览。

## 自动验证

- `pnpm test`：8 个文件、187 项测试通过。保留原有 132 项，新增 55 项。
- `pnpm build:pages`：TypeScript 与 Vite 生产构建通过。
- 新增测试覆盖：16 组名称 / 别名、共享分类、未知软件、单字母 X、多个候选、新增专用分类、删除分类、六种原生引用、Loon 重新解析、Mihomo provider 键、QX 策略、六端手动域名、Egern 完整 / 后缀对象、IDN、错误输入和策略注入。

## 实际浏览器检查

在本地真实浏览器中执行：

1. 从原有定位视图进入新功能，打开时读取在线目录 `82b0fd4`。
2. 搜索 ChatGPT，明确选中 AI 分类并提示与其他 AI 软件共用；填写「我的代理」，按 Enter 生成 Loon 片段。
3. 点击复制，核对剪贴板中的原生 URL 与策略。实际下载 Loon `.conf` 和 Mihomo `.yaml`，读取下载文件验证内容，YAML 解析成功，片段没有 FINAL。
4. 切换客户端后旧预览隐藏，重新生成 Mihomo 原生 provider 与规则，显示正确来源路径。
5. 输入 `Par`，得到 Parsec / ParsecP2P 两个候选，未选择时不能生成；选中 Parsec 后可以生成。
6. 输入 `抖音`，显示未找到，未套用 TikTok。点击域名替代入口；IP 被拒绝，手动提供 IDN URL 可生成 Egern 精确域名规则，路径 / 查询参数不写入规则。
7. 390 × 844 手机视口生成小红书 Loon 分流片段，输入 / 选择 / 生成操作正常，文档宽度等于视口宽度，无水平溢出。修复并复查了规则候选卡片受全局 input 样式影响的宽度问题。
8. 返回域名 / IP 定位，原有示例仍显示 DIRECT；重新进入软件编写正常。浏览器错误日志为空。

## 格式依据与验收边界

引用与域名语法核对了 [Loon 订阅](https://nsloon.app/docs/Rule/sub_rule/) / [域名](https://nsloon.app/docs/Rule/domain_rule/)、[Surge RULE-SET](https://manual.nssurge.com/rules/ruleset.html)、[Mihomo 规则](https://wiki.metacubex.one/en/config/rules/) / [providers](https://wiki.metacubex.one/en/config/rule-providers/)、[Egern 规则](https://egernapp.com/docs/configuration/rules/)和 [Quantumult X 开发者示例](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)。软件名映射中的共享范围另核对 Proxy 当前提交的 AI、Google、Microsoft、Meta 原文。

仍未做六种代理软件的原生导入、节点连接、VPN 或设备流量验收；Shadowrocket 为兼容格式。没有扩展非 Loon 的匹配模拟。共享分类与用户提供的单个域名都不能证明软件完整流量覆盖。没有自动把片段写入手机或电脑的代理客户端。
