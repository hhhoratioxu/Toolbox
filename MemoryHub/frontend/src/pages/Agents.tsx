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

export default function Agents(p: Obj) {
  const { data, error } = useData("/agents", p.refresh),
    { data: settings } = useData("/settings", p.refresh),
    [create, setCreate] = useState(false),
    [token, setToken] = useState(""),
    [d, setD] = useState<Obj>({
      name: "",
      external: true,
      service_label: "",
      permissions: {
        scopes: ["read", "propose"],
        projects: [],
        all_projects: false,
        global_access: false,
        categories: ["project", "knowledge", "event", "session"],
        max_sensitivity: 1,
        persona_access: true,
      },
    });
  const toggle = (field, value) =>
    setD({
      ...d,
      permissions: {
        ...d.permissions,
        [field]: d.permissions[field].includes(value)
          ? d.permissions[field].filter((x) => x !== value)
          : [...d.permissions[field], value],
      },
    });
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>独立凭证与访问范围</h2>
          <Button kind="primary" onClick={() => setCreate(true)}>
            <Plus size={16} />
            连接新 Agent
          </Button>
        </div>
        <div className="notice">
          外部 Agent
          只能读取明确允许对外发送的内容，且仍受项目、分类和敏感级别限制。密钥仅展示一次，服务器只保存哈希。
        </div>
        {!data ? (
          <Loading error={error} />
        ) : data.items.length ? (
          data.items.map((a) => (
            <div className="agent-row" key={a.id}>
              <div className="type-icon">
                <Network />
              </div>
              <div className="agent-info">
                <h3>
                  {a.name}{" "}
                  <Badge
                    value={a.revoked ? "archived" : "active"}
                    label={a.revoked ? "已撤销" : "凭证有效"}
                  />
                </h3>
                <p>
                  {a.service_label} ·{" "}
                  {a.external ? "外部服务" : "本地 / 私有服务"} · 最近访问{" "}
                  {date(a.last_seen)}
                </p>
                <small>
                  权限：{a.permissions.scopes.join(" / ")} · 项目：
                  {a.permissions.all_projects
                    ? "全部"
                    : a.permissions.projects
                        .map(
                          (id) =>
                            p.projects.find((x) => x.id === id)?.name || id,
                        )
                        .join("、") || "无"}{" "}
                  · {a.permissions.global_access ? "含全局" : "不含全局"} ·
                  最高敏感级别 {a.permissions.max_sensitivity}
                </small>
                <small>
                  分类：
                  {a.permissions.categories.map((c) => cats[c]).join("、")} ·
                  凭证前缀 {a.token_prefix}…
                </small>
              </div>
              <Button
                disabled={a.revoked}
                kind="danger"
                onClick={() =>
                  p.run(() => send("/agents/" + a.id + "/revoke"), "凭证已撤销")
                }
              >
                撤销
              </Button>
            </div>
          ))
        ) : (
          <Empty
            title="连接你的第一个 Agent"
            text="为每台设备或每个 Agent 创建独立凭证，随时撤销。"
          />
        )}
      </section>
      <section className="panel spaced">
        <h2>服务地址与接入方式</h2>
        <Field label="远程 MCP / Streamable HTTP">
          <input readOnly value={settings?.mcp_url || ""} />
        </Field>
        <Field label="HTTP API">
          <input readOnly value={(settings?.public_url || "") + "/api"} />
        </Field>
        <div className="compare">
          <div>
            <h3>方式一 · HTTP 适配器</h3>
            <pre>
              {'export MEMORY_HUB_URL="' +
                (settings?.public_url || "https://memory.example.com") +
                '"\n# 从密码管理器向环境注入 MEMORY_HUB_TOKEN\npython examples/http_agent.py context --project PROJECT_ID --query "继续项目"'}
            </pre>
            <p>
              客户端启动、切换主题或每轮检查点由适配器触发。没有钩子支持的客户端只能手动读取。
            </p>
          </div>
          <div>
            <h3>方式二 · 官方 MCP SDK</h3>
            <pre>
              {
                "Authorization: Bearer $MEMORY_HUB_TOKEN\nTransport: Streamable HTTP\nTools: get_context / propose_memory / ingest_event\npython examples/mcp_agent.py --project PROJECT_ID"
              }
            </pre>
            <p>
              仅支持 OAuth
              的云端连接器在本版不可直接接入。第三方客户端配置兼容性需单独验收。
            </p>
          </div>
        </div>
        <h3>测试一个凭证</h3>
        <Field label="仅在本次页面会话中使用">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="粘贴待测试的 Agent 令牌"
          />
        </Field>
        <Button
          disabled={!token}
          onClick={() =>
            p.run(
              () =>
                api("/me", { headers: { Authorization: "Bearer " + token } }),
              "连通成功：服务器已验证此凭证",
            )
          }
        >
          测试认证与权限
        </Button>
      </section>
      {create && (
        <div className="overlay front">
          <form
            className="modal wide"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await p.run(() => send("/agents", d), "");
              if (r) {
                setToken(r.token);
                setCreate(false);
                p.notify("凭证已创建。密钥仅保留在本次页面，请立即复制。");
              }
            }}
          >
            <h2>签发 Agent 凭证</h2>
            <Field label="名称">
              <input
                required
                value={d.name}
                onChange={(e) => setD({ ...d, name: e.target.value })}
              />
            </Field>
            <Field label="服务名称（例如本地编程助手、某云端模型）">
              <input
                required
                value={d.service_label}
                onChange={(e) => setD({ ...d, service_label: e.target.value })}
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={d.external}
                onChange={(e) => setD({ ...d, external: e.target.checked })}
              />
              此 Agent 可能把数据发送到外部服务
            </label>
            <h3>授权能力</h3>
            <div className="checks">
              {[
                ["read", "读取"],
                ["propose", "提交候选 / 检查点"],
                ["update", "修改未确认且未锁定记忆"],
                ["export", "导出有效记忆"],
              ].map(([k, l]) => (
                <label className="check" key={k}>
                  <input
                    type="checkbox"
                    checked={d.permissions.scopes.includes(k)}
                    onChange={() => toggle("scopes", k)}
                  />
                  {l}
                </label>
              ))}
            </div>
            <h3>项目范围</h3>
            <div className="checks">
              {p.projects.map((project) => (
                <label className="check" key={project.id}>
                  <input
                    type="checkbox"
                    checked={d.permissions.projects.includes(project.id)}
                    onChange={() => toggle("projects", project.id)}
                  />
                  {project.name}
                </label>
              ))}
            </div>
            {[
              ["all_projects", "所有项目（含未来项目）"],
              ["global_access", "全局资料"],
              ["persona_access", "人格配置"],
            ].map(([k, l]) => (
              <label className="check" key={k}>
                <input
                  type="checkbox"
                  checked={d.permissions[k]}
                  onChange={(e) =>
                    setD({
                      ...d,
                      permissions: { ...d.permissions, [k]: e.target.checked },
                    })
                  }
                />
                {l}
              </label>
            ))}
            <h3>分类</h3>
            <div className="checks">
              {Object.entries(cats).map(([k, l]) => (
                <label className="check" key={k}>
                  <input
                    type="checkbox"
                    checked={d.permissions.categories.includes(k)}
                    onChange={() => toggle("categories", k)}
                  />
                  {l as string}
                </label>
              ))}
            </div>
            <Field label="允许的最高敏感级别">
              <select
                value={d.permissions.max_sensitivity}
                onChange={(e) =>
                  setD({
                    ...d,
                    permissions: {
                      ...d.permissions,
                      max_sensitivity: +e.target.value,
                    },
                  })
                }
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <div className="action-row">
              <Button onClick={() => setCreate(false)}>取消</Button>
              <Button type="submit" kind="primary" disabled={p.busy}>
                签发凭证
              </Button>
            </div>
          </form>
        </div>
      )}
      {token && (
        <section className="panel spaced token-panel">
          <h3>本次凭证 · 请妥善保存</h3>
          <p>刷新或离开页面后不再展示。不要放入代码、截图、URL 或日志。</p>
          <div className="action-row">
            <Button
              onClick={() =>
                navigator.clipboard
                  .writeText(token)
                  .then(() => p.notify("已复制到剪贴板"))
                  .catch(() =>
                    p.notify("剪贴板不可用，请从密码输入框手动复制", true),
                  )
              }
            >
              <Copy size={16} />
              复制凭证
            </Button>
            <Button onClick={() => setToken("")}>从页面清除</Button>
          </div>
        </section>
      )}
    </>
  );
}
