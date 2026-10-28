import React, { useEffect, useState } from "react";
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

export type Obj = Record<string, any>;
export const cats: Obj = {
  profile: "用户资料与偏好",
  fact: "长期事实",
  project: "项目记忆",
  event: "事件与经历",
  knowledge: "知识与数据",
  session: "会话摘要",
};
export const statuses: Obj = {
  active: "有效",
  candidate: "待审核",
  rejected: "已拒绝",
  archived: "已归档",
  trash: "回收站",
  superseded: "已替代",
  incorrect: "已纠错",
  pending: "等待处理",
  processing: "处理中",
  retrying: "等待重试",
  succeeded: "成功",
  failed: "失败",
};
export const evidence: Obj = {
  user_entered: "用户填写",
  confirmed: "用户已确认",
  extracted: "原文提取 · 未经用户确认",
  inferred: "AI 推断 · 未经确认",
};
export const pages = [
  ["overview", "总览", Layers3],
  ["memories", "记忆库", Database],
  ["personas", "我的资料与 AI 人格", Fingerprint],
  ["projects", "项目空间", FolderOpen],
  ["review", "候选与冲突", Inbox],
  ["sources", "原始记录与资料", FileText],
  ["debug", "检索调试台", Search],
  ["agents", "Agent 接入", Network],
  ["settings", "系统设置", SlidersHorizontal],
] as const;
let expired = () => {};
export async function api(path: string, options: Obj = {}) {
  const headers: Obj = {
    "Content-Type": "application/json",
    ...(options.body ? { "Idempotency-Key": crypto.randomUUID() } : {}),
    ...options.headers,
  };
  const r = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await r
    .json()
    .catch(() => ({ detail: "服务器没有返回有效响应" }));
  if (!r.ok) {
    if (r.status === 401 && !options.headers?.Authorization) expired();
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail || data),
    );
  }
  return data;
}
export const send = (path: string, body: Obj = {}, method = "POST") =>
  api(path, { method, body });
export const date = (v: string) =>
  v
    ? new Date(v).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "尚无访问";
export const Badge = ({ value, label }: { value: string; label?: string }) => (
  <span className={"badge " + value}>{label || statuses[value] || value}</span>
);
export const Empty = ({
  title = "这里还没有内容",
  text = "添加第一条记忆，让下一次对话从这里继续。",
  action,
}: {
  title?: string;
  text?: string;
  action?: React.ReactNode;
}) => (
  <div className="empty">
    <div className="empty-icon">
      <Layers3 size={30} />
    </div>
    <h3>{title}</h3>
    <p>{text}</p>
    {action}
  </div>
);
export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);
export const Button = ({
  children,
  onClick,
  kind = "",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    className={"btn " + kind}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
export const ProjectSelect = ({
  value,
  onChange,
  projects,
  empty = "全局 / 不属于项目",
}: Obj) => (
  <select
    value={value || ""}
    onChange={(e) => onChange(e.target.value || null)}
  >
    <option value="">{empty}</option>
    {projects.map((p: Obj) => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))}
  </select>
);

export function setExpiredHandler(fn: () => void) {
  expired = fn;
}

export function useData(path: string, refresh = 0) {
  const [data, setData] = useState<Obj | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    api(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [path, refresh]);
  return { data, error };
}

export function Loading({ error }: Obj) {
  return (
    <div className="loading">
      {error ? (
        <>
          <AlertCircle /> {error}
        </>
      ) : (
        <>
          <RefreshCw className="spin" /> 正在读取服务端数据…
        </>
      )}
    </div>
  );
}

export function MemoryRows({ items, openMemory }: Obj) {
  return (
    <div className="memory-list">
      {items.map((m) => (
        <button
          className="memory-row"
          key={m.id}
          onClick={() => openMemory(m.id)}
        >
          <div className={"type-icon " + m.category}>
            <BookOpen size={18} />
          </div>
          <div className="memory-main">
            <div className="row-title">
              {m.title}
              {m.pinned && <Pin size={13} />}
              <Badge value={m.status} />
            </div>
            <p>{m.summary || m.body.slice(0, 150)}</p>
            <div className="meta">
              {cats[m.category]}
              <span>·</span>
              {evidence[m.provenance]}
              <span>·</span>
              {m.source_id ? "有原文依据" : ""}
            </div>
          </div>
          <div className="row-end">
            <small>{date(m.updated_at)}</small>
            <span>
              v{m.version}
              <ChevronRight size={16} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
