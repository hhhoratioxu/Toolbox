# Memory Hub

可私人部署的 AI 长期记忆中心。React + TypeScript + Tailwind，FastAPI，PostgreSQL + pgvector，官方 MCP Python SDK 的远程 Streamable HTTP。默认简体中文，支持手机浏览器、深浅色主题、多项目和独立 Agent 凭证。

这是可运行的单用户 v0.1：具备手动管理、导入、来源与历史、候选审核、纠错、关键词检索、上下文预算、HTTP/MCP、可配置提炼和向量、删除及备份恢复。不是所有第三方 Agent 的自动插件，也不保证不同模型人格表现一致。

## Docker Compose：新服务器 / 新电脑

准备 Docker Engine 和 Compose v2.40+。镜像版本和多架构 digest 已锁定。没有自动导入个人数据，也没有默认管理员密码。

```sh
cp .env.example .env
# 编辑 .env：先设置随机、URL-safe 的 POSTGRES_PASSWORD
# 本地启动（API 只绑定 127.0.0.1:8765）
docker compose -f compose.yml -f compose.local.yml up -d --build
# 使用交互密码输入初始化管理员，至少 12 字符
docker compose exec api python -m app.cli init --username admin
```

数据库迁移由一次性 migrate 服务完成，API/worker 等其成功后启动。首次构建会下载锁定依赖，已有数据不会被初始化命令覆盖。未配置模型时仍可录入/导入/搜索。

公网部署：配置 `.env` 的 `PUBLIC_URL=https://你的域名`、`MEMORY_DOMAIN=你的域名`、`ACME_EMAIL`，保持 `COOKIE_SECURE=true`；将域名 DNS 指向服务器并放行 80/443，然后：

```sh
docker compose --profile public up -d --build
docker compose exec api python -m app.cli init --username admin
```

不要混入 `compose.local.yml`；数据库、API、worker 不发布公网端口，Caddy 自动申请 TLS 证书。已有反向代理可仅代理内部 API，需保留真实 Host、HTTPS 和同源访问。详见 [部署与升级](docs/DEPLOYMENT.md)。

## 第一次使用

1. 登录后创建项目。项目简短介绍对该项目授权的 Agent 可见；敏感背景放入可设置敏感级别的项目记忆。
2. 新增记忆，或导入 TXT / Markdown / JSON。原始记录可直接建立结构化记忆；无需模型。
3. 在“我的资料与 AI 人格”维护两类独立信息，预览将发送给 Agent 的行为文本。
4. 在“Agent 接入”为每个设备创建独立令牌，选择项目、分类、能力和敏感级别。外部 Agent 还需要每条记忆显式允许对外发送。
5. 使用 HTTP 或 MCP 示例读取上下文；Agent 提交候选后在网页查看原文、编辑并确认。
6. 在检索调试台查看采用/排除原因、预算以及返回与回执的区别。

## 目录与文档

```text
backend/app/               API、权限、模型、记忆、检索、生命周期、worker、官方 MCP
backend/migrations/        Alembic 修订和冻结的 PostgreSQL DDL
backend/tests/             使用真实 PostgreSQL/pgvector 的验收测试
frontend/src/              React 中文界面与响应式样式
examples/                  HTTP / MCP 适配器、客户端规则、连接示意
deploy/Caddyfile           HTTPS 反向代理
compose.yml                私人服务器部署
compose.local.yml          仅 loopback 本地覆盖
scripts/                   启动、停止、真实网络验收、源代码打包
artifacts/                 验收结果与真实浏览器截图，不含凭证
```

- [架构、数据流与安全边界](docs/ARCHITECTURE.md)
- [HTTP API 与 MCP](docs/API.md) / [OpenAPI JSON](docs/openapi.json)
- [Agent 接入与触发规则](docs/AGENTS.md)
- [部署、初始化与升级](docs/DEPLOYMENT.md)
- [数据导入导出、备份恢复与遗忘](docs/DATA.md)
- [逐条验收结果](docs/VERIFICATION.md)
- [已实现、未实现和已知限制](docs/STATUS.md)
- [依赖版本与官方依据](docs/DEPENDENCIES.md)

## 已准备好的本机环境

仅当本机已经有 `.env.local`、`.venv`、前端构建与数据库时，可在项目目录运行 `./scripts/dev-start.sh`。请保持终端运行；Ctrl+C 停止 API 和任务进程，另一个终端执行 `./scripts/dev-stop.sh` 可同时停止本项目的 PostgreSQL。新下载源码请先完成上面的 Docker 部署或下方开发安装。

本次交付所在电脑的随机管理员密码位于 `.local/admin-password`（0600），账号为 `admin`。这些本机运行文件不包含在仓库或源码包中。本机验收数据库仅监听 loopback，使用 trust 进行隔离测试，不能用作公网配置。标为“验收数据”的记录为测试专门创建，不是个人历史。

## 开发与复验

Python 3.12；Node 24；pnpm 11.25.0；PostgreSQL 17 和 pgvector 0.8.7。依赖分别锁定在 `backend/requirements.lock` 与 `frontend/pnpm-lock.yaml`。

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ../backend
# DATABASE_URL 指向已安装 pgvector 的数据库，其他变量见部署文档
../.venv/bin/alembic upgrade head
../.venv/bin/python -m app.cli init
../.venv/bin/uvicorn app.api:app --host 127.0.0.1 --port 8765 --no-access-log
# 另一个终端、同一环境中运行：python -m app.worker
```

前端开发时执行 `pnpm dev`。默认后端严格校验同源；建议先用生产前端构建进行验收。若使用 Vite 的 5173 端口，将后端 PUBLIC_URL 设置为 `http://127.0.0.1:5173` 并关闭开发环境 secure cookie。

测试会清空**专用测试数据库**，不得指向生产：

```sh
cd backend
TEST_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/memoryhub_test \
  ../.venv/bin/python -m pytest -q --junitxml=../artifacts/acceptance-junit.xml
```

实际测试边界请阅读验证报告。本机没有 Docker daemon；[GitHub Actions](https://github.com/hhhoratioxu/Toolbox/actions/runs/40634037134) 已在独立 Linux 环境完成镜像构建、Compose 启动、20 项 PostgreSQL/pgvector 测试、容器重启持久化和 Caddy 配置验证。公网 TLS 签发、真实 Ollama 成功响应和模型质量尚未验证；受控响应只用于验证提炼管道和向量失效逻辑。
