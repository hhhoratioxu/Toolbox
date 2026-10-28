import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  X,
  Check,
  Moon,
  Sun,
  Menu,
  Database,
  Layers3,
  FolderOpen,
  Fingerprint,
  SlidersHorizontal,
  Inbox,
  FileText,
  Network,
  Sparkles,
  Clock,
  LockKeyhole,
  Pin,
  RefreshCw,
  Download,
  Upload,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  BookOpen,
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  Obj,
  pages,
  cats,
  evidence,
  date,
  api,
  send,
  Button,
  Badge,
  setExpiredHandler,
  Field,
} from "./shared";
import Overview from "./pages/Overview";
import Library from "./pages/Library";
import Projects from "./pages/Projects";
import Personas from "./pages/Personas";
import Review from "./pages/Review";
import Sources from "./pages/Sources";
import Debug from "./pages/Debug";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";
import Login from "./components/Login";
import MemoryEditor from "./components/MemoryEditor";

function App() {
  const [me, setMe] = useState<Obj | null>(null),
    [checking, setChecking] = useState(true),
    [page, setPage] = useState("overview"),
    [mobile, setMobile] = useState(false),
    [dark, setDark] = useState(localStorage.getItem("mh-theme") === "dark");
  const [projects, setProjects] = useState<Obj[]>([]),
    [refresh, setRefresh] = useState(0),
    [toast, setToast] = useState<Obj | null>(null),
    [drawer, setDrawer] = useState<Obj | null>(null),
    [editor, setEditor] = useState<Obj | null>(null),
    [source, setSource] = useState<Obj | null>(null),
    [forgetting, setForgetting] = useState<Obj | null>(null),
    [busy, setBusy] = useState(false),
    [filterProject, setFilterProject] = useState("");
  const notify = (message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 6500);
  };
  const run = async (fn: () => Promise<any>, message = "已保存") => {
    setBusy(true);
    try {
      const r = await fn();
      if (message) notify(message);
      setRefresh((v) => v + 1);
      return r;
    } catch (e) {
      notify((e as Error).message, true);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const go = (p: string) => {
    setPage(p);
    setMobile(false);
  };
  setExpiredHandler(() => setMe(null));
  useEffect(() => {
    api("/me")
      .then(setMe)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("mh-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (me)
      api("/projects")
        .then((d) => setProjects(d.items))
        .catch((e) => notify(e.message, true));
  }, [me, refresh]);
  const openMemory = async (id: string) => {
    try {
      setDrawer(await api("/memories/" + id));
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  const openSource = async (id: string, start = 0) => {
    try {
      setSource(await api(`/sources/${id}?start=${start}&length=15000`));
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  const change = async (action: string) => {
    const r = await run(
      () =>
        send("/memories/" + drawer!.id + "/action", {
          action,
          expected_version: drawer!.version,
        }),
      "操作已保存",
    );
    if (r) openMemory(r.id);
  };
  const shared = {
    projects,
    run,
    notify,
    busy,
    refresh,
    openMemory,
    openSource,
    setEditor,
    setPage: go,
    filterProject,
    setFilterProject,
  };
  if (checking)
    return (
      <div className="splash">
        <RefreshCw className="spin" /> 正在连接记忆中心…
      </div>
    );
  if (!me)
    return (
      <Login
        onLogin={async () => setMe(await api("/me"))}
        notify={notify}
        toast={toast}
      />
    );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar visible" : "sidebar"}>
        <a className="brand" onClick={() => go("overview")}>
          <div className="logo">
            <Layers3 size={24} />
          </div>
          <div>
            Memory Hub<small>你的长期记忆中心</small>
          </div>
        </a>
        <div className="nav-label">工作空间</div>
        <nav>
          {pages.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={19} />
            <div>
              私人记忆，统一管理<small>服务端是唯一权威来源</small>
            </div>
          </div>
          <button
            className="account"
            onClick={() =>
              run(async () => {
                await send("/logout");
                setMe(null);
              }, "已退出登录")
            }
          >
            <span className="avatar">我</span>
            <div>
              个人空间<small>管理员</small>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-btn mobile-only"
            aria-label="打开导航"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={21} />
          </button>
          <span className="breadcrumb">
            个人空间 <ChevronRight size={14} />{" "}
            <strong>{pages.find((x) => x[0] === page)?.[1]}</strong>
          </span>
          <div className="top-actions">
            <span className="connection">
              <i /> 已连接记忆中心
            </span>
            <button
              className="icon-btn"
              aria-label="切换主题"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <span className="avatar small">我</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MEMORY HUB / {page.toUpperCase()}</div>
              <h1>{pages.find((x) => x[0] === page)?.[1]}</h1>
              <p>
                {
                  {
                    overview: "让每一次对话，都有来处。",
                    memories: "保存值得记住的事，也保留改变它们的权利。",
                    personas: "关于你的信息，与 AI 的工作方式，分别管理。",
                    projects: "把背景、进度和决定留在同一个地方。",
                    review: "每一条有效记忆，都有清楚的依据。",
                    sources: "保留原文，追溯记忆的起点。",
                    debug: "看清一次检索带回了什么，以及为什么。",
                    agents: "让不同设备上的 Agent，连接同一份记忆。",
                    settings: "掌握你的模型、数据和存储策略。",
                  }[page]
                }
              </p>
            </div>
            <Button kind="primary" onClick={() => setEditor({})}>
              <Plus size={17} />
              新增记忆
            </Button>
          </div>
          {page === "overview" && <Overview {...shared} />}
          {page === "memories" && <Library {...shared} />}
          {page === "personas" && <Personas {...shared} />}
          {page === "projects" && <Projects {...shared} />}
          {page === "review" && <Review {...shared} />}
          {page === "sources" && <Sources {...shared} />}
          {page === "debug" && <Debug {...shared} />}
          {page === "agents" && <Agents {...shared} />}
          {page === "settings" && (
            <Settings {...shared} onRestored={() => setMe(null)} />
          )}
          <footer>
            Memory Hub <span>私人部署 · v0.1.0</span>
            <span>当前展示真实数据</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className={"toast " + (toast.error ? "error" : "")}>
          {toast.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}{" "}
          {toast.message}
        </div>
      )}
      {drawer && (
        <div className="overlay" onClick={() => setDrawer(null)}>
          <section className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <span>记忆详情</span>
              <button
                className="icon-btn"
                aria-label="关闭详情"
                onClick={() => setDrawer(null)}
              >
                <X />
              </button>
            </div>
            <Badge value={drawer.status} />
            <h2>{drawer.title}</h2>
            <div className="meta">
              {cats[drawer.category]} · v{drawer.version} ·{" "}
              {date(drawer.updated_at)}
            </div>
            <div className="notice">
              {evidence[drawer.provenance]}
              {drawer.locked ? " · 已锁定" : ""}
              {drawer.external_allowed
                ? " · 允许获授权的外部服务读取"
                : " · 仅限本地 / 私有 Agent"}
            </div>
            <p className="memory-body">{drawer.body}</p>
            <div className="tags">
              {drawer.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
            <div className="action-row">
              <Button kind="primary" onClick={() => setEditor(drawer)}>
                编辑记忆
              </Button>
              {drawer.status === "candidate" && (
                <>
                  <Button onClick={() => change("accept")}>确认生效</Button>
                  <Button onClick={() => change("reject")}>拒绝候选</Button>
                </>
              )}
              <Button onClick={() => change(drawer.pinned ? "unpin" : "pin")}>
                <Pin size={15} />
                {drawer.pinned ? "取消置顶" : "置顶"}
              </Button>
              <Button onClick={() => change(drawer.locked ? "unlock" : "lock")}>
                <LockKeyhole size={15} />
                {drawer.locked ? "解锁" : "锁定"}
              </Button>
            </div>
            <details open>
              <summary>原文依据与来源</summary>
              <blockquote>{drawer.quote}</blockquote>
              <Button onClick={() => openSource(drawer.source_id)}>
                <FileText size={15} />
                查看原始记录
              </Button>
              <small className="mono">
                来源 {drawer.source_id} · 字符 {drawer.quote_start}–
                {drawer.quote_end}
              </small>
            </details>
            <details>
              <summary>历史版本与差异（{drawer.revisions.length}）</summary>
              {drawer.revisions.map((r) => (
                <div className="revision" key={r.id}>
                  <b>
                    v{r.version} · {r.reason}
                  </b>
                  <small>
                    {date(r.created_at)} ·{" "}
                    {r.actor.startsWith("user") ? "用户" : "Agent / 后台任务"}
                  </small>
                  <pre>{r.diff || "正文未变化；状态或元数据已更新。"}</pre>
                  {r.version !== drawer.version && (
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        const v = await run(
                          () =>
                            send(`/memories/${drawer.id}/restore-version`, {
                              expected_version: drawer.version,
                              revision: r.version,
                            }),
                          "已创建恢复版本",
                        );
                        if (v) openMemory(v.id);
                      }}
                    >
                      恢复为此版本
                    </Button>
                  )}
                </div>
              ))}
            </details>
            <div className="action-row bottom">
              <Button
                onClick={() =>
                  change(
                    drawer.status === "archived" || drawer.status === "trash"
                      ? "restore"
                      : "archive",
                  )
                }
              >
                {drawer.status === "archived" || drawer.status === "trash"
                  ? "恢复"
                  : "归档"}
              </Button>
              <Button onClick={() => change("trash")}>移入回收站</Button>
              <Button
                kind="danger"
                onClick={async () => {
                  const r = await run(
                    () => api(`/memories/${drawer.id}/forget-preview`),
                    "",
                  );
                  if (r)
                    setForgetting({
                      ...r,
                      version: drawer.version,
                      id: drawer.id,
                    });
                }}
              >
                彻底遗忘
              </Button>
            </div>
          </section>
        </div>
      )}
      {editor && (
        <MemoryEditor
          initial={editor}
          projects={projects}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={async (data) => {
            const r = await run(
              () =>
                editor.id
                  ? send(
                      "/memories/" + editor.id,
                      {
                        ...data,
                        expected_version: editor.version,
                        reason: "用户网页修改",
                      },
                      "PUT",
                    )
                  : send("/memories", data),
              "记忆已保存，后续检索将使用新版本",
            );
            if (r) {
              setEditor(null);
              if (drawer) openMemory(r.id || r.memory.id);
            }
          }}
        />
      )}
      {source && (
        <div className="overlay front" onClick={() => setSource(null)}>
          <section className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <span>原始记录</span>
              <button
                className="icon-btn"
                aria-label="关闭来源"
                onClick={() => setSource(null)}
              >
                <X />
              </button>
            </div>
            <h2>{source.title}</h2>
            <div className="meta">
              {source.kind} · {source.total_characters} 字符 ·{" "}
              {date(source.created_at)}
            </div>
            {source.blocked && (
              <div className="notice warn">
                已停止自动提炼，防止旧资料重新产生已纠正的记忆。
              </div>
            )}
            <pre className="raw-text">
              {source.content || "原文已按保留策略清理。"}
            </pre>
            <div className="action-row">
              {source.start > 0 && (
                <Button
                  onClick={() =>
                    openSource(source.id, Math.max(0, source.start - 15000))
                  }
                >
                  上一段
                </Button>
              )}
              {source.end < source.total_characters && (
                <Button onClick={() => openSource(source.id, source.end)}>
                  下一段
                </Button>
              )}
              {!source.blocked && (
                <Button
                  onClick={() => {
                    setEditor({
                      title: source.title,
                      body: source.content,
                      source_id: source.id,
                      quote: source.content,
                      category: source.category,
                      project_id: source.project_id,
                      sensitivity: source.sensitivity,
                      external_allowed: source.external_allowed,
                    });
                    setSource(null);
                  }}
                >
                  从这段原文建立记忆
                </Button>
              )}
            </div>
            <small className="mono">SHA-256 {source.checksum}</small>
          </section>
        </div>
      )}
      {forgetting && (
        <div className="overlay front">
          <section className="modal">
            <h2>彻底遗忘的影响范围</h2>
            <p>{forgetting.warning}</p>
            <div className="notice warn">
              将处理 {forgetting.memory_ids.length} 条记忆、
              {forgetting.sources.length} 份来源及全部关联版本、索引。
            </div>
            {forgetting.memories.map((m) => (
              <p key={m.id}>• {m.title}</p>
            ))}
            <Field label="关联原文处理">
              <select
                value={forgetting.mode || "delete"}
                onChange={(e) =>
                  setForgetting({ ...forgetting, mode: e.target.value })
                }
              >
                <option value="delete">删除整份关联原文</option>
                <option value="redact">整份脱敏，仅保留占位记录</option>
              </select>
            </Field>
            <p className="muted">
              备份文件可能仍含旧正文，需按保留期限清理；恢复时必须携带删除日志。
            </p>
            <div className="action-row">
              <Button onClick={() => setForgetting(null)}>取消</Button>
              <Button
                kind="danger"
                disabled={busy}
                onClick={async () => {
                  const r = await run(
                    () =>
                      send(`/memories/${forgetting.id}/forget`, {
                        expected_version: forgetting.version,
                        mode: forgetting.mode || "delete",
                        confirm_memory_ids: forgetting.memory_ids,
                      }),
                    "已彻底遗忘并记录删除标记",
                  );
                  if (r) {
                    setForgetting(null);
                    setDrawer(null);
                  }
                }}
              >
                确认彻底遗忘
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
