import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CircleHelp, Copy, Download, ExternalLink, FileCode2, LoaderCircle, RefreshCw, Search, WandSparkles, X } from 'lucide-react';
import { clientNames, findEntry, libraryClients } from '../library/catalog';
import type { CatalogSnapshot, LibraryClient } from '../library/catalog';
import { findSoftware, preferredSoftware } from '../library/software';
import { writeRules, writerPolicy } from '../library/rule-writer';
import type { WrittenRules } from '../library/rule-writer';
import type { RulePolicy } from '../library/generator';
import { downloadFile } from '../services/export';

export function SoftwareAssistant({ snapshot, origin, busy, error, onRefresh, onCancel, onCopy, onCatalog }: {
  snapshot: CatalogSnapshot; origin: 'bundled' | 'cache' | 'live'; busy: boolean; error: string;
  onRefresh: () => Promise<void>; onCancel: () => void; onCopy: (text: string) => void; onCatalog: () => void;
}) {
  const [input, setInput] = useState('');
  const [sourceMode, setSourceMode] = useState<'software' | 'domain'>('software');
  const [client, setClient] = useState<LibraryClient>('Loon');
  const [policy, setPolicy] = useState<RulePolicy>('GROUP');
  const [groupName, setGroupName] = useState('节点选择');
  const [category, setCategory] = useState('');
  const [exact, setExact] = useState(false);
  const [localError, setLocalError] = useState('');
  const [result, setResult] = useState<{ fingerprint: string; file: WrittenRules }>();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); inputRef.current?.focus(); }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  const matches = useMemo(() => findSoftware(input, snapshot), [input, snapshot]);
  const selected = matches.find(m => m.category === category) ?? preferredSoftware(matches);
  const currentFile = selected && findEntry(snapshot, selected.category, client);
  const fingerprint = JSON.stringify([input, sourceMode, client, policy, groupName, exact, selected?.category, snapshot.commit]);
  const written = result?.fingerprint === fingerprint ? result.file : undefined;
  let policyError = '';
  try { writerPolicy({ client, policy, groupName }); } catch (e) { policyError = (e as Error).message; }
  const canGenerate = !!input.trim() && !busy && !policyError && (sourceMode === 'domain' || !!currentFile?.supported);
  const changeInput = (value: string) => { setInput(value); setCategory(''); setLocalError(''); };
  const generate = () => {
    setLocalError('');
    try {
      if (sourceMode === 'software' && !selected) throw new Error('请先选择一个对应的规则分类');
      const file = writeRules(snapshot, { client, policy, groupName,
        target: sourceMode === 'software' ? { kind: 'category', category: selected!.category } : { kind: 'domain', input, exact },
      });
      setResult({ fingerprint, file });
    } catch (e) { setLocalError(e instanceof Error ? e.message : '无法生成规则'); }
  };
  return <section className="software-assistant" aria-label="按软件写规则">
    <div className="writer-intro"><span className="writer-icon"><WandSparkles size={23} /></span><div><h2>输入软件名，帮你写好分流</h2><p>从你的分流库找到对应规则，选好格式和策略，一键生成可合入现有配置的片段。</p></div></div>
    <div className="writer-source-mode" aria-label="规则编写来源"><button className={sourceMode === 'software' ? 'active' : ''} onClick={() => { setSourceMode('software'); changeInput(''); }}>按软件查库</button><button className={sourceMode === 'domain' ? 'active' : ''} onClick={() => { setSourceMode('domain'); changeInput(''); }}>用自己的域名</button></div>
    <div className="writer-options"><label>代理软件<select aria-label="规则输出客户端" value={client} onChange={e => setClient(e.target.value as LibraryClient)}>{libraryClients.map(c => <option key={c} value={c}>{clientNames[c]}</option>)}</select></label><label>使用策略<select aria-label="软件规则策略" value={policy} onChange={e => setPolicy(e.target.value as RulePolicy)}><option value="GROUP">我的代理 / 策略组</option><option value="DIRECT">DIRECT · 直连</option><option value="REJECT">REJECT · 拒绝</option></select></label>{policy === 'GROUP' && <label>现有节点或策略组名<input aria-label="现有节点或策略组名" value={groupName} maxLength={100} onChange={e => setGroupName(e.target.value)} placeholder="与代理软件中的名称完全相同" /></label>}</div>
    {policyError && <p className="form-error" role="alert">{policyError}</p>}
    <form onSubmit={e => { e.preventDefault(); if (canGenerate) generate(); }}><div className="writer-search"><Search size={19} /><input ref={inputRef} aria-label={sourceMode === 'software' ? '软件名称' : '软件官方域名'} value={input} maxLength={sourceMode === 'software' ? 200 : 8192} onChange={e => changeInput(e.target.value)} placeholder={sourceMode === 'software' ? '搜索软件，如 ChatGPT、Spotify、电报、小红书…' : '填写软件官方域名或网址，如 api.example.com'} spellCheck={false} autoComplete="off" />{input && <button type="button" className="icon-button" aria-label="清空软件输入" onClick={() => changeInput('')}><X size={15} /></button>}<button type="submit" className="primary" disabled={!canGenerate}><WandSparkles size={15} />一键生成规则</button></div></form>
    {sourceMode === 'software' ? <div className="writer-examples"><span>试一下</span>{['ChatGPT', 'Spotify', '电报', '小红书'].map(name => <button key={name} onClick={() => changeInput(name)}>{name}</button>)}</div> : <label className="checkbox-label writer-exact"><input type="checkbox" checked={exact} onChange={e => setExact(e.target.checked)} />只匹配这个完整域名（不包含子域名）</label>}
    <div className="writer-directory"><span>{origin === 'live' ? '已读取在线目录' : origin === 'cache' ? '使用缓存目录' : '使用内置目录快照'} · {snapshot.commit.slice(0, 7)}</span>{busy ? <button className="text-button" onClick={onCancel}><LoaderCircle size={12} className="spin" />取消更新</button> : <button className="text-button" onClick={() => void onRefresh()}><RefreshCw size={12} />更新规则库</button>}<button className="text-button" onClick={onCatalog}>浏览全部分类<ArrowRight size={12} /></button></div>
    {error && <div className="writer-warning" role="alert">目录更新失败：{error}。当前仍可基于上次目录编写，来源可能尚未更新。</div>}
    {sourceMode === 'software' && !!input.trim() && <div className="writer-matches" aria-live="polite">
      {matches.length ? <><div className="writer-matches-head"><strong>找到 {matches.length} 个对应分类</strong><span>{selected ? '已选择下方分类' : '请选择要引用的分类'}</span></div><fieldset><legend className="sr-only">对应的规则分类</legend>{matches.slice(0, 12).map(match => {
        const file = findEntry(snapshot, match.category, client); const active = selected?.category === match.category;
        return <label className={`writer-match ${active ? 'selected' : ''}`} key={match.category}><input type="radio" name="software-category" aria-label={`使用 ${match.category} 分类`} checked={active} onChange={() => { setCategory(match.category); setLocalError(''); }} /><span><strong>{match.name}<em>{match.category}</em></strong><small>{match.reason}</small><code>{file?.path ?? '当前客户端没有此分类的原生文件'}</code></span>{active && <Check size={17} />}</label>;
      })}</fieldset>{selected && <p className="writer-scope"><CircleHelp size={15} /><span>{selected.shared ? `注意：${selected.name} 与其他服务共用 ${selected.category} 分类，生成会引用整个分类。` : `将引用 ${selected.category} 的完整原生规则集。`}范围由仓库文件决定；若只需要个别域名，可切换「用自己的域名」。</span></p>}{selected && !currentFile?.supported && <p className="form-error">该分类缺少此客户端支持的原生文件，请更新目录或切换客户端。</p>}</> : <div className="writer-no-match"><CircleHelp size={24} /><h3>库里暂未找到这个软件</h3><p>可以更新目录或换一个名称。当前工具不会凭软件名称猜测域名；也可以填写你确认的官方域名。</p><button className="secondary small" onClick={() => { setSourceMode('domain'); changeInput(''); }}>改用域名生成<ArrowRight size={13} /></button></div>}
    </div>}
    {localError && <p className="form-error" role="alert">{localError}</p>}
    {written && <div className="writer-result" aria-live="polite"><div className="writer-result-head"><span><FileCode2 size={19} /><strong>规则已生成</strong><small>{clientNames[client]} · {written.policy}</small></span><div><button className="secondary small" onClick={() => onCopy(written.content)}><Copy size={13} />复制规则</button><button className="primary small" onClick={() => downloadFile(written.filename, written.content)}><Download size={13} />下载分流片段</button></div></div><code className="writer-filename">{written.filename}</code><pre className="writer-code" tabIndex={0} aria-label="生成的分流规则">{written.content}</pre><p className="writer-instructions">{written.instructions}</p>{written.sourceURL && <a href={written.sourceURL} target="_blank" rel="noreferrer" className="writer-source-link">查看引用的原生规则文件<ExternalLink size={12} /></a>}<p className="writer-result-note">分流片段保留现有配置的节点与兜底设置。请合入对应段落，网页不会直接修改代理软件。{client === 'Shadowrocket' && ' Shadowrocket 兼容格式尚未做原生导入验收。'}</p></div>}
    {!written && !input.trim() && <div className="writer-empty"><FileCode2 size={31} /><p>软件名称 → 对应规则 → 一键生成</p><small>库中分类随仓库更新；名称别名用于查找，未知软件可手动提供域名。</small></div>}
  </section>;
}
