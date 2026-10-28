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

export default function Review(p: Obj) {
  const { data, error } = useData("/memories?status=candidate", p.refresh),
    { data: relations } = useData("/relations", p.refresh);
  const [resolve, setResolve] = useState<Obj | null>(null);
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>候选记忆</h2>
          <Badge
            value="candidate"
            label={String(data?.total || 0) + " 条待审核"}
          />
        </div>
        <p className="muted">
          点击记忆可查看原文依据、编辑后确认或拒绝。AI
          推断不会自动标为用户已确认。
        </p>
        {!data ? (
          <Loading error={error} />
        ) : data.items.length ? (
          <MemoryRows items={data.items} openMemory={p.openMemory} />
        ) : (
          <Empty
            title="当前没有待审核候选"
            text="接入的 Agent 提出新记忆后，会出现在这里。"
          />
        )}
      </section>
      <section className="panel spaced">
        <div className="section-heading">
          <h2>重复与冲突</h2>
          <span className="meta">按同标题与高文本相似度提示，仍需人工判断</span>
        </div>
        {relations?.items.length ? (
          relations.items.map((r) => (
            <div key={r.id} className="conflict">
              <div className="compare">
                {[r.left, r.right].map((m) => (
                  <div key={m.id}>
                    <Badge value={m.status} />
                    <h3>
                      {m.title} <small>v{m.version}</small>
                    </h3>
                    <p>{m.body}</p>
                    <blockquote>{m.quote}</blockquote>
                    <Button onClick={() => p.openSource(m.source_id)}>
                      查看原文
                    </Button>
                    <Button
                      kind="primary"
                      onClick={() =>
                        setResolve({
                          relation: r,
                          winner_id: m.id,
                          mode: "correction",
                          merged_body: m.body,
                          effective_at: "",
                        })
                      }
                    >
                      选择这一版
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="没有待处理冲突"
            text="已确认或锁定的事实不会被低可信推断静默覆盖。"
          />
        )}
      </section>
      {resolve && (
        <div className="overlay front">
          <section className="modal">
            <h2>处理新旧信息</h2>
            <Field label="处理方式">
              <select
                value={resolve.mode}
                onChange={(e) =>
                  setResolve({ ...resolve, mode: e.target.value })
                }
              >
                <option value="correction">以前记录有误：旧版标记为错误</option>
                <option value="change">事实随时间变化：保留前后适用时间</option>
                <option value="merge">合并：保留来源和历史</option>
              </select>
            </Field>
            {resolve.mode === "change" && (
              <Field label="新事实生效时间">
                <input
                  type="datetime-local"
                  value={resolve.effective_at}
                  onChange={(e) =>
                    setResolve({ ...resolve, effective_at: e.target.value })
                  }
                />
              </Field>
            )}
            {resolve.mode === "merge" && (
              <Field label="合并正文">
                <textarea
                  rows={6}
                  value={resolve.merged_body}
                  onChange={(e) =>
                    setResolve({ ...resolve, merged_body: e.target.value })
                  }
                />
              </Field>
            )}
            <div className="action-row">
              <Button onClick={() => setResolve(null)}>取消</Button>
              <Button
                kind="primary"
                disabled={p.busy}
                onClick={async () => {
                  const r = resolve.relation,
                    w = r.left.id === resolve.winner_id ? r.left : r.right,
                    o = w === r.left ? r.right : r.left;
                  const result = await p.run(
                    () =>
                      send("/relations/resolve", {
                        relation_id: r.id,
                        winner_id: w.id,
                        winner_version: w.version,
                        other_version: o.version,
                        mode: resolve.mode,
                        merged_body:
                          resolve.mode === "merge" ? resolve.merged_body : null,
                        effective_at: resolve.effective_at
                          ? new Date(resolve.effective_at).toISOString()
                          : null,
                      }),
                    "冲突已处理，历史已保留",
                  );
                  if (result) setResolve(null);
                }}
              >
                确认处理
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
