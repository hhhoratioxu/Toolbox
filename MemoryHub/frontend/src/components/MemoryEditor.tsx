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

export default function MemoryEditor({
  initial,
  projects,
  busy,
  onClose,
  onSave,
}: Obj) {
  const [d, setD] = useState<Obj>({
    title: "",
    body: "",
    summary: "",
    category: "fact",
    project_id: null,
    tags: [],
    applicability: "",
    source_id: null,
    quote: "",
    importance: 3,
    sensitivity: 1,
    external_allowed: false,
    pinned: false,
    locked: false,
    fact_at: null,
    valid_from: null,
    valid_until: null,
    ...Object.fromEntries(
      Object.entries(initial).filter(([k]) =>
        [
          "title",
          "body",
          "summary",
          "category",
          "project_id",
          "tags",
          "applicability",
          "source_id",
          "quote",
          "importance",
          "sensitivity",
          "external_allowed",
          "pinned",
          "locked",
          "fact_at",
          "valid_from",
          "valid_until",
        ].includes(k),
      ),
    ),
  });
  const set = (k, v) => setD({ ...d, [k]: v });
  return (
    <div className="overlay front">
      <form
        className="modal wide"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(d);
        }}
      >
        <div className="drawer-top">
          <h2>{initial.id ? "编辑记忆 · v" + initial.version : "新增记忆"}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="关闭编辑"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <Field label="标题">
          <input
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            required
            maxLength={240}
          />
        </Field>
        <div className="form-grid">
          <Field label="分类">
            <select
              value={d.category}
              disabled={!!initial.id || !!initial.source_id}
              onChange={(e) => set("category", e.target.value)}
            >
              {Object.entries(cats).map(([k, v]) => (
                <option key={k} value={k}>
                  {v as string}
                </option>
              ))}
            </select>
          </Field>
          <Field label="所属项目">
            {initial.id ? (
              <input
                readOnly
                value={
                  projects.find((p) => p.id === d.project_id)?.name || "全局"
                }
              />
            ) : (
              <ProjectSelect
                projects={projects}
                value={d.project_id}
                onChange={(v) => set("project_id", v)}
              />
            )}
          </Field>
        </div>
        <Field
          label="正文"
          hint="只填写你希望长期保存的内容。用户手动创建的记忆会明确标记来源。"
        >
          <textarea
            value={d.body}
            rows={7}
            onChange={(e) => set("body", e.target.value)}
            required
            maxLength={40000}
          />
        </Field>
        <Field label="摘要（可选）">
          <textarea
            rows={2}
            value={d.summary}
            onChange={(e) => set("summary", e.target.value)}
            maxLength={2000}
          />
        </Field>
        <div className="form-grid">
          <Field label="标签，以逗号分隔">
            <input
              value={d.tags.join(",")}
              onChange={(e) =>
                set(
                  "tags",
                  e.target.value
                    .split(/[,，]/)
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
            />
          </Field>
          <Field label="适用范围说明">
            <input
              value={d.applicability}
              onChange={(e) => set("applicability", e.target.value)}
            />
          </Field>
          <Field label="重要程度">
            <select
              value={d.importance}
              onChange={(e) => set("importance", +e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <option key={i} value={i}>
                  {i} / 5
                </option>
              ))}
            </select>
          </Field>
          <Field label="敏感级别">
            <select
              value={d.sensitivity}
              onChange={(e) => set("sensitivity", +e.target.value)}
            >
              {["公开", "普通", "敏感", "高度敏感"].map((v, i) => (
                <option key={i} value={i}>
                  {i} · {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <details>
          <summary>时间与有效期</summary>
          <div className="form-grid">
            {[
              ["fact_at", "事实发生时间"],
              ["valid_from", "生效时间"],
              ["valid_until", "失效时间"],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <input
                  type="datetime-local"
                  value={
                    d[k]
                      ? new Date(
                          new Date(d[k]).getTime() -
                            new Date(d[k]).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    set(
                      k,
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </Field>
            ))}
          </div>
        </details>
        <label className="check">
          <input
            type="checkbox"
            checked={d.external_allowed}
            onChange={(e) => set("external_allowed", e.target.checked)}
          />
          允许获授权的外部 Agent / 云端模型读取此内容
        </label>
        <div className="notice">
          外部服务仍需匹配项目、分类和敏感级别授权。已经发送的内容无法从旧对话中远程撤回。
        </div>
        <div className="action-row">
          <Button onClick={onClose}>取消</Button>
          <Button type="submit" kind="primary" disabled={busy}>
            {busy ? "保存中…" : "保存记忆"}
          </Button>
        </div>
      </form>
    </div>
  );
}
