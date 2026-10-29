import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { bundledCatalog, libraryClients } from '../src/library/catalog';
import { findSoftware, preferredSoftware } from '../src/library/software';
import { writeRules } from '../src/library/rule-writer';
import type { WriterOptions } from '../src/library/rule-writer';
import { parseLoon } from '../src/core/adapters/loon-parser';

const options: WriterOptions = { client: 'Loon', policy: 'GROUP', groupName: '我的代理', target: { kind: 'category', category: 'Spotify' } };
describe('按软件查找真实分类', () => {
  it.each([
    ['ChatGPT', 'AI'], ['ＣｈａｔＧＰＴ', 'AI'], ['Claude', 'AI'], ['深度求索', 'AI'],
    ['油管', 'Google'], ['Gmail', 'Google'], ['苹果智能', 'SiriAI'], ['苹果', 'Apple'],
    ['声破天', 'Spotify'], ['电报', 'Telegram'], ['小红书', 'Xiaohongshu'], ['网飞', 'Netflix'],
    ['微信', 'WeChat'], ['OneDrive', 'Microsoft'], ['Instagram', 'Meta'], ['国际版抖音', 'TikTok'],
  ])('%s 对应 %s，别名不产生新的域名', (input, category) => {
    expect(preferredSoftware(findSoftware(input, bundledCatalog))?.category).toBe(category);
  });
  it('共享分类明确说明范围', () => {
    const match = preferredSoftware(findSoftware('ChatGPT', bundledCatalog))!;
    expect(match.shared).toBe(true); expect(match.reason).toContain('AI');
  });
  it('国内抖音不误当成 TikTok，未知软件不编造规则', () => {
    expect(findSoftware('抖音', bundledCatalog)).toEqual([]);
    expect(findSoftware('不存在的神奇软件', bundledCatalog)).toEqual([]);
  });
  it('单字母 X 不误命中其他含 x 的分类', () => expect(findSoftware('X', bundledCatalog).map(m => m.category)).toEqual(['Twitter']));
  it('多个模糊候选要求选择，不自动采用第一个', () => {
    const matches = findSoftware('Parsec', bundledCatalog);
    expect(preferredSoftware(matches)?.category).toBe('Parsec');
    const partial = findSoftware('Par', bundledCatalog);
    expect(partial).toHaveLength(2); expect(preferredSoftware(partial)).toBeUndefined();
  });
  it('目录新增类别无需改别名代码，专用分类优先于共享别名', () => {
    const snapshot = { ...bundledCatalog, files: [...bundledCatalog.files,
      { path: 'Loon/rule/NewApp.lsr', sha: 'a'.repeat(40), size: 1 },
      { path: 'Loon/rule/ChatGPT.lsr', sha: 'b'.repeat(40), size: 1 },
    ] };
    expect(preferredSoftware(findSoftware('NewApp', snapshot))?.category).toBe('NewApp');
    expect(preferredSoftware(findSoftware('ChatGPT', snapshot))?.category).toBe('ChatGPT');
  });
  it('已删除分类不再通过旧别名出现在搜索结果', () => {
    const snapshot = { ...bundledCatalog, files: bundledCatalog.files.filter(f => !f.path.includes('/AI.')) };
    expect(findSoftware('ChatGPT', snapshot)).toEqual([]);
  });
});

