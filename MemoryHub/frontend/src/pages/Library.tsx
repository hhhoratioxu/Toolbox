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

export default function Library(p: Obj) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(p.fixedCategory || ""),
    [status, setStatus] = useState(""),
    [tag, setTag] = useState(""),
    [sensitivity, setSensitivity] = useState(""),
    [since, setSince] = useState(""),
    [sourceId, setSourceId] = useState(""),
    [offset, setOffset] = useState(0);
  const qs = new URLSearchParams({
    query,
    limit: "30",
    offset: String(offset),
  });
  Object.entries({
    category,
    status,
    tag,
    sensitivity,
    project_id: p.filterProject,
    source_id: sourceId,
    since: since ? new Date(since).toISOString() : "",
  }).forEach(([k, v]) => {
    if (v) qs.set(k, v as string);
  });
  const { data, error } = useData("/memories?" + qs, p.refresh);
  return (
    <section className="panel">
      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="搜索标题或正文…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">全部分类</option>
          {Object.entries(cats).map(([k, v]) => (
            <option key={k} value={k}>
              {v as string}
            </option>
          ))}
        </select>
        <ProjectSelect
          projects={p.projects}
          value={p.filterProject}
          empty="全部项目"
          onChange={(v) => {
            p.setFilterProject(v || "");
            setOffset(0);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">全部状态</option>
          {Object.entries(statuses)
            .slice(0, 7)
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v as string}
              </option>
            ))}
        </select>
      </div>
      <details className="advanced">
        <summary>更多筛选：标签、敏感级别、时间与来源</summary>
        <div className="form-grid">
          <Field label="标签">
            <input value={tag} onChange={(e) => setTag(e.target.value)} />
          </Field>
          <Field label="敏感级别">
            <select
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
            >
              <option value="">全部</option>
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>
                  {i} · {["公开", "普通", "敏感", "高度敏感"][i]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="修改时间晚于">
            <input
              type="datetime-local"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </Field>
          <Field label="来源 ID">
            <input
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            />
          </Field>
        </div>
      </details>
      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          {data.items.length ? (
            <MemoryRows items={data.items} openMemory={p.openMemory} />
          ) : (
            <Empty
              title="没有找到符合条件的记忆"
              text="调整筛选条件，或新增一条记忆。"
            />
          )}
          <div className="pagination">
            <span>
              共 {data.total} 条 · 当前 {offset + 1}–
              {Math.min(offset + 30, data.total)}
            </span>
            <Button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 30))}
            >
              上一页
            </Button>
            <Button
              disabled={offset + 30 >= data.total}
              onClick={() => setOffset(offset + 30)}
            >
              下一页
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
