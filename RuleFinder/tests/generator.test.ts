import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { strFromU8, unzipSync } from 'fflate';
import { bundledCatalog, libraryClients } from '../src/library/catalog';
import { generateAll, generateConfig } from '../src/library/generator';
import type { GeneratorOptions } from '../src/library/generator';
import { parseLoon } from '../src/core/adapters/loon-parser';
import { tokenize } from '../src/core/syntax';

const options: Omit<GeneratorOptions, 'client'> = {
  choices: [{ category: 'AI', policy: 'GROUP' }, { category: 'LAN', policy: 'DIRECT' }, { category: 'Parsec', policy: 'REJECT' }],
  finalPolicy: 'DIRECT', interval: 86400, mode: 'full',
};
describe('六客户端原生配置生成', () => {
  it.each(libraryClients)('%s 使用自己的原生规则地址，跟随 main 更新', client => {
    const file = generateConfig(bundledCatalog, { ...options, client });
    expect(file.content).toContain(`/main/${client}/rule/AI.`);
    for (const other of libraryClients.filter(c => c !== client)) expect(file.content).not.toContain(`/main/${other}/rule/`);
    expect(file.content).toContain('节点选择');
    expect(file.content).not.toContain('MOCK');
    expect(file.warnings.join()).toContain('未填写代理节点');
  });
  it('Loon 原生 Remote Rule 保留绑定，生成内容可以由已实现适配器解析', () => {
    const file = generateConfig(bundledCatalog, { ...options, client: 'Loon' });
    const parsed = parseLoon({ id: 'generated', name: file.filename, content: file.content, origin: 'paste' });
    expect(parsed.status).toBe('ready'); expect(parsed.references).toHaveLength(3);
    expect(parsed.references.map(r => r.policy)).toEqual(['节点选择', 'DIRECT', 'REJECT']);
    expect(parsed.rules.find(r => r.type === 'FINAL')?.policy).toBe('DIRECT');
    expect(parsed.groups[0].members).toEqual(['DIRECT']);
  });
  it('Surge 严格使用 RULE-SET 行，FINAL 位于最后', () => {
    const body = generateConfig(bundledCatalog, { ...options, client: 'Surge' }).content;
    const ruleLines = body.split('[Rule]\n')[1].trim().split('\n');
    expect(ruleLines).toHaveLength(4); expect(ruleLines.at(-1)).toBe('FINAL,DIRECT');
    expect(tokenize(ruleLines[0]).fields).toEqual(['RULE-SET', 'https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list', '节点选择', 'update-interval=86400']);
  });
  it('Mihomo 提供 classical YAML providers、唯一缓存路径与 MATCH', () => {
    const obj = parse(generateConfig(bundledCatalog, { ...options, client: 'Clash' }).content);
    const providers = Object.values(obj['rule-providers']) as Record<string, unknown>[];
    expect(providers).toHaveLength(3);
    expect(providers.every(p => p.behavior === 'classical' && p.format === 'yaml' && p.type === 'http' && p.interval === 86400)).toBe(true);
    expect(new Set(providers.map(p => p.path)).size).toBe(3);
    expect(obj.rules.at(-1)).toBe('MATCH,DIRECT'); expect(obj['allow-lan']).toBe(false);
    expect(obj['proxy-groups'][0].proxies).toEqual(['DIRECT']);
  });
  it('Egern 使用独立规则对象与 default，不套用 Mihomo YAML', () => {
    const obj = parse(generateConfig(bundledCatalog, { ...options, client: 'Egern' }).content);
    expect(obj.rules[0].rule_set).toMatchObject({ policy: '节点选择', update_interval: 86400 });
    expect(obj.rules.at(-1)).toEqual({ default: { policy: 'DIRECT' } });
    expect(obj.policy_groups[0].select.policies).toEqual(['DIRECT']);
    expect(obj['rule-providers']).toBeUndefined();
  });
  it('Quantumult X 使用 filter_remote / force-policy 与小写内建策略', () => {
    const body = generateConfig(bundledCatalog, { ...options, client: 'QuantumultX' }).content;
    expect(body).toContain('[filter_remote]'); expect(body).toContain('force-policy=direct');
    expect(body).toContain('force-policy=reject'); expect(body).toContain('final,direct');
    expect(body).toContain('static=节点选择,direct'); expect(body).not.toContain('RULE-SET,');
  });
  it('用户调整的顺序和策略保留，不按分类名猜测策略', () => {
    const choices = [...options.choices].reverse();
    const body = generateConfig(bundledCatalog, { ...options, client: 'Surge', choices }).content;
    expect(body.indexOf('/Parsec.list')).toBeLessThan(body.indexOf('/AI.list'));
    expect(body).toContain('/LAN.list,DIRECT'); expect(body).toContain('/Parsec.list,REJECT');
  });
  it.each(['Clash', 'Egern'] as const)('%s 分流片段不定义或覆盖代理节点', client => {
    const obj = parse(generateConfig(bundledCatalog, { ...options, client, mode: 'snippet' }).content);
    expect(obj.proxies).toBeUndefined(); expect(obj.policy_groups).toBeUndefined(); expect(obj['proxy-groups']).toBeUndefined();
  });
  it('Shadowrocket 明确兼容配置的验收边界', () => expect(generateConfig(bundledCatalog, { ...options, client: 'Shadowrocket' }).warnings.join()).toContain('尚未做原生客户端'));
  it.each(libraryClients)('%s 可填写 HTTP 节点，无虚构地址或名称引用', client => {
    const body = generateConfig(bundledCatalog, { ...options, client, node: { server: 'proxy.example.com', port: '8080', username: 'u', password: 'p' } }).content;
    expect(body).toContain('proxy.example.com'); expect(body).toContain('8080'); expect(body).toContain('我的HTTP代理');
  });
  it('凭据中的逗号按 INI 引号处理，换行禁止注入配置段', () => {
    const node = { server: 'proxy.example.com', port: '8080', username: 'u,a', password: 'p,b' };
    const body = generateConfig(bundledCatalog, { ...options, client: 'Loon', node }).content;
    expect(body).toContain('"u,a","p,b"');
    expect(() => generateConfig(bundledCatalog, { ...options, client: 'Surge', node: { ...node, password: 'a\n[Rule]' } })).toThrow('控制字符');
  });
  it('YAML 由序列化器正确处理特殊字符，IPv6 HTTP 地址符合原生格式', () => {
    const node = { server: '2001:db8::1', port: '8080', username: 'a:b', password: 'p,#[]' };
    const obj = parse(generateConfig(bundledCatalog, { ...options, client: 'Clash', node }).content);
    expect(obj.proxies[0]).toMatchObject({ server: '2001:db8::1', password: 'p,#[]', type: 'http' });
    expect(generateConfig(bundledCatalog, { ...options, client: 'QuantumultX', node }).content).toContain('http=[2001:db8::1]:8080');
  });
  it('分类已删除或客户端没有对应文件时阻止静默丢失', () => {
    expect(() => generateConfig(bundledCatalog, { ...options, client: 'Loon', choices: [{ category: 'Missing', policy: 'DIRECT' }] })).toThrow('没有可生成');
  });
  it('拒绝空选择、重复分类、无效端口和策略注入', () => {
    expect(() => generateConfig(bundledCatalog, { ...options, client: 'Loon', choices: [] })).toThrow();
    expect(() => generateConfig(bundledCatalog, { ...options, client: 'Loon', choices: [options.choices[0], options.choices[0]] })).toThrow();
    expect(() => generateConfig(bundledCatalog, { ...options, client: 'Loon', finalPolicy: 'UNKNOWN' as never })).toThrow();
    expect(() => generateConfig(bundledCatalog, { ...options, client: 'Loon', node: { server: 'a.test', port: '65536', username: '', password: '' } })).toThrow();
  });
  it('六端 ZIP 实际包含六个不同的配置和使用说明', () => {
    const result = unzipSync(generateAll(bundledCatalog, options));
    expect(Object.keys(result)).toHaveLength(7);
    for (const client of libraryClients) {
      const name = Object.keys(result).find(name => name.startsWith(`RuleFinder-${client}.`))!;
      expect(strFromU8(result[name])).toContain(`/main/${client}/rule/AI.`);
    }
    expect(strFromU8(result['使用说明.txt'])).toContain('新增分类');
  });
});