describe('一键生成原生分流片段', () => {
  it.each(libraryClients)('%s 只使用对应原生引用，不加兜底、节点或策略组定义', client => {
    const file = writeRules(bundledCatalog, { ...options, client });
    expect(file.content).toContain(`/main/${client}/rule/Spotify.`);
    expect(file.content).toContain('我的代理');
    expect(file.content).not.toMatch(/^(FINAL|MATCH|final)[,:]/m);
    expect(file.content).not.toContain('[Proxy]'); expect(file.content).not.toContain('[Proxy Group]');
    expect(file.warnings.join()).toContain('整个 Spotify 分类');
  });
  it('Loon 片段再解析得到真实订阅策略，且没有 FINAL', () => {
    const file = writeRules(bundledCatalog, options);
    const source = parseLoon({ id: 'writer', name: file.filename, content: file.content, origin: 'paste' });
    expect(source.references).toHaveLength(1); expect(source.references[0].policy).toBe('我的代理');
    expect(source.rules).toHaveLength(0);
  });
  it('Mihomo provider 名称与缓存路径由来源确定，不与其他分类冲突', () => {
    const a = parse(writeRules(bundledCatalog, { ...options, client: 'Clash' }).content);
    const b = parse(writeRules(bundledCatalog, { ...options, client: 'Clash', target: { kind: 'category', category: 'AI' } }).content);
    expect(Object.keys(a['rule-providers'])[0]).not.toBe(Object.keys(b['rule-providers'])[0]);
    expect(a.rules).toHaveLength(1); expect(a.proxies).toBeUndefined();
  });
  it('Quantumult X 内建策略小写；策略组名保留，不能混用客户端语法', () => {
    const file = writeRules(bundledCatalog, { ...options, client: 'QuantumultX', policy: 'DIRECT' });
    expect(file.content).toContain('force-policy=direct'); expect(file.content).toContain('[filter_remote]');
    expect(file.content).not.toContain('RULE-SET,');
  });
  it.each(libraryClients)('%s 支持用户自己提供的域名，不请求或猜测软件域名', client => {
    const file = writeRules(bundledCatalog, { ...options, client, target: { kind: 'domain', input: 'https://API.Example.com.:443/path?q=1', exact: false } });
    expect(file.content).toContain('api.example.com'); expect(file.sourceURL).toBeUndefined();
    expect(file.content).not.toContain('/path'); expect(file.content).not.toContain('?q=1');
  });
  it('精确模式与后缀模式分别序列化为 Egern 原生对象', () => {
    const suffix = parse(writeRules(bundledCatalog, { ...options, client: 'Egern', target: { kind: 'domain', input: 'example.com', exact: false } }).content);
    const exact = parse(writeRules(bundledCatalog, { ...options, client: 'Egern', target: { kind: 'domain', input: 'example.com', exact: true } }).content);
    expect(suffix.rules).toEqual([{ domain_suffix: { match: 'example.com', policy: '我的代理' } }]);
    expect(exact.rules).toEqual([{ domain: { match: 'example.com', policy: '我的代理' } }]);
  });
  it('IDN 域名转 Punycode，QX 精确匹配使用 host', () => {
    const file = writeRules(bundledCatalog, { ...options, client: 'QuantumultX', target: { kind: 'domain', input: '例子.测试', exact: true } });
    expect(file.content).toContain('host,xn--fsqu00a.xn--0zwm56d,我的代理');
  });
  it.each(['ChatGPT', '微信', '203.0.113.8', '2001:db8::1', 'https://u:p@example.com', 'bad.example,FINAL,DIRECT'])('拒绝把 %s 写成凭空推断的域名规则', input => {
    expect(() => writeRules(bundledCatalog, { ...options, target: { kind: 'domain', input, exact: false } })).toThrow();
  });
  it.each(['', 'a\n[Rule]', 'a,b', 'a#b', 'a=b', 'a"b', 'DIRECT', 'reject'])('拒绝无效或可注入的策略组名 %s', groupName => {
    expect(() => writeRules(bundledCatalog, { ...options, groupName })).toThrow();
  });
  it('允许常见中文、空格与 emoji 策略组名，INI 正确加引号', () => {
    expect(writeRules(bundledCatalog, { ...options, groupName: '🚀 节点选择' }).content).toContain('policy="🚀 节点选择"');
  });
  it('当前客户端没有原生文件时阻止生成，不回退到其他客户端文件', () => {
    const snapshot = { ...bundledCatalog, files: bundledCatalog.files.filter(f => f.path !== 'Loon/rule/Spotify.lsr') };
    expect(() => writeRules(snapshot, options)).toThrow('原生规则文件');
  });
});
