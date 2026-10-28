import React, { useState, useEffect } from "react";
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
  cats,
  statuses,
  evidence,
  date,
  api,
  send,
  useData,
  Loading,
  MemoryRows,
  Field,
  Button,
  ProjectSelect,
  Empty,
  Badge,
} from "../shared";

export default function Sources(p: Obj) {
  const { data, error } = useData("/sources", p.refresh),
    { data: jobs } = useData("/jobs", p.refresh),
    [form, setForm] = useState<Obj>({
      title: "",
      content: "",
      kind: "note",
      speaker: "unknown",
      project_id: null,
      category: "knowledge",
      sensitivity: 1,
      external_allowed: false,
      extract: false,
    });
  const set = (k, v) => setForm({ ...form, [k]: v });
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>导入资料</h2>
          <span className="meta">TXT / Markdown / JSON · 单份上限 2 MB</span>
        </div>
        <div className="import-grid">
          <div>
            <label className="file-drop">
              <Upload size={25} />
              <b>选择文件，或在右侧粘贴内容</b>
              <span>原文先持久保存，提炼失败不会丢失</span>
              <input
                aria-label="选择导入文件"
                type="file"
                accept=".txt,.md,.markdown,.json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 2_000_000) {
                    p.notify("文件超过 2 MB，请分段导入", true);
                    return;
                  }
                  const ext = f.name.split(".").pop()?.toLowerCase();
                  if (!["txt", "md", "markdown", "json"].includes(ext || "")) {
                    p.notify("仅支持 TXT、Markdown、JSON", true);
                    return;
                  }
                  setForm({
                    ...form,
                    title: f.name,
                    content: await f.text(),
                    kind:
                      ext === "json"
                        ? "json"
                        : ext === "txt"
                          ? "txt"
                          : "markdown",
                  });
                }}
              />
            </label>
            <Field label="标题">
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
            <Field label="所属项目">
              <ProjectSelect
                value={form.project_id}
                onChange={(v) => set("project_id", v)}
                projects={p.projects}
              />
            </Field>
            <Field label="分类">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {Object.entries(cats).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v as string}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="原文发言者 / 语境">
              <select
                value={form.speaker}
                onChange={(e) => set("speaker", e.target.value)}
              >
                <option value="unknown">不确定 / 混合资料</option>
                <option value="user">用户本人明确发言</option>
                <option value="assistant">AI 生成内容</option>
                <option value="quoted">引用或第三方资料</option>
              </select>
            </Field>
            <Field label="敏感级别">
              <select
                value={form.sensitivity}
                onChange={(e) => set("sensitivity", +e.target.value)}
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n} · {["公开", "普通", "敏感", "高度敏感"][n]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={form.external_allowed}
                onChange={(e) => set("external_allowed", e.target.checked)}
              />
              允许授权的外部服务读取
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.extract}
                onChange={(e) => set("extract", e.target.checked)}
              />
              保存后由模型提炼候选
            </label>
          </div>
          <div>
            <Field label={"内容预览 · " + form.content.length + " 字符"}>
              <textarea
                rows={18}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="粘贴笔记、会话检查点或结构化 JSON…"
              />
            </Field>
            <Button
              kind="primary"
              disabled={p.busy || !form.content || !form.title}
              onClick={async () => {
                const r = await p.run(() => send("/sources", form), "");
                if (r) {
                  p.notify(
                    r.duplicate
                      ? "内容已存在，已复用原始记录"
                      : "原始记录已保存",
                  );
                  setForm({ ...form, content: "", title: "" });
                }
              }}
            >
              {p.busy ? "导入中…" : "保存原始记录"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>
      <section className="panel spaced">
        <div className="section-heading">
          <h2>已保存的原始记录</h2>
          <Button onClick={() => p.run(() => Promise.resolve(), "列表已刷新")}>
            <RefreshCw size={15} />
            刷新
          </Button>
        </div>
        {!data ? (
          <Loading error={error} />
        ) : data.items.length ? (
          data.items.map((s) => (
            <div className="source-row" key={s.id}>
              <FileText size={20} />
              <div>
                <b>{s.title}</b>
                <small>
                  {s.kind} · {cats[s.category]} · {date(s.created_at)}
                  {s.blocked ? " · 已停止自动提炼" : ""}
                </small>
              </div>
              <Button onClick={() => p.openSource(s.id)}>原文</Button>
              <Button
                disabled={s.blocked || p.busy}
                onClick={() =>
                  p.run(
                    () => send("/sources/" + s.id + "/extract"),
                    "已加入提炼队列",
                  )
                }
              >
                提炼候选
              </Button>
            </div>
          ))
        ) : (
          <Empty title="尚未导入原始记录" />
        )}
      </section>
      <section className="panel spaced">
        <h2>后台任务</h2>
        {jobs?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>任务</th>
                  <th>状态</th>
                  <th>尝试次数</th>
                  <th>结果 / 原因</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.items.map((j) => (
                  <tr key={j.id}>
                    <td>{j.kind === "extract" ? "自动提炼" : "向量索引"}</td>
                    <td>
                      <Badge value={j.status} />
                    </td>
                    <td>{j.attempts}</td>
                    <td>
                      {j.error || j.result.skipped || JSON.stringify(j.result)}
                    </td>
                    <td>
                      {["failed", "retrying"].includes(j.status) && (
                        <Button
                          onClick={() =>
                            p.run(
                              () => send("/jobs/" + j.id + "/retry"),
                              "任务已安排重试",
                            )
                          }
                        >
                          重试
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">尚无后台任务。</p>
        )}
      </section>
    </>
  );
}
