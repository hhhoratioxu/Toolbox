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

export default function Projects(p: Obj) {
  const [editing, setEditing] = useState<Obj | null>(null);
  return (
    <>
      <div className="section-heading">
        <h2>
          我的项目 <span className="count">{p.projects.length}</span>
        </h2>
        <Button
          onClick={() =>
            setEditing({ name: "", description: "", status: "active" })
          }
        >
          <Plus size={16} />
          创建项目
        </Button>
      </div>
      {!p.projects.length ? (
        <section className="panel">
          <Empty
            title="给你的长期任务一个空间"
            text="项目描述用于简短介绍。目标、约束、关键决策和待办请保存为可追溯的项目记忆。"
            action={
              <Button
                kind="primary"
                onClick={() =>
                  setEditing({ name: "", description: "", status: "active" })
                }
              >
                创建第一个项目
              </Button>
            }
          />
        </section>
      ) : (
        <div className="project-grid">
          {p.projects.map((project) => (
            <section className="panel project-card" key={project.id}>
              <div className="project-top">
                <div className="type-icon project">
                  <FolderOpen />
                </div>
                <Badge value={project.status} />
              </div>
              <h2>{project.name}</h2>
              <p>{project.description || "尚未填写项目介绍"}</p>
              <small className="mono">{project.id}</small>
              <div className="action-row">
                <Button
                  onClick={() => {
                    p.setFilterProject(project.id);
                    p.setPage("memories");
                  }}
                >
                  记忆与时间线
                </Button>
                <Button
                  kind="primary"
                  onClick={() => {
                    p.setFilterProject(project.id);
                    p.setPage("debug");
                  }}
                >
                  生成继续工作上下文
                  <ArrowUpRight size={15} />
                </Button>
                <Button onClick={() => setEditing(project)}>编辑</Button>
              </div>
            </section>
          ))}
        </div>
      )}
      {editing && (
        <div className="overlay front">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = {
                name: editing.name,
                description: editing.description,
                status: editing.status,
              };
              const r = await p.run(() =>
                editing.id
                  ? send(
                      "/projects/" + editing.id,
                      { ...d, expected_version: editing.version },
                      "PUT",
                    )
                  : send("/projects", d),
              );
              if (r) setEditing(null);
            }}
          >
            <h2>{editing.id ? "编辑项目" : "创建项目"}</h2>
            <Field label="项目名称">
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <Field label="简短介绍（授权项目的 Agent 可见）">
              <textarea
                rows={4}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </Field>
            <Field label="状态">
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                {[
                  ["active", "进行中"],
                  ["paused", "暂停"],
                  ["completed", "已完成"],
                  ["archived", "归档"],
                ].map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <div className="action-row">
              <Button onClick={() => setEditing(null)}>取消</Button>
              <Button type="submit" kind="primary" disabled={p.busy}>
                保存项目
              </Button>
              {editing.id && (
                <Button
                  kind="danger"
                  onClick={async () => {
                    const r = await p.run(
                      () =>
                        api(
                          "/projects/" +
                            editing.id +
                            "?expected_version=" +
                            editing.version,
                          { method: "DELETE" },
                        ),
                      "项目已删除",
                    );
                    if (r) setEditing(null);
                  }}
                >
                  删除空项目
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
