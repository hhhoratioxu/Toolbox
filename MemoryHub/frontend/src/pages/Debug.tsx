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

export default function Debug(p: Obj) {
  const { data: personas } = useData("/personas", p.refresh),
    { data: agents } = useData("/agents", p.refresh),
    { data: traces } = useData("/traces", p.refresh);
  const [q, setQ] = useState(""),
    [req, setReq] = useState<Obj>({
      project_id: p.filterProject || null,
      persona_id: null,
      agent_id: null,
      budget: 4000,
      model_limit: 16000,
      conversation_tokens: 0,
      answer_reserve: 2000,
    }),
    [result, setResult] = useState<Obj | null>(null),
    [reply, setReply] = useState(""),
    [external, setExternal] = useState(false);
  return (
    <>
      <div className="debug-grid">
        <section className="panel">
          <h2>构建一次上下文</h2>
          <Field label="当前问题">
            <textarea
              rows={4}
              placeholder="例如：这个项目目前有哪些限制，下一步做什么？"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
          <Field label="项目">
            <ProjectSelect
              projects={p.projects}
              value={req.project_id}
              onChange={(v) => setReq({ ...req, project_id: v })}
            />
          </Field>
          <Field label="人格">
            <select
              value={req.persona_id || ""}
              onChange={(e) =>
                setReq({ ...req, persona_id: e.target.value || null })
              }
            >
              <option value="">使用默认人格</option>
              {personas?.items.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="模拟 Agent 权限">
            <select
              value={req.agent_id || ""}
              onChange={(e) =>
                setReq({ ...req, agent_id: e.target.value || null })
              }
            >
              <option value="">用户本人权限</option>
              {agents?.items
                .filter((a) => !a.revoked)
                .map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name} · {r.external ? "外部服务" : "私有服务"}
                  </option>
                ))}
            </select>
          </Field>
          <div className="form-grid">
            {[
              ["budget", "记忆预算"],
              ["model_limit", "模型上下文上限"],
              ["conversation_tokens", "现有对话占用"],
              ["answer_reserve", "回答预留"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  type="number"
                  min="0"
                  value={req[k]}
                  onChange={(e) => setReq({ ...req, [k]: +e.target.value })}
                />
              </Field>
            ))}
          </div>
          <Button
            kind="primary"
            disabled={p.busy}
            onClick={async () => {
              const r = await p.run(
                () => send("/context/preview", { ...req, query: q }),
                "",
              );
              if (r) setResult(r);
            }}
          >
            <Search size={16} />
            检索并预览
          </Button>
          <p className="muted">预览只表示检索命中，不代表已发给 Agent。</p>
        </section>
        <section className="panel context-output">
          <div className="section-heading">
            <h2>准备返回的上下文</h2>
            {result && (
              <Badge
                value="active"
                label={`${result.budget.used} / ${result.budget.limit} tokens · 估算`}
              />
            )}
          </div>
          {!result ? (
            <Empty
              title="等待一次检索"
              text="最终文本、来源和排除原因将完整显示在这里。"
            />
          ) : (
            <>
              <div className="notice">
                {result.message} · {result.retrieval}
                <br />
                {result.budget.method}
                {result.budget.truncated ? " · 已发生裁剪" : ""}
                <br />
                发送对象：{result.destination}
                {result.external ? "（外部服务）" : ""}
              </div>
              <pre className="context-text">
                {result.context || "当前预算不足，未生成上下文。"}
              </pre>
              <h3>采用的记忆与来源</h3>
              {result.selected.map((m, i) => (
                <div className="trace-item" key={i}>
                  <span>
                    <b>{m.type}</b> · {m.version ? "v" + m.version : ""} ·{" "}
                    {m.tokens_estimated} tokens{m.truncated ? " · 已裁剪" : ""}
                    <small>
                      {m.id}
                      <br />
                      {m.reason}
                    </small>
                  </span>
                  {m.type === "memory" && (
                    <Button onClick={() => p.openMemory(m.id)}>记忆</Button>
                  )}
                  {m.source_id && (
                    <Button
                      onClick={() =>
                        p.openSource(m.source_id, m.quote_start || 0)
                      }
                    >
                      来源
                    </Button>
                  )}
                </div>
              ))}
              <details>
                <summary>排除原因（{result.excluded.length}）</summary>
                <pre>{JSON.stringify(result.excluded, null, 2)}</pre>
              </details>
            </>
          )}
        </section>
      </div>
      <section className="panel spaced">
        <h2>模型测试对话</h2>
        <p className="muted">
          使用上方的问题、项目与预算。每次调用先保存用户检查点，再请求模型；提炼结果进入候选区。
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={external}
            onChange={(e) => setExternal(e.target.checked)}
          />
          若配置了外部模型，允许发送本次问题与已授权外部读取的记忆
        </label>
        <Button
          disabled={p.busy || !q}
          onClick={async () => {
            const r = await p.run(
              () =>
                send("/chat", {
                  ...req,
                  agent_id: null,
                  query: q,
                  allow_external: external,
                  save_checkpoint: true,
                }),
              "",
            );
            if (r) {
              setReply(r.reply);
              setResult(r.context);
            }
          }}
        >
          <Sparkles size={16} />
          发送测试问题
        </Button>
        {reply && <div className="model-reply">{reply}</div>}
      </section>
      <section className="panel spaced">
        <h2>最近的上下文请求</h2>
        <p className="muted">
          回执仅证明客户端报告已加入上下文，不能证明模型实际采用。
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>请求主体</th>
                <th>服务器知道的状态</th>
                <th>采用条数</th>
                <th>预算占用</th>
              </tr>
            </thead>
            <tbody>
              {traces?.items.map((t) => (
                <tr key={t.id}>
                  <td>{date(t.created_at)}</td>
                  <td className="mono">{t.actor.slice(0, 24)}</td>
                  <td>
                    {{
                      retrieved: "检索命中 / 预览",
                      returned: "已返回给 Agent",
                      acknowledged: "客户端确认已加入",
                      invalidated: "关联内容已删除",
                    }[t.status] || t.status}
                  </td>
                  <td>{t.selected.length}</td>
                  <td>
                    {t.used} / {t.budget}（估算）
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
