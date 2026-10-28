# 锁定版本与官方依据

核查日期：2026-10-28（Asia/Taipei）。没有使用浮动 `latest`。Python 全部解析后的依赖保存在 requirements.lock；前端全部传递依赖与 integrity 保存于 pnpm-lock.yaml；生产镜像使用版本 tag + 多架构 manifest digest。

| 组件 | 锁定版本 | 官方依据 |
|---|---|---|
| Python | 3.12.14 | [Python 官方镜像](https://hub.docker.com/_/python) |
| FastAPI | 0.162.0 | [官方容器部署](https://fastapi.tiangolo.com/deployment/docker/)、[包发布](https://pypi.org/project/fastapi/0.162.0/) |
| Uvicorn | 0.54.0 | [项目发布](https://pypi.org/project/uvicorn/0.54.0/) |
| SQLAlchemy | 2.1.6 | [SQLAlchemy 文档](https://docs.sqlalchemy.org/)、[包发布](https://pypi.org/project/SQLAlchemy/2.1.6/) |
| Alembic | 1.20.1 | [官方文档](https://alembic.sqlalchemy.org/) |
| psycopg | 3.3.6 | [官方文档](https://www.psycopg.org/psycopg3/docs/) |
| pgvector Python | 0.5.1 | [维护者项目](https://github.com/pgvector/pgvector-python) |
| pydantic-settings | 2.16.1 | [官方文档](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |
| MCP Python SDK | 2.3.0 | [官方 SDK](https://py.sdk.modelcontextprotocol.io/)、[Streamable HTTP](https://py.sdk.modelcontextprotocol.io/run/)、[结构化输出](https://py.sdk.modelcontextprotocol.io/server/structured-output/) |
| httpx / httpx2 | 0.28.1 / 2.16.0 | [httpx](https://www.python-httpx.org/)、MCP SDK 2.3.0 传输依赖 |
| argon2-cffi | 25.1.0 | [维护者文档](https://argon2-cffi.readthedocs.io/) |
| jieba | 0.42.1 | [维护者项目](https://github.com/fxsjy/jieba) |
| pytest / pytest-asyncio | 9.2.0 / 1.4.1 | [pytest 文档](https://docs.pytest.org/) |
| Node | 24.22.1 | [Node 官方镜像](https://hub.docker.com/_/node) |
| pnpm | 11.25.0 | [pnpm](https://pnpm.io/) |
| React / React DOM | 19.3.1 | [React 官方](https://react.dev/) 与 npm 发布元数据 |
| TypeScript | 7.0.2 | [官方 TypeScript](https://www.typescriptlang.org/) 与 npm 发布元数据 |
| Vite / plugin-react | 8.3.5 / 6.1.2 | [官方指南](https://vite.dev/guide/) |
| Tailwind / Vite 插件 | 4.3.3 | [官方 Vite 集成](https://tailwindcss.com/docs/installation/using-vite) |
| lucide-react | 1.62.0 | [Lucide 文档](https://lucide.dev/guide/packages/lucide-react) |
| PostgreSQL 本机验证 | 17.11 | [官方源码目录](https://www.postgresql.org/ftp/source/v17.11/) |
| pgvector 扩展 | 0.8.7 | [官方维护仓库及 Docker 标签](https://github.com/pgvector/pgvector) |
| Caddy | 2.10.2 | [官方发布](https://github.com/caddyserver/caddy/releases/tag/v2.10.2) |
| Compose 配置校验工具 | 2.40.3 | [官方发布](https://github.com/docker/compose/releases/tag/v2.40.3) |

容器基础镜像的 tag 与 digest 还使用 Docker Hub 官方 registry 元数据核实。实际 PostgreSQL 容器补丁版本由固定的 pgvector 镜像 digest 决定，本机 17.11 不作为该镜像内部运行版本的断言。

本机 PostgreSQL 从官方 tarball 编译并核对 SHA-256，pgvector 使用官方 v0.8.7 源码。Compose 二进制核对官方 SHA-256，Caddy 归档核对官方 SHA-512；只用于配置校验，不安装到全局系统目录。

模型适配依据：[Ollama chat](https://docs.ollama.com/api/chat)、[Ollama embed](https://docs.ollama.com/api/embed)。PAT 与 OAuth 能力边界依据：[MCP 授权规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)。本版没有宣称完成 OAuth。

GitHub 验证工作流使用官方 [actions/checkout v4.3.1](https://github.com/actions/checkout/releases/tag/v4.3.1)，固定提交 `34e114876b0b11c390a56381ad16ebd13914f8d5`；运行器为 ubuntu-24.04。工作流实际结果以对应提交的 Actions 记录为准。
