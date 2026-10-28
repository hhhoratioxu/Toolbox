# HTTP API 与远程 MCP

HTTP 根地址：`https://memory.example.com/api`。交互文档 `/docs`，机器可读定义 `/openapi.json`。交付的 `docs/openapi.json` 为本版本生成的快照。MCP：`https://memory.example.com/mcp/`，官方 SDK 2.3.0，Streamable HTTP，无状态传输，每个请求重新验证 PAT。

## 身份、权限与错误

网页通过 `POST /login` 登录，得到 HttpOnly、SameSite=Strict Cookie；生产 Secure=true。携带 Cookie 的写操作必须是 PUBLIC_URL 同源 Origin。客户端使用 `Authorization: Bearer <独立 Agent PAT>`；不要把令牌放进查询参数。服务器只保存令牌哈希，撤销即时影响后续请求。

`read`、`propose`、`update`、`export` 是独立能力。每个 Agent 另受项目集合、全局访问、分类集合、敏感上限、人格访问及外部许可限制。建议需要 propose/update 的 Agent 同时授予 read。`update` 不允许覆盖用户填写/确认或锁定事实。

所有客户端输入均不含 user_id。对不存在和不可访问对象统一 404；401 凭证无效，403 权限/来源范围不足，409 版本/幂等/来源冲突，410 内容已彻底删除或禁止恢复，422 参数/引用校验失败，429 登录节流，503 模型未配置/不可用。错误 JSON 为 `{"detail":"中文说明"}` 或 `{"detail":{"message":"...","current_version":2}}`。

有新建或有版本写入的操作要求 `Idempotency-Key`，逻辑请求重试应复用同一键；修改负载需换键。同主体同操作同键但不同内容返回 409。成功重试返回当前可见版本，而不是缓存旧正文。设置 PUT、凭证撤销等操作自身幂等；凭证签发只返回一次原始密钥，网络结果不明时先检查凭证列表，撤销未知项后重新签发。

## 客户端核心接口

| HTTP | 功能 | 输入/输出 |
|---|---|---|
| GET `/me` | 验证身份与当前权限 | actor、permissions、external、service_label |
| GET `/projects?limit=50&offset=0` | 授权项目 | items、分页参数 |
| GET `/memories` | 记忆列表 | query/category/project_id/status/tag/source_id/sensitivity/since/until；limit ≤100、offset |
| GET `/memories/{id}` | 当前版本与来源 | memory 字段、source 元数据；ETag 为当前版本；历史仅管理员可见 |
| GET `/search?query=...` | 中文关键词 + 可选向量检索 | items、score、reason、excluded、retrieval、total；limit ≤100 |
| POST `/context` | 返回预算内上下文 | ContextInput，见下 |
| POST `/context/{trace_id}/ack` | 客户端回执 | 仅同一调用主体可确认已返回请求 |
| POST `/sources` | 原文或逐轮事件入库 | SourceInput；返回 source 元数据、duplicate |
| GET `/sources/{id}?start=0&length=1500` | 授权原文片段 | content、start/end、total_characters；length ≤20000 |
| POST `/proposals` | 候选记忆 | MemoryInput；返回 memory、duplicate |
| POST `/memories` | 用户直接创建，Agent 仍创建候选 | MemoryInput；返回 memory、duplicate |
| PUT `/memories/{id}` | 乐观并发修改 | 完整 MemoryInput + expected_version + reason |
| GET `/export?limit=100&offset=0` | 授权记忆导出 | items、next_offset；Agent 不获得历史版本 |

### SourceInput

```json
{
  "title": "项目讨论第 3 轮",
  "content": "我们决定继续使用 PostgreSQL，并在上线前检查权限。",
  "kind": "conversation",
  "speaker": "user",
  "project_id": "服务器返回的项目 UUID",
  "category": "project",
  "sensitivity": 1,
  "external_allowed": false,
  "extract": true
}
```

kind 为 note/txt/markdown/json/conversation/event/correction。speaker 为 user/assistant/quoted/unknown；混合聊天请逐条按发言者拆分。对无法确定的来源保留 unknown。原文正文最大 2,000,000 字符，HTTP 请求体最多 8 MB。

### MemoryInput

```json
{
  "title": "数据库选型",
  "body": "本项目采用 PostgreSQL。",
  "summary": "项目数据库已确定",
  "category": "project",
  "project_id": "项目 UUID",
  "tags": ["架构", "数据库"],
  "applicability": "本项目后端",
  "source_id": "来源 UUID",
  "quote": "我们决定继续使用 PostgreSQL",
  "provenance": "extracted",
  "importance": 4,
  "sensitivity": 1,
  "external_allowed": false,
  "pinned": false,
  "locked": false,
  "fact_at": null,
  "valid_from": null,
  "valid_until": null
}
```

