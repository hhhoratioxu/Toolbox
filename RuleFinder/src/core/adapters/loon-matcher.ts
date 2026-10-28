import { cidrContains, parseIP } from '../input';
import type { Rule, SourceKind, Target, Verdict } from '../types';

export function evaluateLoon(rule: Rule, target: Target): { verdict: Verdict; reason: string } {
  const yes = (reason: string) => ({ verdict: 'match' as const, reason });
  const no = (reason: string) => ({ verdict: 'no-match' as const, reason });
  const unknown = (reason: string) => ({ verdict: 'unknown' as const, reason });
  if (rule.category === 'domain' && !target.hostname) return no('目标是 IP 字面量，不参与域名匹配');
  // Loon's documented semantics are stricter than Surge's resolved-domain no-resolve behavior.
  if (rule.category === 'ip' && rule.params.includes('no-resolve') && !target.ip) return no('Loon no-resolve 仅匹配 IP 字面量请求；域名请求跳过，即使补充了 DNS IP');
  if (rule.issue) return unknown(rule.issue);
  if (rule.type === 'DOMAIN') return target.hostname === rule.value ? yes(`完整域名 ${target.hostname} 与 ${rule.value} 相同`) : no('完整域名不同');
  if (rule.type === 'DOMAIN-SUFFIX') return target.hostname === rule.value || target.hostname?.endsWith(`.${rule.value}`) ? yes(target.hostname === rule.value ? `域名与后缀 ${rule.value} 本身相同` : `${target.hostname} 是 ${rule.value} 的子域名，标签边界相符`) : no('域名不属于该后缀（按标签边界判断）');
  if (rule.type === 'DOMAIN-KEYWORD') return target.hostname?.includes(rule.value) ? yes(`域名包含关键词「${rule.value}」`) : no('域名不包含该关键词');
  if (rule.type === 'IP-CIDR' || rule.type === 'IP-CIDR6') {
    if (!target.ips.length) return unknown('缺少 DNS 结果 / 目标 IP；浏览器不会自动解析或访问查询目标');
    const family = rule.type === 'IP-CIDR' ? 'ipv4' : 'ipv6';
    const states = target.ips.map(ip => parseIP(ip)?.kind() === family && cidrContains(rule.value, ip));
    if (states.every(Boolean)) return target.dnsComplete ? yes(`${target.ips.join('、')} 落入 ${rule.value}${target.ip ? '' : '（使用提供的 DNS IP）'}`) : unknown(`已知 IP 落入 ${rule.value}，但未确认 DNS 结果完整或客户端实际目标 IP`);
    if (states.some(Boolean)) return unknown(`提供的多个 IP 中仅部分落入 ${rule.value}，缺少客户端实际选用的目标 IP`);
    return target.dnsComplete ? no(`目标 IP 均不在 ${rule.value} 内`) : unknown(`已知 IP 不在 ${rule.value} 内，但未确认 DNS 结果完整`);
  }
  if (rule.type === 'GEOIP' || rule.type === 'IP-ASN') return unknown(`缺少${rule.type === 'GEOIP' ? ' GEOIP / MMDB 国家地区' : ' ASN'}数据库${target.ips.length ? '' : '及目标 IP'}，无法判断 ${rule.value}`);
  if (rule.type === 'DEST-PORT') {
    if (target.port === undefined) return unknown('缺少目标端口，可在高级条件中提供');
    let matched = false;
    if (/^\d+-\d+$/.test(rule.value)) { const [a, b] = rule.value.split('-').map(Number); matched = target.port >= a && target.port <= b; }
    else { const m = rule.value.match(/^(>=|<=|>|<|=)?(\d+)$/)!; const n = +m[2]; matched = m[1] === '>=' ? target.port >= n : m[1] === '<=' ? target.port <= n : m[1] === '>' ? target.port > n : m[1] === '<' ? target.port < n : target.port === n; }
    return matched ? yes(`目标端口 ${target.port} 满足 ${rule.value}`) : no('目标端口不满足规则');
  }
  if (rule.type === 'PROTOCOL') return !target.transport ? unknown('缺少 TCP / UDP 传输协议；HTTPS URL 不能证明使用 TCP（可能是 QUIC）') : target.transport === rule.value.toUpperCase() ? yes(`提供的传输协议为 ${target.transport}`) : no('传输协议不同');
  if (rule.type === 'FINAL') return yes('FINAL 为兜底候选；只有前面所有适用规则确定不匹配时才生效');
  if (rule.type.startsWith('PROCESS')) return unknown('缺少客户端进程信息；首版不模拟进程规则');
  if (['AND', 'OR', 'NOT'].includes(rule.type)) return unknown('逻辑表达式已完整保留；首版不执行复杂逻辑规则，按潜在高优先级处理');
  return unknown(`尚未实现 ${rule.type} 的 Loon 匹配语义，原文已保留`);
}
export function loonPriority(rule: Rule, kind: SourceKind, target: Target, path: number[]): number[] {
  const sourceRank = { local: 0, plugin: 1, subscription: 2 }[kind];
  // Unknown/mixed rules can contain domain tests: conservatively place at the earliest possible phase.
  const phase = rule.category === 'final' ? 2 : target.hostname && (rule.category === 'domain' || rule.category === 'unknown') ? 0 : 1;
  return [phase, sourceRank, ...path, rule.position];
}
