import { ClipboardPaste, Link2, FileUp, Plus, LoaderCircle, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { Modal } from './Shared';
export interface PasteImport { name: string; content: string; url?: string; hint: 'auto' | 'config' | 'plugin' }
export function ImportDialog({ onClose, onPaste, onRemote, onFiles, initialURL = '' }: {
  onClose: () => void; onPaste: (value: PasteImport) => Promise<void>; onRemote: (url: string) => Promise<void>;
  onFiles: (files: FileList | File[]) => void; initialURL?: string;
}) {
  const [tab, setTab] = useState<'paste' | 'remote' | 'file'>('paste');
  const [name, setName] = useState(''); const [content, setContent] = useState(''); const [url, setURL] = useState(initialURL); const [hint, setHint] = useState<PasteImport['hint']>('auto');
  const [binding, setBinding] = useState(initialURL); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const input = useRef<HTMLInputElement>(null);
  const submit = async () => { setBusy(true); setError(''); try { if (tab === 'remote') await onRemote(url); else await onPaste({ name: name.trim() || (hint === 'config' ? '粘贴的配置.conf' : '粘贴的规则.list'), content, url: binding.trim() || undefined, hint }); onClose(); } catch (e) { setError(e instanceof Error ? e.message : '导入失败'); } finally { setBusy(false); } };
  return <Modal title="导入规则来源" subtitle="保留完整原文、注释和原始行号，所有解析都在本地进行。" onClose={onClose}>
    <div className="import-tabs">{([{ key: 'paste', label: '粘贴文本', icon: ClipboardPaste }, { key: 'remote', label: '远程 URL', icon: Link2 }, { key: 'file', label: '本地文件', icon: FileUp }] as const).map(t => <button className={tab === t.key ? 'active' : ''} key={t.key} onClick={() => { setTab(t.key); setError(''); }}><t.icon size={16} />{t.label}</button>)}</div>
    <div className="modal-body">
      {tab === 'paste' && <><div className="form-row"><label>来源名称<input value={name} onChange={e => setName(e.target.value)} placeholder="例如：工作规则.list" /></label><label>识别方式<select value={hint} onChange={e => setHint(e.target.value as PasteImport['hint'])}><option value="auto">自动识别</option><option value="config">Loon 主配置</option><option value="plugin">Loon 插件</option></select></label></div><label>规则或配置原文<textarea className="code-input" rows={10} autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder={'# 支持原始注释与空行\nDOMAIN-SUFFIX,example.com\nIP-CIDR,203.0.113.0/24,no-resolve'} spellCheck={false} /></label><label>对应的规则引用 URL <span className="muted">（可选）</span><input value={binding} onChange={e => setBinding(e.target.value)} placeholder="用于替代加载失败的远程引用，需与配置中的 URL 一致" /></label></>}
      {tab === 'remote' && <><label>规则文件地址<input autoFocus value={url} onChange={e => setURL(e.target.value)} placeholder="https://raw.githubusercontent.com/…/rules.list" onKeyDown={e => { if (e.key === 'Enter' && url.trim()) void submit(); }} /></label><div className="info-box"><Info size={17} /><div><strong>只请求这份规则资源</strong><p>支持 GitHub Raw；标准 blob 链接会转成 Raw。15 秒超时，单文件上限 5 MiB。跨域失败时可切换到粘贴或上传。</p></div></div><label>或为离线文件绑定引用地址<input value={binding} onChange={e => setBinding(e.target.value)} placeholder="切换到粘贴文本时使用此地址" /></label></>}
      {tab === 'file' && <div className="file-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); onClose(); }}><FileUp size={34} /><h3>把多个文件拖到这里</h3><p>.list / .txt / .conf / .lpx / .plugin</p><button className="secondary" onClick={() => input.current?.click()}>选择本地文件</button><small>YAML 文件会保留原文，并标记为尚未支持。</small><input ref={input} hidden type="file" multiple accept=".lsr,.list,.txt,.conf,.lpx,.plugin,.yaml,.yml" onChange={e => { if (e.target.files?.length) { onFiles(e.target.files); onClose(); } }} /></div>}
      {error && <div className="form-error" role="alert">{error}</div>}
    </div>
    <div className="modal-footer"><span><ShieldSmall />仅保存在此浏览器</span><button className="secondary" onClick={onClose}>取消</button>{tab !== 'file' && <button className="primary" onClick={() => void submit()} disabled={busy || (tab === 'paste' ? !content.trim() : !url.trim())}>{busy ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}添加来源</button>}</div>
  </Modal>;
}
function ShieldSmall() { return <span className="privacy-dot" />; }
