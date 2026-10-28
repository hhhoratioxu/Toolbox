import { normalizeDomain, validateCIDR } from '../input';
import { stableHash, tokenize } from '../syntax';
import type { Reference, Rule, RuleCategory, Source, SourceDraft } from '../types';

const domainTypes = new Set(['DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-WILDCARD']);
const ipTypes = new Set(['IP-CIDR', 'IP-CIDR6', 'GEOIP', 'IP-ASN']);
const supported = new Set(['DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'IP-CIDR', 'IP-CIDR6', 'FINAL', 'DEST-PORT', 'PROTOCOL']);
const otherTypes = new Set(['DEST-PORT', 'SRC-PORT', 'PROTOCOL', 'PROCESS-NAME', 'PROCESS-PATH', 'USER-AGENT', 'URL-REGEX']);
export function categoryOf(type: string): RuleCategory {
  return domainTypes.has(type) ? 'domain' : ipTypes.has(type) ? 'ip' : type === 'FINAL' ? 'final' : otherTypes.has(type) ? 'other' : 'unknown';
}
export function parseRule(raw: string, sourceId: string, line: number, section: string, config = false): Rule {
  const { fields, error } = tokenize(raw);
  const type = fields[0]?.toUpperCase() || 'UNKNOWN';
  const isFinal = type === 'FINAL';
  const remaining = fields.slice(isFinal ? 1 : 2);
  const policy = remaining[0] && remaining[0].toLowerCase() !== 'no-resolve' && !remaining[0].includes('=') ? remaining.shift() : undefined;
  const params = remaining.map(x => x.toLowerCase());
  let issue = error;
  let value = isFinal ? '*' : (fields[1] ?? '');
  if (!isFinal && !value) issue ??= '缺少匹配内容';
  if (config && !policy) issue ??= '配置规则缺少策略名称';
  if (params.some(x => x !== 'no-resolve') || params.some(x => x === 'no-resolve' && !ipTypes.has(type))) issue ??= '包含尚未支持的规则参数';
  if (type === 'DOMAIN' || type === 'DOMAIN-SUFFIX') {
    try { value = normalizeDomain(value); } catch { issue ??= '域名匹配内容无效'; }
  }
  if (type === 'DOMAIN-KEYWORD') value = value.toLowerCase();
  if (type === 'IP-CIDR' && !validateCIDR(value, 'ipv4')) issue ??= 'IPv4 CIDR 无效';
  if (type === 'IP-CIDR6' && !validateCIDR(value, 'ipv6')) issue ??= 'IPv6 CIDR 无效';
  if (type === 'DEST-PORT' && !validPortExpression(value)) issue ??= '目标端口表达式无效';
  if (type === 'PROTOCOL' && !['TCP', 'UDP'].includes(value.toUpperCase())) issue ??= '首版仅模拟明确提供的 TCP / UDP 传输协议';
  if (isFinal && !policy) issue ??= 'FINAL 缺少策略';
  return { id: `${sourceId}:${line}:${stableHash(raw)}`, sourceId, raw, line, type, value, policy, params,
    category: categoryOf(type), supported: supported.has(type) && !issue, issue, position: line, section };
}
export function validPortExpression(value: string): boolean {
  const m = value.match(/^(?:(>=|<=|>|<|=)?(\d+)|(\d+)-(\d+))$/);
  if (!m) return false;
  const nums = [m[2], m[3], m[4]].filter(Boolean).map(Number);
  return nums.every(n => n >= 1 && n <= 65535) && (!m[3] || +m[3] <= +m[4]);
}
function parseReference(raw: string, sourceId: string, line: number, kind: Reference['kind']): Reference {
  const { fields, error } = tokenize(raw);
  const url = fields[0] ?? '';
  let policy: string | undefined, enabled = true, issue = error;
  for (const field of fields.slice(1)) {
    const eq = field.indexOf('=');
    if (eq < 0 && !policy) { policy = field; continue; }
    const key = field.slice(0, eq).trim().toLowerCase(); const value = field.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'policy') policy = value;
    else if (key === 'enabled') { if (!['true', 'false'].includes(value.toLowerCase())) issue ??= 'enabled 参数应为 true / false'; enabled = value.toLowerCase() !== 'false'; }
    else if (!['tag', 'update-interval', 'interval'].includes(key)) issue ??= `未支持的引用参数：${field}`;
  }
  if (!/^(https?:\/\/|example:\/\/)/i.test(url)) issue ??= '引用地址必须为 HTTP(S) URL';
  if (kind === 'subscription' && !policy) issue ??= '订阅引用缺少策略绑定';
  return { id: `${sourceId}:ref:${line}`, sourceId, line, raw, url, policy, kind, enabled, position: line, issue };
}
export function parseLoon(draft: SourceDraft): Source {
  const content = draft.content.replace(/^\uFEFF/, '');
  const lines = content.split(/\r\n|\n|\r/);
  const isYaml = /\.(ya?ml)$/i.test(draft.filename ?? draft.name) || /^\s*(rules|payload|rule-providers):/m.test(content);
  const hasSections = /^\s*\[[^\]]+\]/m.test(content);
  const isPlugin = draft.formatHint === 'plugin' || /\.(lpx|plugin)(?:$|\?)/i.test(draft.filename ?? draft.url ?? draft.name);
  const format = isYaml ? 'unsupported' : isPlugin ? 'loon-plugin' : hasSections || draft.formatHint === 'config' ? 'loon-config' : 'loon-rules';
  const source: Source = { id: draft.id, name: draft.name, client: 'loon', format, kind: draft.kind ?? (isPlugin ? 'plugin' : 'local'),
    origin: draft.origin, filename: draft.filename, url: draft.url, content: draft.content, rules: [], references: [], groups: [], diagnostics: [],
    enabled: true, status: isYaml ? 'unsupported' : 'ready', loadedAt: new Date().toISOString(), demo: !!draft.demo };
  let section = '';
  lines.forEach((raw, i) => {
    const line = i + 1; const trimmed = raw.trim();
    if (!trimmed || /^(#|;|\/\/)/.test(trimmed)) return;
    const header = trimmed.match(/^\[([^\]]+)\]\s*(?:[#;].*)?$/);
    if (header) {
      section = header[1].trim().replace(/\s+/g, ' ').toLowerCase();
      if (!['rule', 'remote rule', 'plugin', 'proxy group', 'proxy', 'general'].includes(section)) source.diagnostics.push({ line, severity: 'warning', message: `[${header[1]}] 段仅保留原文，不执行其中的 DNS、改写、脚本或运行时行为` });
      return;
    }
    if (isYaml || (!hasSections || section === 'rule')) {
      const rule = parseRule(raw, draft.id, line, section, format === 'loon-config');
      if (isYaml) { rule.issue = 'YAML / Mihomo 适配器尚未开放，原文已保留'; rule.supported = false; rule.category = 'unknown'; }
      source.rules.push(rule);
      if (rule.issue || !rule.supported) source.diagnostics.push({ line, severity: 'warning', message: rule.issue ?? `尚未模拟 ${rule.type}，查询时显示无法判断` });
    } else if (section === 'remote rule' || section === 'plugin') {
      const ref = parseReference(raw, draft.id, line, section === 'plugin' ? 'plugin' : 'subscription');
      source.references.push(ref);
      if (ref.issue) source.diagnostics.push({ line, severity: 'warning', message: ref.issue });
    } else if (section === 'proxy group') {
      const eq = trimmed.indexOf('=');
      if (eq < 0) { source.diagnostics.push({ line, severity: 'warning', message: '策略组定义缺少等号' }); return; }
      const name = trimmed.slice(0, eq).trim().replace(/^["']|["']$/g, '');
      const { fields } = tokenize(trimmed.slice(eq + 1));
      source.groups.push({ name, type: fields[0] ?? 'unknown', members: fields.slice(1).filter(x => !x.includes('=')), line });
    }
  });
  const recognizable = source.rules.some(r => categoryOf(r.type) !== 'unknown' || ['AND', 'OR', 'NOT', 'SCRIPT', 'GEOSITE', 'RULE-SET'].includes(r.type));
  if ((!source.rules.length || !recognizable) && !source.references.length) {
    source.diagnostics.push({ line: 1, severity: 'error', message: '没有识别到 Loon 规则或规则引用。原文仍可查看。' });
    source.status = 'unsupported';
  }
  if (hasSections && !isPlugin && !/^\s*\[(?:Rule|Remote Rule)\]/im.test(content)) {
    source.diagnostics.push({ line: 1, severity: 'warning', message: '缺少 [Rule] / [Remote Rule]，不能视为可模拟的主配置' });
    source.status = 'unsupported';
  }
  return source;
}
