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

export default function Settings(p: Obj) {
  const { data, error } = useData("/settings", p.refresh),
    [model, setModel] = useState<Obj | null>(null),
    [policy, setPolicy] = useState<Obj | null>(null),
    [restore, setRestore] = useState<Obj | null>(null);
  useEffect(() => {
    if (data) {
      setModel(data.model);
      setPolicy(data.policy);
    }
  }, [data]);
  const download = async (path, name) => {
    let d = await api(path);
    if (path === "/export") {
      const items = [...d.items];
      while (d.next_offset !== null) {
        d = await api("/export?offset=" + d.next_offset);
        items.push(...d.items);
      }
      d = { format: "memory-hub-export-v1", items, next_offset: null };
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  if (!model || !policy) return <Loading error={error} />;
  return (
    <>
      <div className="debug-grid">
        <section className="panel">
          <h2>模型服务</h2>
          <div className="notice">
            生成模型与 Embedding 独立配置。Ollama
            兼容接口；配置为空时，手动管理和中文关键词检索继续可用。
          </div>
          {[
            ["base_url", "服务地址", "http://ollama:11434"],
            ["generation_model", "生成模型名称", "填写已有模型名称"],
            ["embedding_model", "Embedding 模型名称", "填写已有向量模型名称"],
          ].map(([k, l, ph]) => (
            <Field key={k} label={l}>
              <input
                value={model[k]}
                placeholder={ph}
                onChange={(e) => setModel({ ...model, [k]: e.target.value })}
              />
            </Field>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={model.external}
              onChange={(e) =>
                setModel({ ...model, external: e.target.checked })
              }
            />
            此模型服务可能接收数据到外部 / 云端
          </label>
          <div className="action-row">
            <Button
              kind="primary"
              disabled={p.busy}
              onClick={() =>
                p.run(
                  () => send("/settings/model", model, "PUT"),
                  "模型配置已保存，旧向量已失效",
                )
              }
            >
              保存模型配置
            </Button>
            <Button
              disabled={p.busy}
              onClick={() =>
                p.run(
                  () => send("/settings/model/test"),
                  "生成模型连接测试成功",
                )
              }
            >
              测试已保存配置
            </Button>
          </div>
          <p className="muted">
            {data?.generation_configured
              ? "生成模型：已配置（连通性需测试）"
              : "生成模型：未配置"}
            <br />
            关键词索引 {data?.index_count} 条 · 当前向量 {data?.vector_count} 条
          </p>
        </section>
        <section className="panel">
          <h2>写入与保留策略</h2>
          <Field label="记忆写入模式">
            <select
              value={policy.write_mode}
              onChange={(e) =>
                setPolicy({ ...policy, write_mode: e.target.value })
              }
            >
              <option value="manual">仅手动创建</option>
              <option value="review">AI 提出候选，由用户审核（默认）</option>
              <option value="auto">按以下分类与项目自动保存</option>
            </select>
          </Field>
          {policy.write_mode === "auto" && (
            <>
              <div className="notice warn">
                只允许明确用户原文的项目、事件、知识和摘要自动保存，事实与个人资料仍需审核；推断始终为候选。
              </div>
              <h3>自动保存分类</h3>
              <div className="checks">
                {Object.entries(cats)
                  .filter(([k]) => !["profile", "fact"].includes(k))
                  .map(([k, l]) => (
                    <label className="check" key={k}>
                      <input
                        type="checkbox"
                        checked={policy.auto_categories.includes(k)}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            auto_categories: e.target.checked
                              ? [...policy.auto_categories, k]
                              : policy.auto_categories.filter((x) => x !== k),
                          })
                        }
                      />
                      {l as string}
                    </label>
                  ))}
              </div>
              <h3>自动保存项目</h3>
              {p.projects.map((project) => (
                <label className="check" key={project.id}>
                  <input
                    type="checkbox"
                    checked={policy.auto_projects.includes(project.id)}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        auto_projects: e.target.checked
                          ? [...policy.auto_projects, project.id]
                          : policy.auto_projects.filter(
                              (x) => x !== project.id,
                            ),
                      })
                    }
                  />
                  {project.name}
                </label>
              ))}
            </>
          )}
          <Field
            label="新原始记录保留天数"
            hint="0 表示长期保留。仅影响新导入来源；结构化记忆保留最小引用依据。"
          >
            <input
              type="number"
              min="0"
              value={policy.source_retention_days}
              onChange={(e) =>
                setPolicy({ ...policy, source_retention_days: +e.target.value })
              }
            />
          </Field>
          <Field
            label="服务器备份目录的保留天数"
            hint="后台清理 data/backups/*.json；下载到其他设备的备份需自行清理。删除日志需长期保留。"
          >
            <input
              type="number"
              min="1"
              value={policy.backup_retention_days}
              onChange={(e) =>
                setPolicy({ ...policy, backup_retention_days: +e.target.value })
              }
            />
          </Field>
          <Button
            kind="primary"
            disabled={p.busy}
            onClick={() => p.run(() => send("/settings/policy", policy, "PUT"))}
          >
            保存策略
          </Button>
        </section>
      </div>
      <section className="panel spaced">
        <h2>数据导出、备份与恢复</h2>
        <p>
          导出当前授权范围内的记忆；完整备份包含来源、版本、人格、设置和密码校验值，需加密保管。恢复会替换当前数据，撤销全部
          Agent 凭证并结束登录会话。
        </p>
        <div className="action-row">
          <Button
            onClick={() =>
              p.run(
                () => download("/export", "memory-hub-export.json"),
                "授权范围内的记忆已完整导出",
              )
            }
          >
            <Download size={16} />
            导出记忆
          </Button>
          <Button
            onClick={() =>
              p.run(
                () => download("/backup", "memory-hub-backup.json"),
                "备份已下载，请加密保管",
              )
            }
          >
            <Download size={16} />
            下载完整备份
          </Button>
          <label className="btn">
            <Upload size={16} />
            选择恢复文件
            <input
              className="hidden"
              type="file"
              accept=".json"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setRestore(JSON.parse(await f.text()));
                } catch {
                  p.notify("不是有效的 JSON 备份", true);
                }
              }}
            />
          </label>
        </div>
        <div className="notice warn">
          彻底遗忘无法撤回已发送的外部副本。恢复旧备份必须保留
          data/deletion-ledger.jsonl，防止已删除内容重新进入检索。
        </div>
      </section>
      {restore && (
        <div className="overlay front">
          <section className="modal">
            <h2>确认恢复备份</h2>
            <p>
              文件格式：{restore.format}
              <br />
              备份时间：{restore.created_at}
              <br />
              所有者：{restore.owner_id}
            </p>
            <div className="notice warn">
              此操作将替换服务器现有数据。当前删除标记继续生效，所有 Agent
              凭证将撤销。
            </div>
            <div className="action-row">
              <Button onClick={() => setRestore(null)}>取消</Button>
              <Button
                kind="danger"
                disabled={p.busy}
                onClick={async () => {
                  const r = await p.run(
                    () => send("/restore", restore),
                    "恢复完成，请重新登录并创建 Agent 凭证",
                  );
                  if (r) p.onRestored();
                }}
              >
                确认替换并恢复
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
