# Agent 接入

服务端是权威来源，客户端不缓存整套离线记忆。更换设备不会影响服务端保存的数据，但新客户端必须重新完成凭证配置和触发规则设置。

## 已实测的两种接入

1. `examples/http_agent.py`：独立的 HTTP Python 适配器，使用 httpx。可在新会话读取、逐轮上传授权检查点、提交候选和分页导出。
2. `examples/mcp_agent.py`：官方 MCP Python SDK 2.3.0，远程 Streamable HTTP，使用独立 Bearer 凭证。

本次实际网络验收由 HTTP A 提交候选，网页确认/纠正，MCP B 读取同一有效版本和来源；API/数据库重启后再次读取成功。它证明两种接入程序和服务器的互通，不代表任意商业 Agent 已通过兼容测试。

## 配置

在网页“Agent 接入”创建凭证。测试私有服务可设置 external=false；会把数据送入云端模型的 Agent 必须设 external=true，再逐条决定记忆和人格是否允许对外发送。每台电脑/每个 Agent 使用单独令牌。

在客户端进程环境中配置 `MEMORY_HUB_URL` 与 `MEMORY_HUB_TOKEN`。使用密码管理器、操作系统密钥服务或只对当前账户可读的客户端密钥文件注入，不要写进 Git、Shell 历史或 URL。

```sh
export MEMORY_HUB_URL=https://memory.example.com
# 通过安全方式向此进程注入 MEMORY_HUB_TOKEN 后：
python examples/http_agent.py context --project PROJECT_UUID --query '继续这个项目'
python examples/http_agent.py checkpoint --project PROJECT_UUID --text '用户授权保存的本轮内容' --event-id SESSION_ID:TURN_ID
python examples/http_agent.py propose --project PROJECT_UUID --title '新的项目决定' --text '有依据的新决定' --event-id DECISION_UUID
python examples/mcp_agent.py --project PROJECT_UUID --query '当前项目进度'
```

这些示例依赖项目的 Python 虚拟环境；在仓库根目录可用 `.venv/bin/python`。外部 Agent 上传的数据需设置 external_allowed=true（仍受服务器作用域约束）；通用 HTTP 示例默认为私有 Agent，调整集成代码时不要隐式扩大权限。

新会话、主题变化和逐轮检查点的触发规则在 `examples/agent-rules.md`。没有启动钩子或 MCP 能力的封闭客户端，本系统无法自动读取其历史、自动加载记忆或自动保存会话；只能主动导入资料，或手动复制构建好的上下文。

## 自动化程度与兼容性

| 类型 | 当前支持 | 实测边界 |
|---|---|---|
| HTTP Python 适配器 | 完整基础闭环 | 本机真实网络请求已验证 |
| 官方 MCP SDK 2.3.0 | Streamable HTTP + 独立 PAT | 工具发现、项目上下文、详情、回执、检查点和候选写入已验证 |
| 第三方可设置 Authorization 请求头的 MCP 客户端 | 传输与工具可用，需各自配置 | 未实际运行该第三方客户端 |
| 只支持 OAuth 的云端连接器 | 不支持直接接入 | 没有实现授权服务器 / OAuth discovery |
| 无 MCP/HTTP/启动钩子的封闭客户端 | 手动导入 / 手动读上下文 | 不宣称自动触发 |

后续 OAuth 应接成熟授权服务，按 MCP 规范提供受保护资源元数据、PKCE、resource/audience 校验与授权范围映射，不应把 PAT 冒充 OAuth access token。

工具成功只表示服务器对应操作成功。上下文 returned 不能标成“模型已经使用”；acknowledged 必须由确实完成上下文插入的客户端主动发送。任何失败都必须明确告知用户，不得谎称成功记住。
