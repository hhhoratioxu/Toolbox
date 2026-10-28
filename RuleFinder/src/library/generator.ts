import { stringify } from 'yaml';
import { strToU8, zipSync } from 'fflate';
import { normalizeDomain, parseIP } from '../core/input';
import { clientNames, findEntry, libraryClients, rawURL } from './catalog';
import type { CatalogSnapshot, LibraryClient } from './catalog';

export type RulePolicy = 'DIRECT' | 'REJECT' | 'GROUP';
export interface RuleChoice { category: string; policy: RulePolicy }
export interface HTTPNode { server: string; port: string; username: string; password: string }
export interface GeneratorOptions {
  client: LibraryClient; choices: RuleChoice[]; finalPolicy: RulePolicy;
  interval: number; mode: 'full' | 'snippet'; node?: HTTPNode;
}
export interface GeneratedConfig { filename: string; content: string; warnings: string[] }
const GROUP = '节点选择';
const NODE = '我的HTTP代理';
const policies = new Set(['DIRECT', 'REJECT', 'GROUP']);

function ini(value: string): string {
  if (/[\x00-\x1f\x7f]/.test(value)) throw new Error('配置字段不能包含换行或控制字符');
  return /[,"'\\#;=\s]/.test(value) || !value ? JSON.stringify(value) : value;
}
export function validateNode(node?: HTTPNode) {
  if (!node) return;
  const ip = parseIP(node.server.trim());
  const server = ip?.toString() ?? normalizeDomain(node.server);
  if (!/^\d+$/.test(node.port) || +node.port < 1 || +node.port > 65535) throw new Error('代理节点端口必须为 1–65535');
  if (node.username.length > 256 || node.password.length > 1024 || /[\x00-\x1f\x7f]/.test(node.username + node.password)) throw new Error('代理凭据过长或包含控制字符');
  return { name: NODE, server, port: +node.port, ...(node.username ? { username: node.username } : {}), ...(node.password ? { password: node.password } : {}) };
}
export function generateConfig(snapshot: CatalogSnapshot, options: GeneratorOptions): GeneratedConfig {
  const { client, choices, finalPolicy, interval, mode } = options;
  if (!libraryClients.includes(client)) throw new Error('未支持的配置客户端');
  if (!Number.isInteger(interval) || interval < 3600 || interval > 604800) throw new Error('更新间隔必须为 3600–604800 秒');
  if (!choices.length) throw new Error('先选择至少一个规则分类');
  if (choices.length > 500 || new Set(choices.map(c => c.category)).size !== choices.length) throw new Error('选择的规则分类重复或过多');
  if (!policies.has(finalPolicy) || choices.some(c => !policies.has(c.policy))) throw new Error('未识别的策略绑定');
  const node = mode === 'full' ? validateNode(options.node) : undefined;
  const resolvePolicy = (p: RulePolicy) => p === 'GROUP' ? GROUP : client === 'QuantumultX' ? p.toLowerCase() : p;
  const bindings = choices.map(choice => {
    const entry = findEntry(snapshot, choice.category, client);
    if (!entry?.supported) throw new Error(`${choice.category} 没有可生成的 ${clientNames[client]} 原生文件，请更新目录或调整选择`);
    return { category: choice.category, url: rawURL(entry), policy: resolvePolicy(choice.policy) };
  });
  const warnings: string[] = [];
  if (mode === 'full' && !node) warnings.push('未填写代理节点：节点选择组当前只有 DIRECT。需要代理时请填写自己的 HTTP 节点，或在客户端添加节点后修改组成员。');
  if (mode === 'snippet') warnings.push('这是分流片段；使用「节点选择」时，现有配置必须已经定义同名策略组。');
  if (node) warnings.push('HTTP 节点仅支持 TCP；未测试节点连通性。凭据只在当前页面内存与下载文件中，不写入规则工作区。');
  if (client === 'Shadowrocket') warnings.push('Shadowrocket 为兼容格式导出；完整官方配置规范未取得，尚未做原生客户端导入验收。');
  const header = [
    '# Rule Finder · ' + clientNames[client], '# Rules repository: ' + snapshot.repository + '/' + snapshot.branch,
    '# Catalog checked: ' + snapshot.checkedAt, '# Catalog commit: ' + snapshot.commit,
    '# Rule URLs follow main. Refresh rule subscriptions in the client to receive repository updates.',
    ...warnings.map(w => '# ' + w), '',
  ].join('\n');
  let body: string;
  if (client === 'Clash') {
    const providers: Record<string, unknown> = {};
    const rules = bindings.map((b, i) => {
      const key = `rf_${String(i + 1).padStart(3, '0')}`;
      providers[key] = { type: 'http', behavior: 'classical', format: 'yaml', url: b.url, path: `./rule-providers/${key}.yaml`, interval };
      return `RULE-SET,${key},${b.policy}`;
    });
    rules.push(`MATCH,${resolvePolicy(finalPolicy)}`);
    body = stringify({ ...(mode === 'full' ? {
      'mixed-port': 7890, 'allow-lan': false, mode: 'rule', 'log-level': 'info',
      proxies: node ? [{ ...node, type: 'http' }] : [],
      'proxy-groups': [{ name: GROUP, type: 'select', proxies: node ? [NODE, 'DIRECT'] : ['DIRECT'] }],
    } : {}), 'rule-providers': providers, rules }, { lineWidth: 0 });
  } else if (client === 'Egern') {
    body = stringify({ ...(mode === 'full' ? {
      allow_external_connections: false, proxies: node ? [{ http: node }] : [],
      policy_groups: [{ select: { name: GROUP, policies: node ? [NODE, 'DIRECT'] : ['DIRECT'] } }],
    } : {}), rules: [
      ...bindings.map(b => ({ rule_set: { match: b.url, policy: b.policy, update_interval: interval } })),
      { default: { policy: resolvePolicy(finalPolicy) } },
    ] }, { lineWidth: 0 });
  } else if (client === 'QuantumultX') {
    const address = node?.server.includes(':') ? `[${node.server}]` : node?.server;
    // QX's native node syntax is key=value and differs from Loon's positional credentials.
    const server = node ? `http=${address}:${node.port}${node.username ? `, username=${ini(node.username)}` : ''}${node.password ? `, password=${ini(node.password)}` : ''}, over-tls=false, tag=${NODE}` : '';
    body = [
      ...(mode === 'full' ? ['[general]', '', '[dns]', '', '[server_local]', server, '', '[policy]', `static=${GROUP},${node ? NODE + ',' : ''}direct`, ''] : []),
      '[filter_remote]', ...bindings.map(b => `${b.url}, tag=${ini(b.category)}, force-policy=${b.policy}, update-interval=${interval}, enabled=true`),
      '', '[filter_local]', `final,${resolvePolicy(finalPolicy)}`, '',
    ].join('\n');
  } else {
    const server = node ? `${NODE} = http,${node.server},${node.port}${node.username || node.password ? `,${ini(node.username ?? '')},${ini(node.password ?? '')}` : ''}` : '';
    const start = mode === 'full' ? ['[General]', 'dns-server = system', '', '[Proxy]', server, '', '[Proxy Group]', `${GROUP} = select,${node ? NODE + ',' : ''}DIRECT`, ''] : [];
    if (client === 'Loon') body = [...start, '[Rule]', `FINAL,${resolvePolicy(finalPolicy)}`, '', '[Remote Rule]', ...bindings.map(b => `${b.url},policy=${b.policy},tag=${ini(b.category)},enabled=true`), ''].join('\n');
    else body = [...start, '[Rule]', ...bindings.map(b => `RULE-SET,${b.url},${b.policy}${client === 'Surge' ? `,update-interval=${interval}` : ''}`), `FINAL,${resolvePolicy(finalPolicy)}`, ''].join('\n');
    if (client === 'Loon' || client === 'Shadowrocket') warnings.push('该客户端的规则更新周期由客户端管理；导出的规则 URL 跟随 main，工具不捏造更新周期参数。');
  }
  const suffix = ['Clash', 'Egern'].includes(client) ? 'yaml' : 'conf';
  return { filename: `RuleFinder-${client}${mode === 'snippet' ? '-rules' : ''}.${suffix}`, content: header + body, warnings };
}
export function generateAll(snapshot: CatalogSnapshot, options: Omit<GeneratorOptions, 'client'>): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const notes = ['Rule Finder 多客户端配置', '规则 URL 跟随 hhhoratioxu/Proxy/main；在客户端刷新订阅即可获取修改。', '仓库新增分类需回到工具更新目录、重新选择并生成配置；旧配置不会自动订阅新分类。', '配置生成不代表该客户端已支持规则模拟。', ''];
  for (const client of libraryClients) {
    const result = generateConfig(snapshot, { ...options, client });
    files[result.filename] = strToU8(result.content);
    notes.push(clientNames[client], ...result.warnings.map(w => '- ' + w), '');
  }
  files['使用说明.txt'] = strToU8(notes.join('\n'));
  return zipSync(files, { level: 6 });
}
