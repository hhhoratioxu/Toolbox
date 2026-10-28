import { Plus, Upload, Sparkles, FileText, Plug, Link2, MoreHorizontal, RefreshCw, Trash2, Eye, X, LoaderCircle, ShieldCheck, CircleAlert, ArrowDownToLine, FolderGit2, Settings2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Source } from '../core/types';
import { formatLabels, kindLabels } from './Shared';
export function SourcePanel({ sources, dataset, setDataset, onImport, onFiles, onToggle, onRemove, onReload, onView, onCancel, onDemo, onDependencies, loading, onClear, onLibrary, onGenerate }: {
  sources: Source[]; dataset: 'demo' | 'user'; setDataset: (v: 'demo' | 'user') => void;
  onImport: () => void; onFiles: (files: FileList | File[]) => void; onToggle: (id: string) => void;
  onRemove: (id: string) => void; onReload: (s: Source) => void; onView: (s: Source) => void;
  onCancel: (id: string) => void; onDemo: () => void; onDependencies: () => void; loading: boolean; onClear: () => void;
  onLibrary: () => void; onGenerate: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null); const [menu, setMenu] = useState<string>(); const [dragging, setDragging] = useState(false);
  const total = sources.reduce((n, s) => n + s.rules.length, 0); const references = sources.flatMap(s => s.references.filter(r => r.enabled));
  const missing = references.filter(r => !sources.some(s => s.url === r.url && s.status === 'ready'));
  return <aside className={`sidebar ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}>
    <div className="source-title"><span>规则工作区</span><span className="tiny-label">LOCAL</span></div>
    <div className="dataset-switch" aria-label="数据工作区"><button className={dataset === 'demo' ? 'active' : ''} onClick={() => setDataset('demo')}>示例数据</button><button className={dataset === 'user' ? 'active' : ''} onClick={() => setDataset('user')}>我的规则</button></div>
    <button className="primary import-main" onClick={onImport}><Plus size={17} />导入规则来源</button>
    <div className="library-entry-buttons"><button onClick={onLibrary}><FolderGit2 size={14} />我的分流库</button><button onClick={onGenerate}><Settings2 size={14} />生成配置</button></div>
    <button className="upload-area" onClick={() => fileRef.current?.click()}><Upload size={20} /><span>拖入文件，或<span className="link-text">点击上传</span></span><small>.list · .txt · .conf · .lpx</small></button>
    <input ref={fileRef} hidden type="file" multiple accept=".lsr,.list,.txt,.conf,.lpx,.plugin,.yaml,.yml" onChange={e => { if (e.target.files) onFiles(e.target.files); e.target.value = ''; }} />
    <div className="source-list-head"><h2>规则来源 <span>{sources.length}</span></h2><span>{total.toLocaleString()} 条规则</span></div>
    <div className="source-list">
      {sources.map(s => { const Icon = s.format === 'loon-plugin' ? Plug : s.url ? Link2 : FileText; return <article key={s.id} className={`source-card ${!s.enabled ? 'disabled-source' : ''}`}>
        <div className="source-card-top"><span className={`source-icon ${s.format === 'loon-config' ? 'config' : ''}`}><Icon size={17} /></span><button className="source-name" onClick={() => onView(s)} title={s.name}>{s.name}</button><button className="icon-button source-more" aria-label={`${s.name} 操作`} aria-expanded={menu === s.id} onClick={() => setMenu(menu === s.id ? undefined : s.id)}><MoreHorizontal size={17} /></button></div>
        <div className="source-meta"><span>{formatLabels[s.format]}</span><span>·</span><span>{s.rules.length.toLocaleString()} 条</span><span className={`load-status ${s.status}`}>{s.status === 'loading' ? <LoaderCircle className="spin" size={11} /> : <i />}{s.status === 'ready' ? '已加载' : s.status === 'loading' ? '加载中' : s.status === 'error' ? '加载失败' : '需检查'}</span></div>
        <div className="source-card-bottom"><span>{kindLabels[s.kind]} {s.demo && <em>示例</em>}</span><button className={`toggle ${s.enabled ? 'on' : ''}`} role="switch" aria-checked={s.enabled} aria-label={`${s.enabled ? '停用' : '启用'} ${s.name}`} onClick={() => onToggle(s.id)}><span /></button></div>
        {s.error && <div className="source-error"><CircleAlert size={13} /><span>{s.error.kind === 'cors-or-network' ? 'CORS / 网络错误' : s.error.message}</span></div>}
        {!!s.diagnostics.length && <button className="source-warning" onClick={() => onView(s)}>{s.diagnostics.length} 项解析提示 <span>查看</span></button>}
        {menu === s.id && <div className="source-menu"><button onClick={() => { onView(s); setMenu(undefined); }}><Eye size={14} />查看原文与信息</button><button onClick={() => { onReload(s); setMenu(undefined); }}><RefreshCw size={14} />{s.url && !s.demo ? '刷新远程内容' : '重新解析原文'}</button>{s.status === 'loading' && <button onClick={() => { onCancel(s.id); setMenu(undefined); }}><X size={14} />取消加载</button>}<button className="danger-text" onClick={() => { onRemove(s.id); setMenu(undefined); }}><Trash2 size={14} />移除此来源</button></div>}
      </article>; })}
      {!sources.length && <div className="source-empty"><FileText size={26} /><p>还没有规则来源</p><small>粘贴、上传或添加远程地址<br />从第一份规则开始</small></div>}
    </div>
    {!!missing.length && <button className="dependency-button" disabled={loading} onClick={onDependencies}><ArrowDownToLine size={15} />加载 {missing.length} 个未就绪的引用</button>}
    <button className="demo-button" onClick={onDemo}><Sparkles size={16} /><span>{dataset === 'demo' ? '恢复内置示例' : '体验内置示例'}</span><span>↗</span></button>
    <div className="sidebar-bottom"><div><ShieldCheck size={15} /><span>在你的浏览器中处理</span></div><p>配置和查询不会上传。用户文件缓存在此浏览器，示例独立存放。</p>{dataset === 'user' && !!sources.length && <button className="text-button" onClick={onClear}><Trash2 size={12} />清除此工作区数据</button>}</div>
    {dragging && <div className="drop-overlay"><Upload size={32} /><strong>松开以导入文件</strong></div>}
  </aside>;
}
