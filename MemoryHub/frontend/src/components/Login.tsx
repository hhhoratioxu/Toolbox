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

export default function Login({ onLogin, notify, toast }: Obj) {
  const [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <div className="logo">
            <Layers3 />
          </div>
          Memory Hub
        </div>
        <span className="eyebrow">YOUR CONTEXT, CONTINUED.</span>
        <h1>
          对话可以结束。
          <br />
          记忆，继续生长。
        </h1>
        <p>
          将资料、项目与决定保存在自己的服务器。
          <br />
          让下一次协作，从已经知道的地方开始。
        </p>
        <div className="orbital">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="orb-core">
            <Layers3 size={44} />
          </div>
          <span className="orbit-label l1">偏好</span>
          <span className="orbit-label l2">项目</span>
          <span className="orbit-label l3">决定</span>
        </div>
      </div>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await send("/login", { username, password });
            await onLogin();
          } catch (e) {
            notify((e as Error).message, true);
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="eyebrow">PRIVATE MEMORY SPACE</div>
        <h2>回到你的记忆空间</h2>
        <p>使用服务器初始化时创建的管理员账户登录。</p>
        <Field label="用户名">
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>
        <Field label="密码">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" kind="primary" disabled={loading}>
          {loading ? "正在登录…" : "进入 Memory Hub"}
          <ArrowRight size={17} />
        </Button>
        <div className="login-hint">
          <ShieldCheck size={17} />
          独立凭证 · 授权访问 · 可追溯来源
        </div>
        {toast?.error && <div className="notice warn">{toast.message}</div>}
      </form>
    </div>
  );
}
