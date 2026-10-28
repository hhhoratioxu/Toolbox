import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Download, ExternalLink, FolderGit2, LoaderCircle, Plus, RefreshCw, Search, Settings2, X } from 'lucide-react';
import { Modal } from './Shared';
import { categories, clientNames, entries, libraryClients, rawURL, REPOSITORY } from '../library/catalog';
import type { CatalogSnapshot, LibraryClient } from '../library/catalog';
import { generateAll, generateConfig } from '../library/generator';
import type { GeneratedConfig, HTTPNode, RuleChoice, RulePolicy } from '../library/generator';
import { downloadFile } from '../services/export';

export function LibraryDialog({ snapshot, origin, busy, error, initialTab, choices, onChoices, onClose, onRefresh, onCancel, onAdd, onSimulate, onCopy }: {
  snapshot: CatalogSnapshot; origin: 'bundled' | 'cache' | 'live'; busy: boolean; error: string;
  initialTab: 'catalog' | 'generate'; choices: RuleChoice[]; onChoices: (next: RuleChoice[]) => void;
  onClose: () => void; onRefresh: () => Promise<void>; onCancel: () => void;
  onAdd: (names: string[]) => Promise<void>; onSimulate: (file: GeneratedConfig) => Promise<void>;
  onCopy: (text: string) => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [client, setClient] = useState<LibraryClient>('Loon');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [localError, setLocalError] = useState('');
  const [finalPolicy, setFinalPolicy] = useState<RulePolicy>('DIRECT');
  const [interval, setInterval] = useState(86400);
  const [mode, setMode] = useState<'full' | 'snippet'>('full');
  const [nodeEnabled, setNodeEnabled] = useState(false);
  const [node, setNode] = useState<HTTPNode>({ server: '', port: '', username: '', password: '' });
  const currentEntries = entries(snapshot, client);
  const visible = currentEntries.filter(e => e.category.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = new Set(choices.map(c => c.category));
  const knownCategories = categories(snapshot);
  const lost = choices.filter(c => !knownCategories.includes(c.category));
  const options = { choices, finalPolicy, interval, mode, node: nodeEnabled && mode === 'full' ? node : undefined };
  const preview = useMemo(() => {
    try { return { file: generateConfig(snapshot, { ...options, client }) }; }
    catch (e) { return { error: e instanceof Error ? e.message : '配置生成失败' }; }
  }, [snapshot, client, choices, finalPolicy, interval, mode, nodeEnabled, node]);

  const toggle = (category: string) => onChoices(selected.has(category) ? choices.filter(c => c.category !== category) : [...choices, { category, policy: 'DIRECT' }]);
  const policy = (category: string, value: RulePolicy) => onChoices(choices.map(c => c.category === category ? { ...c, policy: value } : c));
  const move = (index: number, distance: number) => {
    const next = [...choices]; [next[index], next[index + distance]] = [next[index + distance], next[index]]; onChoices(next);
  };
  const add = async () => {
    setAdding(true); setLocalError('');
    try { await onAdd(choices.map(c => c.category)); onClose(); }
    catch (e) { setLocalError(e instanceof Error ? e.message : '添加失败'); }
    finally { setAdding(false); }
  };
  const zip = () => {
    try {
      const bytes = generateAll(snapshot, options);
      const url = URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }));
      const a = document.createElement('a'); a.href = url; a.download = 'RuleFinder-六客户端配置.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setLocalError('');
    } catch (e) { setLocalError(e instanceof Error ? e.message : '批量生成失败'); }
  };
  return <Modal title="我的分流库" subtitle={`${REPOSITORY} · 从 GitHub 动态读取目录，更新后可同步已添加规则。`} onClose={onClose} wide>
    <div className="library-sync">
      <div><FolderGit2 size={19} /><div><strong>{knownCategories.length} 个分类 · {snapshot.files.length} 个原生文件</strong><span>{origin === 'live' ? (snapshot.delivery === 'published' ? '已读取仓库自动目录' : '已在线检查') : origin === 'cache' ? '本地缓存目录' : '内置目录快照'} · {new Date(snapshot.checkedAt).toLocaleString('zh-CN', { hour12: false })} · {snapshot.commit.slice(0, 7)}</span></div></div>
      {busy ? <button className="secondary small" onClick={onCancel}><X size={13} />取消更新</button> : <button className="primary small" onClick={() => void onRefresh()} disabled={adding}><RefreshCw size={13} />更新规则库</button>}
    </div>
    <p className="library-refresh-note">更新目录时同步已添加且有变化的规则。分流库提交后会自动重建目录；刚提交时请等目录构建完成后再更新。删除来源保留旧原文并标为不可用。</p>
    {busy && <div className="library-progress"><LoaderCircle size={13} className="spin" />正在读取仓库版本并同步规则…</div>}
    {error && <div className="library-error" role="alert">更新失败，当前仍显示上一次目录：{error}</div>}
    <div className="import-tabs library-tabs"><button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}><FolderGit2 size={15} />选择分流规则</button><button className={tab === 'generate' ? 'active' : ''} onClick={() => setTab('generate')}><Settings2 size={15} />生成代理配置</button></div>
    <div className="library-content">
      <div className="library-clients" aria-label="规则与配置客户端">{libraryClients.map(c => <button key={c} className={client === c ? 'active' : ''} onClick={() => setClient(c)}>{clientNames[c]}<span>{entries(snapshot, c).length}</span></button>)}</div>
      {tab === 'catalog' ? <>
        <div className="catalog-toolbar"><label className="catalog-search"><Search size={14} /><input aria-label="搜索规则分类" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索 AI、Apple、Spotify…" /></label><button className="text-button" onClick={() => onChoices([...choices, ...visible.filter(e => e.supported && !selected.has(e.category)).map(e => ({ category: e.category, policy: 'DIRECT' as const }))])}>全选当前筛选</button><button className="text-button" onClick={() => onChoices([])}>清空选择</button></div>
        <div className="catalog-list">{visible.map(e => <div className={`catalog-row ${selected.has(e.category) ? 'selected' : ''}`} key={e.path}>
          <label><input type="checkbox" checked={selected.has(e.category)} disabled={!e.supported} onChange={() => toggle(e.category)} aria-label={`选择 ${e.category}`} /><span><strong>{e.category}</strong><code>{e.path}</code></span></label>
          <span className="catalog-size">{e.supported ? `${(e.size / 1024).toFixed(1)} KB` : '格式尚未支持'}</span><a href={rawURL(e)} target="_blank" rel="noreferrer" aria-label={`查看 ${e.category} 原生文件`}><ExternalLink size={14} /></a>
        </div>)}{!visible.length && <div className="empty-results"><Search size={25} /><h3>没有符合筛选的分类</h3><p>可以清空关键词，或更新规则库目录。</p></div>}</div>
        <div className="library-scope-note"><Check size={14} /><p>分类选择跨客户端保留。添加到诊断工作区时，明确下载对应的 <b>Loon 原生版本</b>；生成配置使用所选软件的原生文件，不改变当前的 Loon 模拟支持范围。</p></div>
      </> : <>
        <div className="generator-options"><label>生成内容<select value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="full">完整基础配置</option><option value="snippet">分流片段（合入现有配置）</option></select></label><label>兜底策略<PolicySelect value={finalPolicy} onChange={setFinalPolicy} label="兜底策略" /></label><label>订阅更新间隔<select value={interval} onChange={e => setInterval(+e.target.value)}><option value={3600}>1 小时</option><option value={21600}>6 小时</option><option value={86400}>24 小时</option><option value={604800}>7 天</option></select></label></div>
        <p className="generator-note">配置引用 main 分支，客户端刷新规则订阅即可获得内容修改。库里新增分类后，请更新目录并重新选择生成。Loon / Shadowrocket 的更新周期由客户端管理。</p>
        {mode === 'full' && <details className="node-options"><summary>代理节点（可选，只保存在当前页面内存）</summary><label className="checkbox-label"><input type="checkbox" checked={nodeEnabled} onChange={e => setNodeEnabled(e.target.checked)} />加入我自己的 HTTP 代理节点</label>{nodeEnabled && <div className="node-fields"><label>服务器<input value={node.server} onChange={e => setNode({ ...node, server: e.target.value })} placeholder="填写真实代理地址" /></label><label>端口<input value={node.port} onChange={e => setNode({ ...node, port: e.target.value })} placeholder="例如 8080" inputMode="numeric" /></label><label>用户名（可选）<input autoComplete="off" value={node.username} onChange={e => setNode({ ...node, username: e.target.value })} /></label><label>密码（可选）<input type="password" autoComplete="new-password" value={node.password} onChange={e => setNode({ ...node, password: e.target.value })} /></label></div>}<p>未填写节点时，节点选择组只包含 DIRECT。工具不会提供或猜测代理节点；其他节点协议可在客户端自行添加。</p></details>}
        <div className="generator-plan-head"><strong>规则顺序与策略 · {choices.length} 项</strong><button className="text-button" onClick={() => setTab('catalog')}><Plus size={12} />继续选择</button><button className="text-button" onClick={() => onChoices(choices.map(c => ({ ...c, policy: 'GROUP' })))}>全部设为节点选择</button></div>
        <div className="generator-plan">{choices.map((c, i) => <div key={c.category}><span>{i + 1}</span><strong>{c.category}</strong><PolicySelect value={c.policy} onChange={value => policy(c.category, value)} label={`${c.category} 策略`} /><button className="icon-button" disabled={i === 0} aria-label={`上移 ${c.category}`} onClick={() => move(i, -1)}><ArrowUp size={13} /></button><button className="icon-button" disabled={i === choices.length - 1} aria-label={`下移 ${c.category}`} onClick={() => move(i, 1)}><ArrowDown size={13} /></button><button className="icon-button" aria-label={`取消选择 ${c.category}`} onClick={() => toggle(c.category)}><X size={13} /></button></div>)}</div>
        <p className="generator-note">新选择的分类默认 DIRECT，请按需修改策略；不会从分类名推断。可用上下按钮调整顺序。跨客户端的顺序、支持条件与实际行为仍各自不同。</p>
        {preview.file ? <><div className="config-preview-head"><code>{preview.file.filename}</code><button className="text-button" onClick={() => onCopy(preview.file!.content)}><Copy size={12} />复制配置</button></div><pre className="config-preview" tabIndex={0}>{preview.file.content}</pre>{preview.file.warnings.map((w, i) => <p className="config-warning" key={i}>{w}</p>)}</> : <div className="info-box">{preview.error}</div>}
      </>}
      {!!lost.length && <div className="library-error">已选分类已从仓库移除：{lost.map(c => c.category).join('、')}。<button onClick={() => onChoices(choices.filter(c => knownCategories.includes(c.category)))}>移除失效选择</button></div>}
      {localError && <div className="form-error" role="alert">{localError}</div>}
    </div>
    <div className="modal-footer library-footer"><span>已选 {choices.length} 个分类 · {clientNames[client]}</span>{tab === 'catalog' ? <><button className="secondary" onClick={() => setTab('generate')}>生成配置</button><button className="primary" disabled={!choices.length || busy || adding} onClick={() => void add()}>{adding ? <LoaderCircle size={14} className="spin" /> : <Plus size={14} />}添加 Loon 版本到查询</button></> : <><button className="secondary" onClick={zip} disabled={!choices.length || busy}><Download size={14} />下载六端 ZIP</button>{client === 'Loon' && mode === 'full' && <button className="secondary" disabled={!preview.file || adding || busy} onClick={async () => { setAdding(true); try { await onSimulate(preview.file!); onClose(); } catch (e) { setLocalError(e instanceof Error ? e.message : '导入失败'); } finally { setAdding(false); } }}>放入配置模拟</button>}<button className="primary" disabled={!preview.file || busy} onClick={() => downloadFile(preview.file!.filename, preview.file!.content)}><Download size={14} />下载当前配置</button></>}</div>
  </Modal>;
}
function PolicySelect({ value, onChange, label = '策略绑定' }: { value: RulePolicy; onChange: (value: RulePolicy) => void; label?: string }) {
  return <select aria-label={label} value={value} onChange={e => onChange(e.target.value as RulePolicy)}><option value="DIRECT">DIRECT · 直连</option><option value="REJECT">REJECT · 拒绝</option><option value="GROUP">节点选择 · 策略组</option></select>;
}
