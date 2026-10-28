# 验收结果

时间：2026-10-28（Asia/Taipei）。环境：此台 macOS，Python 3.12.14，Node 24.22.1，PostgreSQL 17.11 与 pgvector 0.8.7。数据库为本项目单独编译、只监听 127.0.0.1:55439 的实例；自动测试使用独立 memoryhub_test 数据库。

## 需求逐条映射

| # | 验收要求 | 实际结果与边界 |
|---|---|---|
| 1 | A 提交、B 读同一有效记忆及来源 | **通过**：真实 HTTP A 提交候选，网页确认后官方 MCP SDK B 读取；独立凭证。不是两台物理设备测试。 |
| 2 | 新会话获取项目上下文 | **通过适配器级验证**：SDK 重新建立连接，通过 get_context 取得项目记忆；客户端规则与 start_session 示例已交付。第三方客户端启动钩子未实测。 |
| 3 | 网页修改后下一次返回新版本 | **通过**：浏览器将测试记忆修改至 v3；MCP 网络请求随即返回 v3、新正文和新来源。 |
| 4 | 旧资料不覆盖纠正/锁定事实 | **通过**：旧来源再次提炼返回 409，旧原文重传返回 410，Agent 更新确认/锁定记忆返回 403；重启不丢纠错后版本。 |
| 5 | 同旧版本并发更新检测冲突 | **通过**：两个并发提交恰有一个 200、一个 409。 |
| 6 | 重试不重复 | **通过**：同键同正文返回同一 ID；同键不同内容 409；不同键重复原文按 SHA-256 复用。 |
| 7 | 项目 A 无法获得 B | **通过**：列表、搜索、详情、来源、导出、上下文、跨项目引用与伪造 user_id 均验证。 |
| 8 | 彻底遗忘不再召回 | **通过**：正文/版本/索引/来源清除，原文与记忆召回均无结果；恢复遗忘前备份仍被当前删除日志清理。 |
| 9 | 上下文遵守预算并解释来源 | **通过**：0/20/100/400/1000/4000 的预算边界及模型余量限制；实际返回示例占 1518/4000（保守估算），带版本、来源与位置。 |
| 10 | 中文问题找到中文资料 | **通过**：“私人服务器”等中文检索命中中文记录；真实中文语义模型质量未实测。 |
| 11 | 重启后数据与配置保留 | **通过**：实际 PostgreSQL fast restart + API 进程重启，再以既有凭证读取 v3、项目及来源。 |
| 12 | 备份与恢复 | **通过**：HTTP 逻辑备份/恢复 + 遗忘标记回放；另将完整文件恢复到新建 memoryhub_restorecheck 数据库并验证记忆、来源、版本、设置、人格、索引和令牌撤销。 |
| 13 | 模型不可用仍可手动管理与搜索 | **通过**：连接不可用端口得到真实 503；手动修改、中文搜索正常，模型对话失败前已保存用户检查点。 |
| 14 | 提炼可追溯，推断不是确认事实 | **管道验证通过**：受控模型输出被验证 quote/字符位置/来源，引用资料强制 inferred，伪造引用整批失败且保留原文。没有真实生成模型，提炼质量未验收。 |

## 自动化结果

`backend/tests/test_acceptance.py` 的 20 组真实 PostgreSQL/pgvector 验收测试通过，覆盖上述条件以及向量数学检索、修改后旧向量失效、冲突审核、过期/回收站的原文旁路阻断、分类权限与来源敏感性继承、手动/自动策略、prompt injection 作为数据保存、恢复后凭证撤销和 JSON 去重。

- [JUnit 结果](../artifacts/acceptance-junit.xml)
- [真实 HTTP/MCP 网络结果](../artifacts/live-verification.json)
- [MCP 检查点、候选写入与重试结果](../artifacts/mcp-write-verification.json)
- [数据库和 API 重启结果](../artifacts/restart-verification.json)
- [独立数据库文件恢复结果](../artifacts/backup-verification.json)

向量成功路径使用受控三维向量测试 pgvector 查询与版本失效，没有把它作为真实语义模型效果的证据。自动提炼成功路径使用受控模型响应测试约束，同样没有声称真实 Ollama 成功。

## 浏览器实际操作

使用内置浏览器操作真实页面完成：管理员登录、创建“Memory Hub 本机验收”项目、录入记忆、打开来自客户端 A 的候选、确认、网页修改正文至 v3、查看来源与版本、中文上下文调试、切换深色主题。响应式测试视口设为 390×844，浏览器实际内容宽度 375，scrollWidth=clientWidth=375，无横向溢出；检查后已恢复默认视口。

- [网页 v3 记忆与来源](../artifacts/browser-memory-v3.png)
- [上下文调试与预算](../artifacts/browser-context.png)
- [手机深色视图](../artifacts/browser-mobile-dark.png)
- [总览](../artifacts/browser-overview.png)

## 构建和部署配置验证

- TypeScript 检查与 Vite 生产构建通过。
- Alembic 0001 已实际应用，真实 PostgreSQL 使用 vector 扩展。
- 官方 Compose 2.40.3：本地覆盖配置和 public profile 的 `config --quiet` 均通过。
- 官方 Caddy 2.10.2：Caddyfile adapt + validate 通过。
- Docker Hub 中四个基础镜像 tag 与 manifest digest 已核实并锁定。
- **通过** Docker image build / Compose 容器启动：本机没有 Docker daemon，因此在独立 ubuntu-24.04 的 [GitHub Actions](https://github.com/hhhoratioxu/Toolbox/actions/runs/40634037134) 实际构建并运行容器；其中 20 项数据库测试、HTTP 创建、容器重启持久化和 Caddy 配置验证均通过。
- 云端受测代码提交为 `2631363dac717c50097e35459a33a13318636339`；后续交付提交仅更新验证证据、文档与校验清单。
- [云端验证摘要](../artifacts/github-ci-verification.json) / [首次公开提交全部 87 个文件的匿名 Raw 字节核验](../artifacts/publication-verification.json)。
- **未执行** 公网 DNS、ACME 证书、真实服务器 HTTPS 或远程物理电脑验证：未提供域名与服务器连接。

## 复现与追加验证

按 README 启动后，用独立测试数据库执行 pytest。真实网络脚本 `scripts/live_acceptance.py` 用于本机验收夹具：prepare 提交明确标为验收的候选，网页确认并修改正文为包含“已通过网页纠正”的文本，再运行 verify。凭证只保存在 `.local/live-clients.json`，不会包含在源码包。

若要验证真实模型，在设置中配置已经运行的 Ollama，测试连接，导入带 speaker 和逐字依据的资料，观察提炼任务、候选及审核过程；再启用 Embedding，观察向量计数增加并评估语义相关性。若要验证另一商业 Agent，按其官方配置接入 PAT Streamable HTTP，安装启动/检查点规则，检查服务器 trace 与真实客户端提示词，不能只凭工具发现就判为完全兼容。
