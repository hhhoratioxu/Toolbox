import ipaddr from 'ipaddr.js';
import type { Conditions, Target } from './types';

export function parseIP(value: string): ipaddr.IPv4 | ipaddr.IPv6 | undefined {
  const clean = value.replace(/^\[|\]$/g, '');
  // Reject legacy octal, hexadecimal and short IPv4 forms accepted by some URL parsers.
  if (!clean.includes(':') && !/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(clean)) return;
  if (clean.includes('%')) return; // scoped interface IDs need a client network context
  try { return ipaddr.parse(clean); } catch { return; }
}
export function normalizeDomain(value: string): string {
  const clean = value.trim().replace(/\.+$/, '').toLowerCase();
  if (!clean || /[\s\/@:#?\[\]\\]/.test(clean)) throw new Error('请输入有效域名，不要包含路径或空格。');
  const host = new URL(`http://${clean}`).hostname.toLowerCase();
  if (parseIP(host) || /^[\d.]+$/.test(host)) throw new Error('这不是有效的域名。');
  if (host.length > 253 || host.split('.').some(x => !/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/.test(x))) throw new Error('域名标签无效或长度超限。');
  return host;
}
export function normalizeTarget(raw: string, conditions: Conditions = {}): Target {
  const input = raw.trim();
  if (!input) throw new Error('先输入一个域名、URL 或 IP 地址。');
  if (input.length > 8192) throw new Error('输入过长，最多支持 8192 个字符。');
  let hostname: string | undefined, ip: string | undefined, port: number | undefined, url: string | undefined, scheme: string | undefined;
  const direct = parseIP(input);
  if (direct) ip = direct.toString();
  else if (input.includes('://') || /^\[.*\](?::\d+)?$/.test(input) || /^[^\s/:]+:\d+$/.test(input)) {
    let parsed: URL;
    try { parsed = new URL(input.includes('://') ? input : `http://${input}`); } catch { throw new Error('URL 或端口格式无效。IPv6 加端口时需要方括号。'); }
    if (parsed.username || parsed.password) throw new Error('请移除 URL 中的用户名和密码后再查询。');
    if (!parsed.hostname) throw new Error('URL 缺少 hostname。');
    const parsedIP = parseIP(parsed.hostname);
    if (parsedIP) ip = parsedIP.toString();
    else hostname = normalizeDomain(parsed.hostname);
    const originalHost = input.match(/^(?:[a-z][a-z\d+.-]*:\/\/)?(\[[^\]]+\]|[^/:?#]+)/i)?.[1] ?? '';
    if (parsedIP?.kind() === 'ipv4' && !parseIP(originalHost)) throw new Error('IPv4 必须是四段十进制地址，不接受简写、十六进制或前导零。');
    // A URL's scheme supplies the destination port, but does not prove TCP vs QUIC/UDP.
    scheme = input.includes('://') ? parsed.protocol.replace(':', '').toLowerCase() : undefined;
    port = parsed.port ? Number(parsed.port) : scheme === 'https' ? 443 : scheme === 'http' ? 80 : undefined;
    if (!scheme && !parsed.port) { const m = input.match(/:(\d+)$/); if (m) port = Number(m[1]); }
    if (port !== undefined && (port < 1 || port > 65535)) throw new Error('端口必须为 1–65535。');
    if (scheme) { parsed.hostname = hostname ?? (ip?.includes(':') ? `[${ip}]` : ip ?? ''); url = parsed.href; }
  } else {
    if (input.includes(':') || /^[\d.]+$/.test(input)) throw new Error('IP 地址格式无效。');
    hostname = normalizeDomain(input);
  }
  const suppliedIPs = (conditions.ips ?? '').split(/[\s,;]+/).filter(Boolean).map(item => {
    const parsed = parseIP(item); if (!parsed) throw new Error(`目标 IP 无效：${item}`); return parsed.toString();
  });
  if (conditions.port?.trim()) {
    if (!/^\d+$/.test(conditions.port) || +conditions.port < 1 || +conditions.port > 65535) throw new Error('高级条件中的端口必须为 1–65535。');
    port = +conditions.port;
  }
  return { raw, normalized: hostname ?? ip!, hostname, ip, ips: ip ? [ip] : [...new Set(suppliedIPs)], port, url, scheme,
    transport: conditions.transport || undefined, dnsComplete: !!conditions.dnsComplete || !!ip,
    conditionsChanged: !!(suppliedIPs.length || conditions.port || conditions.transport || conditions.dnsComplete) };
}
export function cidrContains(cidr: string, value: string): boolean {
  const ip = parseIP(value); if (!ip) return false;
  try { const [net, bits] = ipaddr.parseCIDR(cidr); return ip.kind() === net.kind() && ip.match(net, bits); } catch { return false; }
}
export function validateCIDR(value: string, family: 'ipv4' | 'ipv6'): boolean {
  try {
    const parts = value.split('/');
    if (parts.length !== 2 || !/^\d+$/.test(parts[1]) || !parseIP(parts[0])) return false;
    const [ip] = ipaddr.parseCIDR(value); return ip.kind() === family;
  } catch { return false; }
}
