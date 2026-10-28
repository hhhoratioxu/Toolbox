import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Moon, Sun, Github, HelpCircle, ArrowRight, SlidersHorizontal, ChevronDown, X, Download, LoaderCircle, List, AlignLeft, ShieldCheck, Command, Sparkles, Globe2, CheckCircle2, CircleAlert, FileSearch } from 'lucide-react';
import type { Conditions, QueryResult, Source, SourceDraft } from './core/types';
import { stableHash } from './core/syntax';
import { adapters } from './core/adapters';
import { createDemo, sampleTargets } from './examples';
import { engineWorker } from './services/worker';
import type { QueryItem, TextHit } from './services/worker';
import { readSources, saveSources } from './services/storage';
import { LoadError, loadRemote, MAX_BYTES, normalizeRemoteURL } from './services/remote';
import { downloadFile, toCSV } from './services/export';
import { SourcePanel } from './components/SourcePanel';
import { ImportDialog } from './components/ImportDialog';
import type { PasteImport } from './components/ImportDialog';
import { RuleViewer } from './components/RuleViewer';
import type { ViewerSelection } from './components/RuleViewer';
import { SupportDialog } from './components/SupportDialog';
import { ResultSummary, ResultTable, TextResults } from './components/Results';
import { Modal } from './components/Shared';

