import { describe, expect, it } from 'vitest';
import { parseLoon, parseRule } from '../src/core/adapters/loon-parser';
import { tokenize } from '../src/core/syntax';
const parse = (content: string) => parseLoon({ id: 's', name: 'rules', content, origin: 'paste' });
describe('保留原文的 Loon 解析', () => {
  it('注释和空行不改变真实行号，包括 CRLF', () => { const text = '# 注释\r\n\r\nDOMAIN,example.com\r\n; comment\r\nDOMAIN-SUFFIX,example.net\r\n'; const s = parse(text); expect(s.content).toBe(text); expect(s.rules.map(r => r.line)).toEqual([3, 5]); expect(s.rules[0].raw).toBe('DOMAIN,example.com'); expect(s.rules[0].id).toBe(parse(text).rules[0].id); });
  it('解析引号内逗号、转义与内嵌逻辑', () => { expect(tokenize('URL-REGEX,"^https://a.test/(a,b)","代理,一" # 注释').fields).toEqual(['URL-REGEX', '^https://a.test/(a,b)', '代理,一']); const logic = 'AND,((DOMAIN,example.com),(DEST-PORT,443)),DIRECT'; expect(tokenize(logic).fields).toHaveLength(3); expect(parse(logic).rules[0]).toMatchObject({ raw: logic, type: 'AND', supported: false, policy: 'DIRECT' }); });
  it('未闭合引号与括号标记无法判断', () => { expect(parse('AND,((DOMAIN,example.com),DIRECT').rules[0].issue).toContain('括号'); expect(parse('DOMAIN,"example.com,DIRECT').rules[0].issue).toContain('引号'); });
  it('不把 no-resolve 当成策略', () => { const r = parse('IP-CIDR,203.0.113.0/24,no-resolve').rules[0]; expect(r.policy).toBeUndefined(); expect(r.params).toEqual(['no-resolve']); });
  it('解析主配置的引用、策略绑定、组和真实位置', () => { const s = parse('[Proxy Group]\n海外 = select, 香港, 日本, interval=300\n[Rule]\nFINAL,海外\n\n[Remote Rule]\nhttps://example.com/r.list,policy=海外,tag=示例,enabled=true\n[Plugin]\nhttps://example.com/p.lpx,enabled=false'); expect(s.format).toBe('loon-config'); expect(s.references[0]).toMatchObject({ line: 7, policy: '海外', kind: 'subscription' }); expect(s.references[1].enabled).toBe(false); expect(s.groups[0]).toMatchObject({ name: '海外', type: 'select', members: ['香港', '日本'] }); });
  it('支持官方的 URL,策略 订阅格式', () => expect(parse('[Remote Rule]\nhttps://example.com/r.list,PROXY').references[0].policy).toBe('PROXY'));
  it('未知规则和参数不静默丢弃', () => { const s = parse('SCRIPT,abc,Proxy\nDOMAIN,example.com,DIRECT,unknown-flag'); expect(s.rules).toHaveLength(2); expect(s.diagnostics).toHaveLength(2); expect(s.rules.every(r => !r.supported)).toBe(true); });
  it('YAML 原文保留但不伪装支持', () => { const s = parse('rules:\n  - MATCH,DIRECT'); expect(s.status).toBe('unsupported'); expect(s.content).toContain('MATCH'); expect(s.rules.every(r => !r.supported)).toBe(true); });
  it('CIDR 与端口格式严格校验', () => { for (const line of ['IP-CIDR,203.0.113.0/33', 'IP-CIDR6,2001:db8::/129', 'DEST-PORT,65536,DIRECT', 'DEST-PORT,443-80,DIRECT']) expect(parseRule(line, 's', 1, '').supported).toBe(false); });
  it('缺失策略的主配置规则不能成为确定策略', () => expect(parse('[Rule]\nDOMAIN,example.com').rules[0].issue).toContain('缺少策略'));
});
