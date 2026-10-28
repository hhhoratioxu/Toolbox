# 验证记录与复现

验证日期：2026-10-28（Asia/Taipei）。本记录区分自动测试、实际浏览器操作、部署和真实客户端行为。

## 自动测试与生产构建

本地运行 `pnpm test`：**5 个测试文件、91 项测试通过**。`pnpm build:pages` 执行 TypeScript 检查并构建 GitHub Pages 子路径资源。测试使用真实解析器和匹配引擎；远程加载错误使用可控 Response / AbortSignal 测试。

| 用户验收项 | 覆盖证据 |
| --- | --- |
| 1. 域名后缀自身、子域名与相似域名边界 | engine.test.ts：example.com、a.example.com、notexample.com、example.com.evil.test。 |
| 2. 多规则优先级 | engine.test.ts：域名阶段、来源 local / plugin / subscription、同来源配置位置；更早后缀先于后面精确域名。 |
| 3. 注释与空行的真实行号 | parser.test.ts：CRLF 与原文保留；引擎测试验证主配置引用行和子文件条目行。 |
| 4. IPv4 / IPv6 CIDR 边界 | input.test.ts：网络首尾、越界、/0、/32、/128、跨地址族；拒绝非法地址。 |
| 5. 引用追溯与策略 | engine.test.ts：主配置 L4 → 子文件 L3；同 URL 的多个引用保留不同策略和位置。 |
| 6. 更早未知不得跳过至确定 FINAL | engine.test.ts：缺 DNS、GEOIP 库、逻辑表达式和未知引用参数，FINAL 仅候选。 |
| 7. 依赖失败显示不完整 | engine.test.ts：失败或缺失依赖；配置结果 incomplete；失败文件没有虚构行号。 |
| 8. 独立列表不编造绑定 | engine.test.ts：policy / effectiveId 保持未提供；无主配置时不能模拟。 |
| 9. 策略组不编造节点 | engine.test.ts：只输出组名与静态成员，明确缺运行状态。 |
| 10. 生效规则与后续匹配解释 | engine.test.ts：首条生效、后续 shadowed，FINAL 最后；UI 展示原因。 |

其他测试包括 IDN、URL 路径 / 端口、方括号 IPv6、多 DNS 地址结论不一致、DNS 集合完整性、Loon no-resolve、传输协议未知、循环引用、YAML 未支持、引号 / 逻辑表达式不被逗号错误拆分、CSV 公式保护、HTTP / 大小 / 格式 / 取消 / 15 秒超时。

`performance.test.ts` 实际生成并解析 **100,000 条域名规则**，通过索引找到最后一条，验证原始 L100002、其余 99,999 条排除。它是规模和正确性回归，不将单机测试耗时宣传为所有设备的性能保证。

## 实际浏览器操作

通过 Codex 内置浏览器实际打开本地开发服务，逐步点击和查看结果，完成以下检查：

- 粘贴带原始注释、空行和 IPv4 / IPv6 的独立规则文件；结果定位到 L3、L4，策略显示未提供绑定。
- 输入 `https://API.EXAMPLE.COM./path?foo=bar` 并按 Enter，规范化到 api.example.com，提取 443 端口而不假定 TCP。
- 批量查询 api.example.com / notexample.com / 203.0.113.8 / 2001:db8::1，匹配数分别为 2 / 0 / 1 / 1。
- 实际下载 JSON 和 CSV，并读取下载文件确认四项结果、原始行号、无匹配记录与策略字段。
- 点击规则行打开原文，检查高亮、上下文、主配置 → 订阅条目的来源链；复制规则和摘要，并读取剪贴板确认摘要内容。
- 原文搜索能找到只出现在注释中的文字，界面明确提示文本命中不等于规则匹配。
- 通过真实文件选择器一次上传 acceptance.conf 和 ipv6.list，确认多文件导入与配置引用识别。
- 启动本地可控 HTTP 资源服务，实际成功下载 `/rules.list`；加载 `/missing.list` 得到 HTTP 404，配置显示部分结果，FINAL 为候选，缺 DNS / 依赖原因可见。
- 通过失败来源的替代入口粘贴内容并绑定原 URL，结果立即关联到引用策略与正确行号。
- 停用来源、补充完整目标 IP / TCP 条件，结果自动更新并标记条件已调整。
- 实际执行来源重新解析、移除来源、恢复示例、清空输入、非法 IP 错误显示和浅 / 深色切换。
- 刷新页面后切换「我的规则」，之前导入的五个来源与启停状态仍在；示例工作区保持独立。
- 桌面视口 1440×1000、手机视口 390×844。手机实际完成 IPv6 查询和原文定位。已修复隐藏辅助标签引发的整页横向溢出，重新读取布局：页面宽度 375，视口宽度 390；仅表格与长代码局部横向滚动。
- 最后一轮浏览器错误日志为空；预期的 HTTP 404 负例通过来源错误状态单独验证。

这些是浏览器视口测试，不能等同于物理手机或 Loon 客户端验收。远程 CORS / 证书 / 中断网络的不可区分情况以错误处理测试覆盖；不把可控资源服务测试说成任意第三方订阅均可访问。

截图：

- [桌面浅色](images/desktop-light.jpg)
- [桌面深色](images/desktop-dark.jpg)
- [手机布局](images/mobile.jpg)
- [手机原文定位](images/mobile-viewer.jpg)
- [引用与原文行号](images/source-viewer.jpg)
- [失败依赖与候选 FINAL](images/incomplete-simulation.jpg)

## 复现远程错误场景

在本地项目启动开发服务后，另开终端执行：

```bash
node scripts/qa-server.mjs
```

导入 `tests/fixtures/acceptance.conf`，点击加载引用，查询任意域名。模拟不能跨过缺少 DNS 的 IP 规则和 404 依赖宣布 FINAL 确定生效。远程 URL `http://127.0.0.1:5180/rules.list` 提供成功响应；`/slow.list` 可用于手动检查超时或来源菜单中的取消加载。

## GitHub Pages 与客户端边界

仓库根目录 `.github/workflows/pages.yml` 包含锁定依赖安装、91 项测试、TypeScript 与生产构建、与既有站点共同发布。实际运行状态以 [Pages workflow](https://github.com/hhhoratioxu/Toolbox/actions/workflows/pages.yml) 为准；在线入口为 [Rule Finder](https://hhhoratioxu.github.io/Toolbox/RuleFinder/)。发布后还需核对网页与 Worker 能否实际运行，不将上传源码或构建产物本身当作部署成功。

没有执行真实 Loon / Surge / Mihomo 客户端、物理手机、网络连接、自动选择节点或真实 DNS 解析验收。本项目只声称上述本地静态解析与浏览器操作的验证范围。