const MAX_SOURCES = 40; const MAX_TOTAL = 30 * 1024 * 1024;
export default function App() {
  const [demos, setDemos] = useState(createDemo); const [users, setUsers] = useState<Source[]>([]); const userRef = useRef(users); userRef.current = users;
  const [hydrated, setHydrated] = useState(false); const [dataset, setDataset] = useState<'demo' | 'user'>('demo');
  const sources = dataset === 'demo' ? demos : users;
  const [mode, setMode] = useState<QueryResult['mode']>('simulate');
  const [queryType, setQueryType] = useState<'match' | 'text'>('match'); const [input, setInput] = useState('api.example.com');
  const [batch, setBatch] = useState(false); const [advanced, setAdvanced] = useState(false); const [conditions, setConditions] = useState<Conditions>({});
  const [configId, setConfigId] = useState(''); const [lastInputs, setLastInputs] = useState(['api.example.com']); const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<QueryItem[]>([]); const [hits, setHits] = useState<TextHit[]>([]); const [activeResult, setActiveResult] = useState(0); const [queryBusy, setQueryBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false); const [replacementURL, setReplacementURL] = useState(''); const [supportOpen, setSupportOpen] = useState(false); const [viewer, setViewer] = useState<ViewerSelection>();
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [dependencyBusy, setDependencyBusy] = useState(false); const [confirmClear, setConfirmClear] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('rf-theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } });
  const controllers = useRef(new Map<string, AbortController>()); const requestId = useRef(0); const queryRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const configs = sources.filter(s => s.format === 'loon-config'); const current = results[activeResult];
  const notify = useCallback((message: string) => setNotice(message), []);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('rf-theme', theme); } catch { /* Theme still works for this session. */ } }, [theme]);
  useEffect(() => { let active = true; readSources().then(saved => { if (active) setUsers(saved.map(s => s.status === 'loading' ? { ...s, status: 'error', error: { kind: 'cancelled', message: '上次加载未完成，请重新加载。' } } : s)); }).catch(() => notify('浏览器存储不可用，当前会话仍可使用，但刷新后不会保存。')).finally(() => { if (active) setHydrated(true); }); return () => { active = false; }; }, [notify]);
  useEffect(() => { if (!hydrated) return; const timer = setTimeout(() => { void saveSources(users).catch(() => notify('本地缓存写入失败，当前数据仍可使用；可下载原文备份。')); }, 350); return () => clearTimeout(timer); }, [users, hydrated, notify]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { setViewer(undefined); setConfigId(''); setActiveResult(0); }, [dataset]);
  useEffect(() => {
    const id = ++requestId.current; setQueryBusy(true);
    const compute = async () => {
      await engineWorker.sync(sources);
      if (queryType === 'text') { const found = await engineWorker.search(searchTerm); if (id === requestId.current) setHits(found); }
      else { const found = await engineWorker.query(lastInputs, mode, conditions, configId); if (id === requestId.current) { setResults(found); setActiveResult(v => Math.min(v, Math.max(0, found.length - 1))); } }
    };
    void compute().catch(e => { if (id === requestId.current) setError(e.message); }).finally(() => { if (id === requestId.current) setQueryBusy(false); });
    return () => { requestId.current++; };
  }, [sources, mode, conditions, configId, lastInputs, searchTerm, queryType]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); queryRef.current?.focus(); } }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);
  const updateSource = (id: string, update: (s: Source) => Source) => { const setter = dataset === 'demo' ? setDemos : setUsers; setter(prev => prev.map(s => s.id === id ? update(s) : s)); };
  const upsertUser = (source: Source) => {
    const previous = userRef.current; const index = previous.findIndex(s => s.id === source.id || (source.url && s.url === source.url));
    if (index < 0 && previous.length >= MAX_SOURCES) throw new Error('工作区最多保留 40 个来源。');
    const next = index < 0 ? [...previous, source] : previous.map((s, i) => i === index ? source : s);
    userRef.current = next; setUsers(next);
  };
  const checkCapacity = (content: string, replacingURL?: string) => {
    if (new TextEncoder().encode(content).length > MAX_BYTES) throw new Error('单文件上限为 5 MiB，请拆分后导入。');
    const others = userRef.current.filter(s => !replacingURL || s.url !== replacingURL);
    if (others.length >= MAX_SOURCES) throw new Error('工作区最多保留 40 个来源，请先移除不用的来源。');
    if (others.reduce((n, s) => n + s.content.length * 2, 0) + content.length * 2 > MAX_TOTAL) throw new Error('工作区原文总大小上限约 30 MiB，请移除不用的来源。');
  };
  const onPaste = async (value: PasteImport) => {
    if (!value.content.trim()) throw new Error('请粘贴规则内容。');
    const url = value.url ? normalizeRemoteURL(value.url) : undefined;
    checkCapacity(value.content, url);
    const source = await engineWorker.parse({ id: url ? `remote-${stableHash(url)}` : crypto.randomUUID(), name: value.name, content: value.content, url, kind: url ? 'subscription' : 'local', origin: 'paste', formatHint: value.hint });
    source.modified = !!url; upsertUser(source); setDataset('user'); setError('');
    if (source.format === 'loon-config') setMode('simulate'); else if (!userRef.current.some(s => s.format === 'loon-config')) setMode('library');
    notify(`已导入 ${source.rules.length} 条规则${source.references.length ? `，识别 ${source.references.length} 个引用` : ''}`);
  };
  const loadURL = async (rawURL: string, existing?: Source, dependencyKind?: Source['kind']): Promise<Source> => {
    const url = normalizeRemoteURL(rawURL); const id = existing?.id ?? `remote-${stableHash(url)}`;
    checkCapacity('', url);
    controllers.current.get(id)?.abort(); const controller = new AbortController(); controllers.current.set(id, controller);
    const placeholder: Source = { id, name: existing?.name ?? new URL(url).pathname.split('/').at(-1) ?? '远程规则', client: 'loon', content: existing?.content ?? '', format: existing?.format ?? 'loon-rules', origin: 'remote', url, kind: dependencyKind ?? existing?.kind ?? 'subscription', rules: existing?.rules ?? [], references: existing?.references ?? [], groups: existing?.groups ?? [], diagnostics: existing?.diagnostics ?? [], loadedAt: existing?.loadedAt, status: 'loading', enabled: existing?.enabled ?? true, demo: false };
    upsertUser(placeholder);
    try {
      const content = await loadRemote(url, controller.signal); checkCapacity(content, url);
      const source = await engineWorker.parse({ ...placeholder, content, formatHint: dependencyKind === 'plugin' ? 'plugin' : 'auto' } as SourceDraft);
      source.enabled = existing?.enabled ?? true;
      if (source.status === 'unsupported') { source.error = { kind: 'format', message: '已下载原文，但不是首版支持的 Loon 规则格式。可查看原文与解析提示。' }; }
      if (controllers.current.get(id) === controller) upsertUser(source);
      return source;
    } catch (e) {
      const failed: Source = { ...placeholder, status: 'error', error: { kind: e instanceof LoadError ? e.kind : 'format', message: e instanceof Error ? e.message : '加载失败' } };
      if (controllers.current.get(id) === controller) upsertUser(failed);
      return failed;
    } finally { if (controllers.current.get(id) === controller) controllers.current.delete(id); }
  };
  const onRemote = async (url: string) => { setDataset('user'); const s = await loadURL(url); if (s.error) throw new Error(s.error.message); if (s.format === 'loon-config') setMode('simulate'); else if (!userRef.current.some(item => item.format === 'loon-config')) setMode('library'); notify(`远程来源已加载：${s.rules.length} 条规则`); };
  const onFiles = async (files: FileList | File[]) => {
    setDataset('user'); setError(''); let count = 0;
    for (const file of Array.from(files).slice(0, MAX_SOURCES)) {
      try {
        if (file.size > MAX_BYTES) throw new Error(`${file.name} 超过 5 MiB`);
        let content: string; try { content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); } catch { throw new Error(`${file.name} 不是 UTF-8 文本`); }
        if (content.includes('\0')) throw new Error(`${file.name} 可能是二进制文件，暂不支持`);
        checkCapacity(content); const source = await engineWorker.parse({ id: crypto.randomUUID(), name: file.name, filename: file.name, content, origin: 'file' });
        upsertUser(source); count++;
        if (source.format === 'loon-config') setMode('simulate'); else if (!userRef.current.some(s => s.format === 'loon-config')) setMode('library');
      } catch (e) { setError(e instanceof Error ? e.message : '文件导入失败'); }
    }
    if (count) notify(`已导入 ${count} 个文件，原文与行号已保留`);
  };
  const loadDependencies = async () => {
    if (dataset === 'demo') { notify('示例引用均为离线资源；恢复示例可重新载入。'); return; }
    setDependencyBusy(true); const visited = new Set<string>(); let queue = userRef.current.flatMap(s => s.enabled ? s.references.filter(r => r.enabled) : []); let processed = 0;
    try {
      while (queue.length && processed < 30) {
        const chunk = queue.splice(0, 3).filter(ref => !visited.has(ref.url) && !ref.issue && !userRef.current.some(s => s.url === ref.url && s.status === 'ready'));
        for (const ref of chunk) visited.add(ref.url);
        const loaded = await Promise.all(chunk.map(ref => loadURL(ref.url, userRef.current.find(s => s.url === ref.url), ref.kind)));
        processed += chunk.length; for (const source of loaded) if (source.status === 'ready') queue.push(...source.references.filter(r => r.enabled));
      }
      notify(processed ? `完成 ${processed} 个依赖的加载尝试；失败项已在来源列表标出` : '没有需要加载的依赖，或引用参数需先修正');
    } catch (e) { setError(e instanceof Error ? e.message : '引用加载失败'); } finally { setDependencyBusy(false); }
  };
  const reload = async (s: Source) => {
    if (s.url && !s.demo && /^https?:/.test(s.url)) { const result = await loadURL(s.url, s); notify(result.error ? result.error.message : '远程内容已刷新'); }
    else { const parsed = await engineWorker.parse({ ...s, formatHint: s.format === 'loon-plugin' ? 'plugin' : s.format === 'loon-config' ? 'config' : 'auto' }); updateSource(s.id, () => ({ ...parsed, enabled: s.enabled })); notify('原文已重新解析'); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); notify('已复制到剪贴板'); } catch { notify('浏览器未授予剪贴板权限，请在原文中手动选择复制。'); } };
  const run = () => {
    setError('');
    if (!input.trim()) { setError('请输入需要查询的目标。'); queryRef.current?.focus(); return; }
    if (queryType === 'text') { setSearchTerm(input.trim()); return; }
    const lines = batch ? input.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [input.trim()];
    if (lines.length > 200) { setError('单次最多查询 200 个目标，请分批执行。'); return; }
    setActiveResult(0); setLastInputs(lines);
  };
  const clear = () => { setInput(''); setLastInputs([]); setSearchTerm(''); setError(''); queryRef.current?.focus(); };
  const exportResults = (format: 'json' | 'csv') => downloadFile(`rule-finder-${new Date().toISOString().slice(0, 10)}.${format}`, format === 'json' ? JSON.stringify({ tool: 'Rule Finder', version: 1, exportedAt: new Date().toISOString(), scope: '本地静态规则模拟，非客户端实测', results }, null, 2) : toCSV(results), format === 'json' ? 'application/json' : 'text/csv;charset=utf-8');
  const showDemo = () => { setDemos(createDemo()); setDataset('demo'); setMode('simulate'); setQueryType('match'); setInput('api.example.com'); setLastInputs(['api.example.com']); setConditions({}); notify('内置示例已恢复，用户规则独立保留'); };
  return <div className="app-shell">
    <header className="app-header"><a className="brand" href={import.meta.env.BASE_URL} aria-label="分流规则定位器首页"><span className="brand-mark"><Search size={24} strokeWidth={2.2} /><i /></span><span><strong>分流规则定位器</strong><small>RULE FINDER</small></span><span className="version">1.0</span></a><div className="header-center"><span className="client-label">客户端</span><div className="client-select"><select aria-label="客户端">{adapters.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={13} /></div><span className="header-divider" /><div className="mode-switch" aria-label="工作模式"><button className={mode === 'library' ? 'active' : ''} onClick={() => setMode('library')}><LayersIcon />规则库检索</button><button className={mode === 'simulate' ? 'active' : ''} onClick={() => setMode('simulate')}><GitIcon />配置模拟</button></div></div><nav className="header-actions"><button className="help-button" aria-label="支持范围" onClick={() => setSupportOpen(true)}><HelpCircle size={17} /><span>支持范围</span></button><span className="header-divider" /><button className="icon-button" title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'} aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><a className="icon-button github-link" href="https://github.com/hhhoratioxu/Toolbox/tree/main/RuleFinder" target="_blank" rel="noreferrer" title="GitHub 源码" aria-label="GitHub 源码"><Github size={19} /></a></nav></header>
    <div className="workspace"><SourcePanel sources={sources} dataset={dataset} setDataset={setDataset} onImport={() => { setReplacementURL(''); setImportOpen(true); }} onFiles={files => void onFiles(files)} onToggle={id => updateSource(id, s => ({ ...s, enabled: !s.enabled, modified: true }))} onRemove={id => { controllers.current.get(id)?.abort(); controllers.current.delete(id); const setter = dataset === 'demo' ? setDemos : setUsers; setter(prev => prev.filter(s => s.id !== id)); if (viewer?.sourceId === id) setViewer(undefined); notify('来源已移除；依赖此来源的配置会显示不完整'); }} onReload={s => void reload(s)} onView={s => setViewer({ sourceId: s.id, line: s.rules[0]?.line ?? 1 })} onCancel={id => controllers.current.get(id)?.abort()} onDemo={showDemo} onDependencies={() => void loadDependencies()} loading={dependencyBusy} onClear={() => setConfirmClear(true)} />
      <main className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><span />本地规则诊断工作台</div><h1>每一次匹配，都有迹可循<span>。</span></h1><p>从目标出发，找到命中规则、原始位置和策略依据。</p></div><span className="local-badge"><ShieldCheck size={14} />隐私优先 · 本地计算</span></div>
        {dataset === 'demo' && <div className="demo-notice"><Sparkles size={15} /><span>正在体验内置示例。试试查询，或导入你的规则开始定位。</span><button onClick={() => { setReplacementURL(''); setImportOpen(true); }}>导入我的规则<ArrowRight size={13} /></button></div>}
        <section className="query-card" aria-label="规则查询"><div className="query-top"><div className="query-type"><button className={queryType === 'match' ? 'active' : ''} onClick={() => { setQueryType('match'); if (input.includes('\n') && !batch) setInput(input.split('\n')[0]); }}><Search size={15} />规则匹配</button><button className={queryType === 'text' ? 'active' : ''} onClick={() => { setQueryType('text'); setBatch(false); setInput(''); setSearchTerm(''); }}><AlignLeft size={15} />原文搜索</button></div><button className={`batch-button ${batch ? 'active' : ''}`} onClick={() => { setQueryType('match'); setBatch(!batch); if (batch) setInput(input.split('\n')[0]); }}><List size={15} />{batch ? '返回单条查询' : '批量查询'}</button></div>
          <form onSubmit={e => { e.preventDefault(); run(); }}><div className={`query-input-wrap ${batch ? 'batch' : ''}`}><Search size={21} />{batch ? <textarea ref={queryRef as React.RefObject<HTMLTextAreaElement>} aria-label="批量查询目标" value={input} onChange={e => setInput(e.target.value)} placeholder={'每行一个域名、URL 或 IP\napi.example.com\n203.0.113.8\n2001:db8::1'} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); } }} spellCheck={false} /> : <input ref={queryRef as React.RefObject<HTMLInputElement>} aria-label={queryType === 'text' ? '原文搜索关键词' : '查询目标'} value={input} onChange={e => setInput(e.target.value)} placeholder={queryType === 'text' ? '搜索规则、注释或策略名…' : '输入域名、完整 URL、IPv4 或 IPv6 地址…'} spellCheck={false} autoComplete="off" />}{!!input && <button type="button" className="icon-button clear-input" aria-label="清空输入" onClick={clear}><X size={16} /></button>}<button type="submit" className="primary query-submit" disabled={queryBusy}>{queryBusy ? <LoaderCircle size={16} className="spin" /> : null}{queryType === 'text' ? '搜索原文' : '查询规则'}{!queryBusy && <ArrowRight size={16} />}</button></div></form>
          <div className="query-options"><div className="sample-targets"><span>{queryType === 'text' ? '按原文包含查找，不执行规则匹配' : batch ? '每行一个目标 · 最多 200 行' : '试一下'}</span>{queryType === 'match' && !batch && sampleTargets.slice(0, 3).map(target => <button key={target} onClick={() => { setInput(target); setLastInputs([target]); }}>{target}</button>)}</div><button className={advanced ? 'advanced-toggle active' : 'advanced-toggle'} onClick={() => setAdvanced(!advanced)}><SlidersHorizontal size={13} />高级条件<ChevronDown size={12} className={advanced ? 'rotated' : ''} /></button></div>
          {advanced && <div className="advanced-panel"><div className="advanced-grid"><label>目标 IP / DNS 结果<input placeholder="203.0.113.8, 2001:db8::1" value={conditions.ips ?? ''} onChange={e => setConditions({ ...conditions, ips: e.target.value })} /></label><label>目标端口<input placeholder="未提供" type="text" inputMode="numeric" value={conditions.port ?? ''} onChange={e => setConditions({ ...conditions, port: e.target.value })} /></label><label>传输协议<select value={conditions.transport ?? ''} onChange={e => setConditions({ ...conditions, transport: e.target.value as Conditions['transport'] })}><option value="">未提供</option><option>TCP</option><option>UDP</option></select></label></div><div className="advanced-bottom"><label className="checkbox-label"><input type="checkbox" checked={conditions.dnsComplete ?? false} onChange={e => setConditions({ ...conditions, dnsComplete: e.target.checked })} />确认以上 IP 是完整 DNS 结果或实际目标 IP</label><button className="text-button" onClick={() => setConditions({})}>重置条件</button></div><p>补充条件会自动更新当前模拟。不会自动解析 DNS，也不会访问输入的网站。</p></div>}
          {mode === 'simulate' && <div className="config-picker"><span>主配置</span><select aria-label="选择主配置" value={configId || configs.find(s => s.enabled)?.id || ''} onChange={e => setConfigId(e.target.value)}>{!configs.length && <option value="">尚未导入 Loon 配置</option>}{configs.map(s => <option key={s.id} value={s.id}>{s.name}{!s.enabled ? '（已停用）' : ''}</option>)}</select><InfoSmall /><small>假定请求已进入规则引擎</small></div>}
        </section>
        {error && <div className="error-banner" role="alert"><CircleAlert size={17} /><span>{error}</span><button className="icon-button" aria-label="关闭错误提示" onClick={() => setError('')}><X size={15} /></button></div>}
        <div className={`output-area ${queryBusy ? 'updating' : ''}`} aria-live="polite" aria-busy={queryBusy}>
          {queryBusy && <div className="query-progress"><LoaderCircle size={13} className="spin" />正在后台更新结果…</div>}
          {queryType === 'text' ? searchTerm ? <TextResults hits={hits} term={searchTerm} onView={setViewer} /> : <EmptyState type="text" onDemo={showDemo} /> : <>
            {!!results.length && <div className="output-toolbar"><span>{results.length > 1 ? `批量结果 · ${results.length} 个目标` : '查询结果'}<span className="output-dot">·</span>无需真实网络访问</span><div><button onClick={() => exportResults('json')}><Download size={13} />JSON</button><button onClick={() => exportResults('csv')}><Download size={13} />CSV</button></div></div>}
            {results.length > 1 && <div className="batch-results" aria-label="批量查询结果">{results.map((item, i) => <button key={i} className={i === activeResult ? 'active' : ''} onClick={() => setActiveResult(i)}>{item.error ? <CircleAlert size={14} /> : item.result?.certainty === 'certain' ? <CheckCircle2 size={14} /> : <Globe2 size={14} />}<span>{item.input}</span><small>{item.error ? '输入错误' : item.result?.policy ?? `${item.result?.rows.filter(r => r.verdict === 'match').length} 条匹配`}</small></button>)}</div>}
            {current?.result ? <><ResultSummary result={current.result} demo={dataset === 'demo'} item={current} onCopy={text => void copy(text)} onView={setViewer} /><ResultTable result={current.result} onView={setViewer} /></> : current?.error ? <div className="input-error-state"><CircleAlert size={30} /><h3>无法识别这个目标</h3><code>{current.input}</code><p>{current.error}</p></div> : !queryBusy ? <EmptyState type={sources.length ? 'target' : 'sources'} onDemo={showDemo} /> : null}
          </>}
        </div>
        <footer className="main-footer"><span><ShieldCheck size={13} />配置留在本地，结论有据可查。</span><button onClick={() => setSupportOpen(true)}>匹配机制与已知限制<ArrowUpRightSmall /></button><span className="keyboard-hint"><Command size={11} /> K 聚焦 · {batch ? '⌘ / Ctrl + Enter 查询' : 'Enter 查询'}</span></footer>
      </main>
    </div>
    {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onPaste={onPaste} onRemote={onRemote} onFiles={files => void onFiles(files)} initialURL={replacementURL} />}
    {viewer && sources.some(s => s.id === viewer.sourceId) && <RuleViewer selection={viewer} sources={sources} onClose={() => setViewer(undefined)} onSelect={setViewer} onCopy={text => void copy(text)} onReplace={url => { setViewer(undefined); setReplacementURL(url ?? ''); setImportOpen(true); }} />}
    {supportOpen && <SupportDialog onClose={() => setSupportOpen(false)} />}
    {confirmClear && <Modal title="清除我的规则工作区？" subtitle="这会移除此浏览器中的用户配置与规则缓存。内置示例仍然保留。" onClose={() => setConfirmClear(false)}><div className="modal-footer"><button className="secondary" onClick={() => setConfirmClear(false)}>取消</button><button className="danger-button" onClick={() => { for (const controller of controllers.current.values()) controller.abort(); controllers.current.clear(); setUsers([]); setConfirmClear(false); setViewer(undefined); notify('用户工作区数据已清除'); }}>清除本地数据</button></div></Modal>}
    {notice && <div className="toast" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="关闭通知"><X size={14} /></button></div>}
  </div>;
}
function EmptyState({ type, onDemo }: { type: 'text' | 'target' | 'sources'; onDemo: () => void }) {
  return <div className="workspace-empty"><span><FileSearch size={35} strokeWidth={1.4} /></span><h2>{type === 'text' ? '在原文中，找到你需要的线索' : type === 'sources' ? '从一份规则开始' : '下一个目标，等待定位'}</h2><p>{type === 'text' ? '输入关键词、策略名称或规则内容，定位所有包含该文字的原始行。' : type === 'sources' ? '导入配置或规则文件，输入目标，查看每一次匹配的依据。' : '输入域名、URL 或 IP，按 Enter 查看匹配规则与来源。'}</p><div><span>01 导入来源</span><ArrowRight size={13} /><span>02 查询目标</span><ArrowRight size={13} /><span>03 定位原文</span></div><button className="secondary" onClick={onDemo}><Sparkles size={14} />加载内置示例</button></div>;
}
function LayersIcon() { return <span className="mode-mini">▱</span>; }
function GitIcon() { return <span className="mode-mini">⑂</span>; }
function InfoSmall() { return <HelpCircle size={12} />; }
function ArrowUpRightSmall() { return <span>↗</span>; }
