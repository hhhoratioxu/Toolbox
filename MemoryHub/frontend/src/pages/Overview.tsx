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

export default function Overview(p: Obj) {
  const { data: d, error } = useData("/overview", p.refresh);
  if (!d) return <Loading error={error} />;
  return (
    <>
      <div className="hero-card">
        <div>
          <span className="eyebrow">记忆相连，工作继续</span>
          <h2>把重要的事，留给下一次对话。</h2>
          <p>一个私人空间，连接你的资料、项目与每一位 AI 助手。</p>
          <div className="action-row">
            <Button kind="primary" onClick={() => p.setEditor({})}>
              <Plus size={16} />
              记录一条记忆
            </Button>
            <Button onClick={() => p.setPage("sources")}>
              <Upload size={16} />
              导入资料
            </Button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring ring1" />
          <div className="art-ring ring2" />
          <div className="art-center">
            <Layers3 size={36} />
          </div>
          <span className="art-node n1">
            <FileText />
          </span>
          <span className="art-node n2">
            <Network />
          </span>
          <span className="art-node n3">
            <FolderOpen />
          </span>
        </div>
      </div>
      <div className="stats-grid">
        {[
          [d.active, "有效记忆", "随时可被授权调用", Database],
          [d.candidate, "待审核候选", "由你决定哪些被记住", Inbox],
          [d.projects, "项目空间", "背景与进度持续积累", FolderOpen],
          [d.agents, "有效 Agent 凭证", "每个连接独立授权", Network],
        ].map(([n, label, hint, Icon]: any, i) => (
          <button
            key={label}
            className="stat-card"
            onClick={() =>
              p.setPage(["memories", "review", "projects", "agents"][i])
            }
          >
            <div className="stat-top">
              {label}
              <Icon size={18} />
            </div>
            <strong>{n.toString().padStart(2, "0")}</strong>
            <small>
              {hint}
              <ArrowUpRight size={15} />
            </small>
          </button>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>
              最近的记忆 <span className="count">{d.total}</span>
            </h2>
            <button className="text-btn" onClick={() => p.setPage("memories")}>
              查看全部
              <ArrowRight size={15} />
            </button>
          </div>
          {d.recent.length ? (
            <MemoryRows items={d.recent} openMemory={p.openMemory} />
          ) : (
            <Empty
              title="记忆从第一条开始"
              text="先创建一个项目，再录入背景或导入笔记。"
              action={
                <Button onClick={() => p.setPage("projects")}>
                  创建项目
                  <ArrowRight size={15} />
                </Button>
              }
            />
          )}
        </section>
        <div className="right-stack">
          <section className="panel">
            <div className="section-heading">
              <h2>记忆分布</h2>
              <Layers3 size={17} />
            </div>
            {Object.entries(cats).map(([k, label]) => (
              <div className="distribution" key={k}>
                <div>
                  <span>{label as string}</span>
                  <b>{d.categories[k] || 0}</b>
                </div>
                <div className="bar">
                  <i
                    style={{
                      width:
                        Math.max(
                          3,
                          ((d.categories[k] || 0) / Math.max(1, d.active)) *
                            100,
                        ) + "%",
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
          <section className="quiet-card">
            <ShieldCheck size={23} />
            <h3>每条记忆，都有来处</h3>
            <p>
              原文、修改历史与调用记录可追溯。你可以随时纠正，或让它被彻底遗忘。
            </p>
            <button className="text-btn" onClick={() => p.setPage("debug")}>
              打开检索调试台
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
      </div>
      {d.conflicts > 0 && (
        <div className="notice warn">
          有 {d.conflicts} 组冲突等待处理。
          <button className="text-btn" onClick={() => p.setPage("review")}>
            前往审核
          </button>
        </div>
      )}
    </>
  );
}
