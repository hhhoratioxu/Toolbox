# 初始化、升级与公网部署

## 生产前提

Linux 私人服务器、Docker Engine、Compose v2.40+；真实域名 A/AAAA 指向该服务器；80/443 对公网可达。内存与磁盘由语料规模决定，模型服务单独评估资源。本版不提供 SaaS、多用户组织、离线完整副本或未接入客户端历史抓取。

1. 解压源代码，复制 `.env.example` 为 `.env`，权限设为 0600。
2. 生成长随机 URL-safe POSTGRES_PASSWORD（建议 32 随机字节）；不要复用管理员密码。若使用任意符号密码，应为 DATABASE_URL URL 编码，默认示例使用 URL-safe 字符避免这一问题。
3. 设置 PUBLIC_URL、MEMORY_DOMAIN、ACME_EMAIL。生产 COOKIE_SECURE=true。
4. `docker compose --profile public up -d --build`。
5. `docker compose exec api python -m app.cli init --username admin`，在交互提示中输入密码。
6. 打开 HTTPS 域名登录，创建项目及最小作用域的 Agent 凭证。
7. 在公网实际验证 TLS、未登录 401、令牌撤销、上传和上下文返回后再放入日常工作。

Compose 本身只公开 Caddy 的 80/443。数据库处于 internal 网络，API 与 worker 通过内部地址连接；API 另有 egress 网络用于连接用户明确配置的模型服务，未发布 API 宿主端口。不要给数据库或 Ollama 增加公网端口。公网请求走同源、HTTPS、HttpOnly/SameSite Cookie 或 Bearer，Origin 与 Host 检查同时覆盖 MCP。

已有宿主反向代理可把 API 绑定到 loopback 后代理；务必使用生产 PUBLIC_URL、Secure Cookie、正确 Host、流式代理支持与 8 MB 请求上限。不要把本地开发覆盖配置原样当生产配置。

## 模型连接

界面支持 Ollama 兼容 `/api/chat` 和 `/api/embed`，分别设置生成与 Embedding 模型。容器中的 localhost 是容器自己；模型若在其他容器，加入专用 Docker 网络并用内部服务名；若在宿主机或另一台服务器，使用受防火墙保护的可达私网地址。模型名称需要已经存在于服务中，本项目不自动下载模型。

配置为空或模型服务不可用不会阻碍手动管理与关键词搜索。测试按钮发一个不含记忆的固定连接请求。真实记忆只在有相应许可时发送给 external=true 的模型。修改模型地址或名称会立即清除旧向量并安排重建，避免同名但不同模型污染检索。

本版没有 OpenAI/其他云端私有 API 的密钥管理与专用适配器；抽象接口位于 `backend/app/model_gateway.py`。若未来扩展，凭证应只在服务端环境或密钥服务管理，不能加入网页返回的设置 JSON。

## 升级

1. 备份逻辑数据，并另存当前 `deletion-ledger.jsonl`。检查可恢复性。
2. 保留 `.env` 和命名卷，不执行 `docker compose down -v`。
3. `docker compose stop api worker caddy`，替换代码或镜像。
4. `docker compose build`。
5. `docker compose run --rm migrate`。
6. `docker compose --profile public up -d`，检查 healthz 和登录、来源、MCP。

迁移是显式版本管理，不破坏性降级。失败时保留卷并检查日志；需要恢复时先停止 API/worker，按 DATA 文档恢复并重放删除标记。升级前应在独立测试数据库运行验收测试。

## 备份与运行维护

数据库和原文目录均使用命名卷，容器重启不丢数据。`data/deletion-ledger.jsonl` 是禁止旧内容恢复的独立日志，应与备份分开保护并长期保留。所有 API 访问日志默认关闭以减少泄密，审计事件不记录完整密钥和模型正文。

worker 每 60 秒检查保留策略；新来源按导入时策略赋到期时间；已存在来源不会因修改天数被立即删除。`/data/backups/*.json` 按配置天数清理；本版不自动创建定时备份，需管理员调度 CLI 备份命令。下载到其他电脑的文件不受服务器保留策略控制。

锁定镜像 tag+digest 限制意外升级，同时意味着安全补丁需要主动复核并更新锁文件/镜像摘要。当前版本没有企业级多租户隔离、管理员 MFA、WAF、自动高可用或异地容灾编排。建议个人服务再叠加 VPN/入口访问限制以及服务器磁盘加密。

## 本机无 Docker 的开发

配置 `.env.local`：

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@127.0.0.1:5432/memoryhub
DATA_DIR=/absolute/path/MemoryHub/data
PUBLIC_URL=http://127.0.0.1:8765
COOKIE_SECURE=false
FRONTEND_DIR=/absolute/path/MemoryHub/frontend/dist
```

在有 pgvector 扩展的 PostgreSQL 创建空数据库，按 README 安装依赖、构建前端、执行迁移、CLI 初始化。`scripts/dev-start.sh` 后台启动 API 和 worker；`scripts/dev-stop.sh` 停止本项目服务。交付这台 Mac 额外编译的 PostgreSQL 仅放在 `.local`，不包含在跨平台源代码包里。
