import { Copy, ExternalLink, FileCode2, ArrowRight, Download, CalendarClock, CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Source, TraceStep } from '../core/types';
import { githubLineURL } from '../services/remote';
import { downloadFile } from '../services/export';
import { rawURL } from '../library/catalog';
import { Modal, formatLabels, kindLabels } from './Shared';
export interface ViewerSelection { sourceId: string; line: number; trace?: TraceStep[]; reason?: string; raw?: string }
export function RuleViewer({ selection, sources, onClose, onSelect, onCopy, onReplace }: { selection: ViewerSelection; sources: Source[]; onClose: () => void; onSelect: (s: ViewerSelection) => void; onCopy: (text: string) => void; onReplace: (url?: string) => void }) {
  const source = sources.find(s => s.id === selection.sourceId)!; const [all, setAll] = useState(false); const codeRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (all) codeRef.current?.querySelector('.highlight')?.scrollIntoView({ block: 'center', inline: 'nearest' }); }, [all, selection.line, selection.sourceId]);
  if (!source) return null;
  const lines = source.content ? source.content.split(/\r\n|\n|\r/) : []; const start = all ? Math.max(0, selection.line - 101) : Math.max(0, selection.line - 5); const end = Math.min(lines.length, selection.line + (all ? 100 : 4));
  const loadedURL = source.catalog?.sha ? rawURL({ path: source.catalog.path, sha: source.catalog.sha, size: 0 }, source.catalog.commit) : source.url;
  const link = githubLineURL(loadedURL, selection.line);
  return <Modal title="规则原文" subtitle="原始行号与文件完全对应，注释和空行均保留。" onClose={onClose} wide>
    <div className="viewer-meta"><div className="viewer-file"><FileCode2 size={21} /><div><strong>{source.name}</strong><span>Loon · {formatLabels[source.format]} · {kindLabels[source.kind]} · {lines.length} 行</span></div></div><button className="secondary small" disabled={!source.content} onClick={() => downloadFile(source.filename ?? source.name, source.content)}><Download size={14} />下载原文</button></div>
    {source.url && <div className="viewer-url"><LinkSmall /><code>{source.url}</code><button className="icon-button" title="复制来源" onClick={() => onCopy(source.url!)}><Copy size={14} /></button></div>}
    <div className="viewer-loaded"><CalendarClock size={13} />最近加载：{source.loadedAt ? new Date(source.loadedAt).toLocaleString('zh-CN', { hour12: false }) : '尚未加载'}{source.error && <span className="danger-text">{source.error.message}</span>}</div>
    {source.catalog?.sha && <div className="viewer-loaded">仓库来源：{source.catalog.path} · 本次加载版本 {source.catalog.commit.slice(0, 7)} · 原文链接固定到此版本</div>}
    {!!selection.trace?.length && <div className="trace"><span className="section-label">来源路径</span><div>{selection.trace.map((step, i) => <span key={i}>{i > 0 && <ArrowRight size={13} />}<button onClick={() => { setAll(false); onSelect({ ...selection, sourceId: step.sourceId, line: step.line }); }}>{step.name}<b>{step.line > 0 ? `L${step.line}` : "待加载"}</b></button></span>)}</div></div>}
    {selection.reason && <div className="reason-box"><span className="section-label">判断原因</span><p>{selection.reason}</p></div>}
    <div className="code-toolbar"><span>{source.name}<span> : {selection.line > 0 ? selection.line : "尚无原文"}</span></span><div><button onClick={() => setAll(!all)}>{all ? '精简上下文' : '扩展上下文'}</button>{link && <a href={link} target="_blank" rel="noreferrer">GitHub 定位 <ExternalLink size={12} /></a>}</div></div>
    <div ref={codeRef} className="code-view" role="region" aria-label={source.content && selection.line > 0 ? `原文第 ${selection.line} 行` : "规则原文尚未取得"} tabIndex={0}>{lines.slice(start, end).map((raw, i) => <div key={start + i} className={`code-line ${start + i + 1 === selection.line ? 'highlight' : ''} ${/^\s*(#|;|\/\/)/.test(raw) ? 'comment-line' : ''}`}><span className="line-number">{start + i + 1}</span><code>{raw || ' '}</code>{start + i + 1 === selection.line && <span className="line-marker">← 定位行</span>}</div>)}{!source.content && <div className="empty-results"><FileCode2 size={25} /><h3>尚未取得规则原文</h3><p>此依赖尚无原始行号。请重新加载，或粘贴离线内容以替代。</p></div>}</div>
    {all && <div className="viewer-pages"><button className="secondary small" disabled={selection.line <= 1} onClick={() => onSelect({ ...selection, line: Math.max(1, selection.line - 200) })}>前 200 行</button><span>显示 {start + 1}–{end} / {lines.length} 行</span><button className="secondary small" disabled={end >= lines.length} onClick={() => onSelect({ ...selection, line: Math.min(lines.length, selection.line + 200) })}>后 200 行</button></div>}
    {!!source.diagnostics.length && <details className="diagnostics"><summary><CircleAlert size={14} />{source.diagnostics.length} 项解析提示</summary><ul>{source.diagnostics.slice(0, 100).map((d, i) => <li key={i}><button onClick={() => onSelect({ ...selection, line: d.line })}>L{d.line}</button>{d.message}</li>)}</ul>{source.diagnostics.length > 100 && <p>仅展示前 100 项；完整原文可下载。</p>}</details>}
    {source.error && <div className="viewer-replace"><button className="secondary" onClick={() => onReplace(source.url)}>粘贴内容以替代此引用</button></div>}
    <div className="modal-footer"><span>UTF-8 · 原始行号</span><button className="secondary" onClick={() => onCopy(source.url ?? source.filename ?? source.name)}><Copy size={14} />复制来源</button><button className="primary" disabled={!source.content || selection.line < 1} onClick={() => onCopy(selection.raw ?? lines[selection.line - 1] ?? '')}><Copy size={14} />复制规则</button></div>
  </Modal>;
}
function LinkSmall() { return <span>↗</span>; }