quote 必须是来源中的连续逐字文本。项目与分类必须继承来源，敏感级别不能降低，来源未允许外部发送时不能扩大许可。无 source_id 的用户填写或 Agent 建议会先创建独立 note 来源；Agent 缺少确定原文身份时仍为 inferred 候选。

返回记忆还包括 id、owner_id、status、version、quote_start/quote_end、evidence_source_ids、created_by/updated_by、created_at/updated_at 等字段。category 为 profile/fact/project/event/knowledge/session；AI 人格单独管理。

### ContextInput 与输出

```json
{
  "query": "这个项目下一步做什么？",
  "project_id": "项目 UUID",
  "persona_id": null,
  "budget": 4000,
  "model_limit": 16000,
  "conversation_tokens": 3000,
  "answer_reserve": 2000
}
```

输出结构：

```json
{
  "context": "实际准备返回的参考文本",
  "trace_id": "请求 UUID",
  "status": "returned",
  "found": true,
  "message": "已找到可用依据",
  "selected": [{"type":"memory","id":"记忆 UUID","version":3,"source_id":"来源 UUID","quote_start":0,"quote_end":55,"reason":"项目背景与进度","tokens_estimated":496,"truncated":false}],
  "excluded": [{"id":"其他授权记忆 UUID","version":1,"reason":"超出预算"}],
  "budget": {"limit":4000,"used":1518,"estimated":true,"method":"UTF-8 字节数保守估算；不含 API 元数据和客户端包装","truncated":false},
  "retrieval": "未配置语义模型；使用中文关键词检索",
  "destination": "授权的 Agent 服务名称",
  "external": false
}
```

没有依据时 found=false；人格的存在本身不算找到事实依据。实际预算可以为 0。selected/excluded 不包含超出权限的记忆 ID。人格文本优先，置顶也不能突破权限、有效期或预算。`agent_id` 仅用于管理员预览，Agent 无权冒充其他 Agent。

## 管理接口

- `/projects` POST、`/projects/{id}` PUT/DELETE：有来源的项目不能直接删除，允许归档。
- `/personas` GET/POST、`/personas/{id}` PUT：config、enabled、is_default、external_allowed、expected_version。
- `/memories/{id}/action`：accept/reject/archive/trash/restore/pin/unpin/lock/unlock + expected_version。
- `/memories/{id}/restore-version`：revision + expected_version，新建恢复版本。
- `/memories/{id}/forget-preview` → `/forget`：expected_version、mode=delete/redact、confirm_memory_ids。
- `/relations` 与 `/relations/resolve`：并排冲突，winner/other 版本检查，correction/change/merge；change 必须提供 effective_at。
- `/sources/{id}/extract`：重新排队；停止提炼来源返回 409。
- `/jobs`、`/jobs/{id}/retry`：持久任务状态与重试。
- `/agents` GET/POST、`/agents/{id}/revoke`：只返回一次原始 PAT；后续列表仅前缀。
- `/overview`、`/traces`：统计与最近上下文追踪。
- `/settings`、`/settings/policy`、`/settings/model`、`/settings/model/test`：配置与连通测试。
- `/context/preview`：管理员调试，状态仅 retrieved。
- `/chat`：本地模型测试，先保存用户检查点；外部服务需显式 allow_external。
- `/backup`、`/restore`：完整逻辑备份与恢复，管理员专用。

## MCP 工具映射

| 工具 | 参数 |
|---|---|
| get_context | `request: ContextInput` |
| search_memories | query、project_id、limit、offset |
| get_memory | memory_id |
| list_projects | limit、offset |
| get_project_context | project_id、query、budget |
| propose_memory | `memory: MemoryInput`、idempotency_key |
| ingest_event | `event: SourceInput`、idempotency_key |
| update_memory | memory_id、`memory: MemoryEdit`、idempotency_key |
| get_source_fragment | source_id、start、length（最多 5000） |
| acknowledge_context | trace_id |

所有工具启用结构化输出并由官方 SDK 生成输入/输出 schema。初始化、工具列表和调用都需要 Bearer；不会因为 MCP 工具调用就跳过后端权限。当前是 PAT 自定义请求头接入，不冒充 OAuth。只有支持该方式的客户端可直接连接；需要 OAuth 的客户端在本版明确不支持。
