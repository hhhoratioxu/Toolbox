# 已完成的线上发布验证

验证日期：2026-10-28（Asia/Taipei）。

- **在线地址：[分流规则定位器 · Rule Finder](https://hhhoratioxu.github.io/Toolbox/RuleFinder/)**
- 应用代码提交：[8e75e1a](https://github.com/hhhoratioxu/Toolbox/commit/8e75e1a9171bb1cb741d7cf74ce52a2029a0eb5d)
- GitHub Pages 工作流：[40711602625 · success](https://github.com/hhhoratioxu/Toolbox/actions/runs/40711602625)
- 构建任务和部署任务均已完成。Rule Finder 的依赖安装、测试、TypeScript / Pages 构建步骤成功；共同发布的现有网站构建也成功。

## 线上实际操作

直接在浏览器打开上述 HTTPS 地址，确认页面与生产版 Web Worker 正常启动。线上脚本为 `assets/index-Dqo60Ezf.js`，与本次 Pages 构建资源一致。

实际导入了以下 commit 固定的 GitHub Raw 规则文件，跨域读取成功：

[services.list 原始文本](https://raw.githubusercontent.com/hhhoratioxu/Toolbox/8e75e1a9171bb1cb741d7cf74ce52a2029a0eb5d/RuleFinder/public/examples/services.list)

线上查询 `api.example.com` 得到两条匹配，策略保持「未提供策略绑定」。点击 DOMAIN-SUFFIX 结果后，原文高亮 L3，GitHub 定位链接为：

[固定版本 services.list 第 3 行](https://github.com/hhhoratioxu/Toolbox/blob/8e75e1a9171bb1cb741d7cf74ce52a2029a0eb5d/RuleFinder/public/examples/services.list#L3)

随后恢复独立的内置示例，查询 `a.example.com`，得到「海外服务」策略组，完整路径为 `示例主配置.conf:L20 → 服务规则.list:L3`；展开后明确显示 select 静态成员、缺少运行状态、最终节点未知。线上浏览器错误日志为空。本次在用户工作区添加的测试来源已移除，内置示例保留供直接体验。

## 发布内容核对

发布基于实时读取的主分支，使用 expected-SHA 检查更新引用。只加入 RuleFinder 与 Pages 配套入口，没有打包其他项目的本地未提交内容。

本地生成的 Git tree 与 GitHub 存储的 tree SHA 完全一致。以下文件还通过 commit 固定 Raw 地址逐字节核对 UTF-8 内容：

- `RuleFinder/package.json`
- `RuleFinder/src/core/engine.ts`
- `RuleFinder/public/examples/services.list`
- `.github/workflows/pages.yml`

本记录补充发布后的浏览器检查。详细本地测试与可复现步骤见 [VERIFICATION.md](VERIFICATION.md)，支持范围与未覆盖的真实客户端行为见 [README](../README.md)。这些结果没有被扩大为真实 Loon 设备、节点选择或实际网络流量通过。
