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
import Library from "./Library";

export default function Personas(p: Obj) {
  const { data, error } = useData("/personas", p.refresh);
  const [editing, setEditing] = useState<Obj | null>(null),
    [tab, setTab] = useState("personas");
  return (
    <>
      <div className="tabs">
        <button
          className={tab === "personas" ? "selected" : ""}
          onClick={() => setTab("personas")}
        >
          AI 人格与行为
        </button>
        <button
          className={tab === "profile" ? "selected" : ""}
          onClick={() => setTab("profile")}
        >
          我的资料与偏好
        </button>
      </div>
      {tab === "profile" ? (
        <Library {...p} fixedCategory="profile" />
      ) : (
        <>
          <div className="notice">
            人格是你主动维护的行为偏好，普通聊天的自动提炼不会覆盖它。最终效果服从客户端系统规则及你当前的明确指令。
          </div>
          <div className="section-heading">
            <h2>人格配置</h2>
            <Button
              onClick={() =>
                setEditing({
                  name: "",
                  config: {
                    role: "",
                    language: "简体中文",
                    address: "",
                    tone: "自然",
                    formality: "适中",
                    length: "适中",
                    depth: "适中",
                    proactive: true,
                    uncertainty: "明确说明不确定性",
                    preferences: "",
                  },
                  enabled: true,
                  is_default: false,
                  external_allowed: false,
                })
              }
            >
              <Plus size={16} />
              新建人格
            </Button>
          </div>
          {!data ? (
            <Loading error={error} />
          ) : (
            <div className="project-grid">
              {data.items.map((r) => (
                <section className="panel" key={r.id}>
                  <div className="section-heading">
                    <h2>{r.name}</h2>
                    {r.is_default && <Badge value="active" label="默认人格" />}
                  </div>
                  <pre className="persona-preview">{r.preview}</pre>
                  <div className="action-row">
                    <Button onClick={() => setEditing(r)}>编辑与预览</Button>
                    {!r.is_default && (
                      <Button
                        onClick={() =>
                          p.run(
                            () =>
                              send(
                                "/personas/" + r.id,
                                {
                                  name: r.name,
                                  config: r.config,
                                  enabled: r.enabled,
                                  is_default: true,
                                  external_allowed: r.external_allowed,
                                  expected_version: r.version,
                                },
                                "PUT",
                              ),
                            "已切换默认人格",
                          )
                        }
                      >
                        设为默认
                      </Button>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      {editing && (
        <div className="overlay front">
          <form
            className="modal wide"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = {
                name: editing.name,
                config: editing.config,
                enabled: editing.enabled,
                is_default: editing.is_default,
                external_allowed: editing.external_allowed,
              };
              const r = await p.run(() =>
                editing.id
                  ? send(
                      "/personas/" + editing.id,
                      { ...d, expected_version: editing.version },
                      "PUT",
                    )
                  : send("/personas", d),
              );
              if (r) setEditing(null);
            }}
          >
            <h2>人格配置</h2>
            <Field label="名称">
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              {[
                ["role", "角色描述"],
                ["language", "语言"],
                ["address", "称呼方式"],
                ["tone", "语气"],
                ["formality", "正式程度"],
                ["length", "回答长度"],
                ["depth", "解释深度"],
                ["uncertainty", "不确定信息的表达"],
                ["preferences", "自定义工作偏好"],
              ].map(([k, v]) => (
                <Field key={k} label={v}>
                  <input
                    value={editing.config[k] || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        config: { ...editing.config, [k]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            {[
              ["enabled", "启用人格"],
              ["is_default", "设为默认"],
              ["external_allowed", "允许提供给外部 Agent"],
            ].map(([k, label]) => (
              <label className="check" key={k}>
                <input
                  type="checkbox"
                  checked={editing[k]}
                  onChange={(e) =>
                    setEditing({ ...editing, [k]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
            <label className="check">
              <input
                type="checkbox"
                checked={editing.config.proactive === true}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    config: { ...editing.config, proactive: e.target.checked },
                  })
                }
              />
              主动给出建议
            </label>
            <h3>最终行为文本预览</h3>
            <pre className="persona-preview">
              以下为用户维护的行为偏好，服从客户端系统规则和用户当前明确指令。
              {Object.entries(editing.config)
                .map(
                  ([k, v]) =>
                    "\n" +
                    ({
                      role: "角色",
                      language: "语言",
                      address: "称呼",
                      tone: "语气",
                      formality: "正式程度",
                      length: "回答长度",
                      depth: "解释深度",
                      uncertainty: "不确定信息",
                      preferences: "工作偏好",
                      proactive: "主动建议",
                    }[k] || k) +
                    "：" +
                    String(v),
                )
                .join("")}
            </pre>
            <div className="action-row">
              <Button onClick={() => setEditing(null)}>取消</Button>
              <Button kind="primary" type="submit" disabled={p.busy}>
                保存人格
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
