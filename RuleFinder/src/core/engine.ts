import { loon } from './adapters';
import { normalizeTarget } from './input';
import type { Conditions, Evaluation, QueryResult, Reference, Rule, Source, SourceKind, Target, TraceStep } from './types';

class DomainIndex {
  exact = new Map<string, Set<string>>(); suffix = new Map<string, Set<string>>(); rest: Rule[] = [];
  constructor(rules: Rule[]) {
    for (const rule of rules) {
      if (!rule.supported || !['DOMAIN', 'DOMAIN-SUFFIX'].includes(rule.type)) { this.rest.push(rule); continue; }
      const map = rule.type === 'DOMAIN' ? this.exact : this.suffix;
      const ids = map.get(rule.value) ?? new Set<string>(); ids.add(rule.id); map.set(rule.value, ids);
    }
  }
  candidates(host?: string): Set<string> {
    const ids = new Set(this.rest.map(r => r.id));
    if (host) {
      this.exact.get(host)?.forEach(id => ids.add(id));
      const labels = host.split('.');
      for (let i = 0; i < labels.length; i++) this.suffix.get(labels.slice(i).join('.'))?.forEach(id => ids.add(id));
    }
    return ids;
  }
}
const indexes = new WeakMap<Source, DomainIndex>();
function getIndex(source: Source): DomainIndex { let index = indexes.get(source); if (!index) { index = new DomainIndex(source.rules); indexes.set(source, index); } return index; }
export function comparePriority(a: Evaluation, b: Evaluation): number {
  for (let i = 0; i < Math.max(a.priority.length, b.priority.length); i++) {
    const d = (a.priority[i] ?? 0) - (b.priority[i] ?? 0); if (d) return d;
  }
  return a.id.localeCompare(b.id);
}
function traceStep(source: Source, line: number, label: string): TraceStep { return { sourceId: source.id, name: source.name, line, url: source.url, label }; }
function placeholder(source: Source, reason: string, target: Target, trace: TraceStep[], path: number[], kind: SourceKind, ref?: Reference): Evaluation {
  const rule: Rule = { id: `${source.id}:missing:${ref?.id ?? 'source'}`, sourceId: source.id, raw: ref?.raw ?? source.name, line: ref?.line ?? 0,
    type: ref?.kind === 'plugin' ? 'PLUGIN' : 'REMOTE-RULE', value: ref?.url ?? source.url ?? source.name, params: [], category: 'unknown', supported: false, position: ref?.position ?? 0, section: 'remote rule' };
  return { id: `${trace.map(t => t.sourceId + ':' + t.line).join('/')}/${rule.id}`, rule, verdict: 'unknown', reason,
    policy: ref?.policy, trace, priority: loon.priority(rule, kind, target, path), synthetic: true };
}
export function query(sources: Source[], raw: string, mode: QueryResult['mode'], conditions: Conditions = {}, configId?: string): QueryResult {
  const start = performance.now(); const target = normalizeTarget(raw, conditions);
  const rows: Evaluation[] = []; let checked = 0, noMatch = 0, modified = target.conditionsChanged;
  const config = sources.find(s => s.id === configId && s.format === 'loon-config') ?? sources.find(s => s.enabled && s.format === 'loon-config');
  const addSource = (source: Source, kind: SourceKind, trace: TraceStep[], path: number[], binding?: string, stack = new Set<string>()) => {
    if (stack.has(source.id) || trace.length > 12) { rows.push(placeholder(source, '循环引用或引用深度超过 12 层，规则依赖不完整', target, trace, path, kind)); return; }
    if (!source.enabled) { modified = true; return; }
    modified ||= !!source.modified;
    if (source.status !== 'ready') { const row = placeholder(source, source.error?.message ?? `来源处于${source.status}状态，内容可能不完整`, target, [...trace, traceStep(source, 0, '依赖内容未就绪')], path, kind); row.policy = binding; rows.push(row); return; }
    const candidates = getIndex(source).candidates(target.hostname);
    const nextStack = new Set(stack).add(source.id);
    for (const rule of source.rules) {
      checked++;
      if (!candidates.has(rule.id)) { noMatch++; continue; }
      const evaluation = loon.evaluate(rule, target);
      if (evaluation.verdict === 'no-match') { noMatch++; continue; }
      const policy = binding ?? rule.policy;
      const fullTrace = [...trace, traceStep(source, rule.line, binding ? `规则条目 · 绑定 ${binding}` : '规则条目')];
      rows.push({ id: `${fullTrace.map(s => s.sourceId + ':' + s.line).join('/')}/${rule.id}`, rule, ...evaluation, policy,
        trace: fullTrace, priority: loon.priority(rule, kind, target, path) });
    }
    for (const ref of source.references) {
      if (!ref.enabled) continue;
      const fullTrace = [...trace, traceStep(source, ref.line, `${ref.kind === 'plugin' ? '插件' : '订阅'}引用${ref.policy ? ` · ${ref.policy}` : ''}`)];
      if (ref.issue) { rows.push(placeholder(source, ref.issue, target, fullTrace, [...path, ref.position], ref.kind, ref)); continue; }
      // References are joined by exact URL, never by a guessed filename.
      const dependent = sources.find(s => s.url === ref.url);
      if (!dependent) { rows.push(placeholder(source, `依赖未加载：${ref.url}`, target, fullTrace, [...path, ref.position], ref.kind, ref)); continue; }
      addSource(dependent, ref.kind, fullTrace, [...path, ref.position], ref.policy, nextStack);
    }
  };
  if (mode === 'simulate' && !config) return { target, mode, rows: [], checked: 0, noMatch: 0, certainty: 'no-config', missing: ['请先导入 Loon 主配置；独立规则库不能推断生效策略'], elapsed: performance.now() - start, modified, incomplete: true, groups: [] };
  if (mode === 'simulate') {
    if (!config!.enabled) modified = true;
    addSource(config!, 'local', [], []);
    // Unattached imports are intentionally not injected into an imported profile.
  } else {
    for (const source of sources.filter(s => s.enabled)) {
      if (source.status !== 'ready') { rows.push(placeholder(source, source.error?.message ?? '来源不可用，规则库结果不完整', target, [traceStep(source, 1, '来源')], [], source.kind)); continue; }
      // Search each file once. References do not create duplicate library results or implicit policy bindings.
      const candidates = getIndex(source).candidates(target.hostname);
      for (const rule of source.rules) {
        checked++; if (!candidates.has(rule.id)) { noMatch++; continue; }
        const evaluation = loon.evaluate(rule, target);
        if (evaluation.verdict === 'no-match') { noMatch++; continue; }
        rows.push({ id: rule.id, rule, ...evaluation, policy: rule.policy, trace: [traceStep(source, rule.line, '独立原文')], priority: [], disposition: 'library' });
      }
    }
  }
  if (mode === 'simulate') rows.sort(comparePriority);
  const missing = new Set<string>();
  let effectiveId: string | undefined, candidateId: string | undefined, policy: string | undefined;
  let certainty: QueryResult['certainty'] = mode === 'library' ? 'library' : 'none';
  if (mode === 'simulate') {
    let blocked = false, found = false;
    for (const row of rows) {
      if (found) { row.disposition = row.verdict === 'match' ? 'shadowed' : 'blocker'; continue; }
      if (row.verdict === 'unknown') { blocked = true; row.disposition = 'blocker'; missing.add(row.reason); continue; }
      if (!row.policy) { blocked = true; row.disposition = 'blocker'; missing.add(`第 ${row.rule.line} 行规则缺少策略绑定`); continue; }
      found = true; policy = row.policy;
      if (blocked) { row.disposition = 'candidate'; candidateId = row.id; certainty = 'uncertain'; }
      else { row.disposition = 'effective'; effectiveId = row.id; certainty = 'certain'; }
    }
    if (!found && blocked) certainty = 'uncertain';
    if (!found && !blocked) missing.add('当前配置没有匹配规则或可用的 FINAL 兜底');
  } else for (const row of rows) if (row.verdict === 'unknown') missing.add(row.reason);
  const selectedGroup = config?.groups.find(g => g.name === policy);
  if (selectedGroup) missing.add(`已定位策略组「${selectedGroup.name}」（${selectedGroup.type}）；缺少客户端运行状态，无法确定最终节点`);
  return { target, mode, rows, checked, noMatch, certainty, effectiveId, candidateId, policy, missing: [...missing],
    elapsed: performance.now() - start, modified, incomplete: rows.some(row => !!row.synthetic), groups: config?.groups ?? [], configId: config?.id };
}
export function searchText(sources: Source[], term: string, limit = 1000): { sourceId: string; name: string; line: number; raw: string }[] {
  const result: { sourceId: string; name: string; line: number; raw: string }[] = [];
  const needle = term.trim().toLowerCase(); if (!needle) return result;
  for (const source of sources.filter(s => s.enabled)) {
    const lines = source.content.split(/\r\n|\n|\r/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(needle)) result.push({ sourceId: source.id, name: source.name, line: i + 1, raw: lines[i] });
      if (result.length >= limit) return result;
    }
  }
  return result;
}
