import { describe, expect, it } from 'vitest';
import { cidrContains, normalizeTarget, parseIP } from '../src/core/input';
describe('输入规范化', () => {
  it('规范化大小写和末尾点并保留原输入', () => { const r = normalizeTarget('API.Example.COM.'); expect(r.hostname).toBe('api.example.com'); expect(r.raw).toBe('API.Example.COM.'); expect(r.port).toBeUndefined(); expect(r.transport).toBeUndefined(); });
  it('提取 URL 的 host、端口、路径和查询', () => { const r = normalizeTarget('https://API.Example.COM.:8443/path?foo=bar'); expect(r.hostname).toBe('api.example.com'); expect(r.port).toBe(8443); expect(r.url).toBe('https://api.example.com:8443/path?foo=bar'); });
  it('HTTPS 推导端口但不推断 TCP', () => { const r = normalizeTarget('https://example.com/path'); expect(r.port).toBe(443); expect(r.transport).toBeUndefined(); });
  it('支持 IDN / Punycode', () => expect(normalizeTarget('https://例子.测试/a').hostname).toBe('xn--fsqu00a.xn--0zwm56d'));
  it.each(['2001:db8::1', '[2001:db8::1]', 'https://[2001:db8::1]:8443/path'])('识别 IPv6：%s', input => expect(normalizeTarget(input).ip).toBe('2001:db8::1'));
  it('支持带方括号 IPv6 的独立端口', () => { const r = normalizeTarget('[2001:db8::1]:443'); expect(r.ip).toBe('2001:db8::1'); expect(r.port).toBe(443); });
  it('支持 hostname:port', () => { const r = normalizeTarget('example.com:80'); expect(r.hostname).toBe('example.com'); expect(r.port).toBe(80); });
  it.each(['', 'a b.com', '999.0.0.1', 'https://127.1/a', 'https://0x7f000001/', 'https://010.0.0.1/', 'https://u:password@example.com', '[fe80::1%en0]'])('拒绝含糊或无效输入：%s', input => expect(() => normalizeTarget(input)).toThrow());
  it('验证高级条件，不默认为已知', () => { expect(normalizeTarget('example.com').ips).toEqual([]); expect(() => normalizeTarget('example.com', { port: '65536' })).toThrow(); expect(() => normalizeTarget('example.com', { ips: 'invalid' })).toThrow(); const r = normalizeTarget('example.com', { ips: '203.0.113.8, 2001:db8::1', port: '443', transport: 'UDP', dnsComplete: true }); expect(r.ips).toHaveLength(2); expect(r.transport).toBe('UDP'); expect(r.conditionsChanged).toBe(true); });
});
describe('CIDR 边界', () => {
  it.each([
    ['203.0.113.0/24', '203.0.113.0', true], ['203.0.113.0/24', '203.0.113.255', true], ['203.0.113.0/24', '203.0.114.0', false],
    ['203.0.113.8/32', '203.0.113.8', true], ['203.0.113.8/32', '203.0.113.9', false], ['0.0.0.0/0', '255.255.255.255', true],
    ['2001:db8::/32', '2001:db8::', true], ['2001:db8::/32', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff', true], ['2001:db8::/32', '2001:db9::', false],
    ['2001:db8::1/128', '2001:db8::1', true], ['2001:db8::1/128', '2001:db8::2', false], ['::/0', 'ffff::1', true],
    ['::/0', '203.0.113.8', false], ['203.0.113.0/24', '::ffff:203.0.113.8', false]
  ])('%s / %s => %s', (cidr, ip, expected) => expect(cidrContains(cidr, ip)).toBe(expected));
  it('拒绝非法 IP', () => expect(parseIP('256.0.0.1')).toBeUndefined());
});
