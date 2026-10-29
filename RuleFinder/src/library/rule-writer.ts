import { stringify } from 'yaml';
import { normalizeTarget } from '../core/input';
import { stableHash } from '../core/syntax';
import { clientNames, findEntry, libraryClients, rawURL } from './catalog';
import type { CatalogSnapshot, LibraryClient } from './catalog';
import type { RulePolicy } from './generator';

export type WriterTarget = { kind: 'category'; category: string } | { kind: 'domain'; input: string; exact: boolean };
export interface WriterOptions { client: LibraryClient; policy: RulePolicy; groupName: string; target: WriterTarget }
export interface WrittenRules {
  filename: string; content: string; policy: string; title: string;
  warnings: string[]; instructions: string; sourceURL?: string;
}
function field(value: string) {
  return /[,"'\\#;=\s]/.test(value) ? JSON.stringify(value) : value;
}
export function writerPolicy(options: Pick<WriterOptions, 'client' | 'policy' | 'groupName'>): string {
  if (!libraryClients.includes(options.client)) throw new Error('未支持的配置格式');
  if (!['DIRECT', 'REJECT', 'GROUP'].includes(options.policy)) throw new Error('请选择有效策略');
  if (options.policy !== 'GROUP') return options.client === 'QuantumultX' ? options.policy.toLowerCase() : options.policy;
  const name = options.groupName.trim();
  if (!name || name.length > 100 || /[\x00-\x1f\x7f,"'\\#;=()]/.test(name)) throw new Error('请填写现有策略组名，不能包含逗号、引号、括号、换行或配置分隔符');
  if (/^(direct|reject|reject-drop|final|match)$/i.test(name)) throw new Error('此名称属于客户端内建策略，请直接选择直连或拒绝，或填写其他组名');
  return name;
}
export function writeRules(snapshot: CatalogSnapshot, options: WriterOptions): WrittenRules {
  const { client, target } = options;
  const policy = writerPolicy(options);
  const warnings: string[] = [];
  if (options.policy === 'GROUP') warnings.push(`现有配置需已定义「${policy}」策略组或节点；该名称必须完全相同。工具不会猜测组内当前节点。`);
  if (client === 'Shadowrocket') warnings.push('Shadowrocket 为兼容格式，尚未完成原生客户端导入验收。');
  let title: string, sourceURL: string | undefined, body: string;
  if (target.kind === 'category') {
    const file = findEntry(snapshot, target.category, client);
    if (!file?.supported) throw new Error(`${target.category} 没有当前客户端支持的原生规则文件，请更新规则库或选择其他格式`);
    title = target.category; sourceURL = rawURL(file);
    warnings.push(`引用整个 ${target.category} 分类；不是只匹配某个进程，也不保证覆盖该软件的全部流量。`);
    if (client === 'Clash') {
      const key = `rf_${stableHash(file.path)}`;
      body = stringify({ 'rule-providers': { [key]: {
        type: 'http', behavior: 'classical', format: 'yaml', url: sourceURL,
        path: `./rule-providers/${key}.yaml`, interval: 86400,
      } }, rules: [`RULE-SET,${key},${policy}`] }, { lineWidth: 0 });
    } else if (client === 'Egern') body = stringify({ rules: [{ rule_set: { match: sourceURL, policy, update_interval: 86400 } }] }, { lineWidth: 0 });
    else if (client === 'QuantumultX') body = `[filter_remote]\n${sourceURL}, tag=${field(title)}, force-policy=${field(policy)}, update-interval=86400, enabled=true\n`;
    else if (client === 'Loon') body = `[Remote Rule]\n${sourceURL},policy=${field(policy)},tag=${field(title)},enabled=true\n`;
    else body = `[Rule]\nRULE-SET,${sourceURL},${field(policy)}${client === 'Surge' ? ',update-interval=86400' : ''}\n`;
  } else {
    const normalized = normalizeTarget(target.input);
    if (!normalized.hostname || !normalized.hostname.includes('.')) throw new Error('请填写软件的完整官方域名或网址，例如 api.example.com；软件名称和 IP 不能直接当成域名规则');
    const domain = normalized.hostname; title = domain;
    const type = target.exact ? 'DOMAIN' : 'DOMAIN-SUFFIX';
    warnings.push(`域名由你提供：${domain}。${target.exact ? '仅匹配完整域名。' : '匹配此域名及其子域名。'}路径和端口不写入这条域名规则，不代表软件的完整域名集合。`);
    if (client === 'Clash') body = stringify({ rules: [`${type},${domain},${policy}`] }, { lineWidth: 0 });
    else if (client === 'Egern') body = stringify({ rules: [{ [target.exact ? 'domain' : 'domain_suffix']: { match: domain, policy } }] }, { lineWidth: 0 });
    else if (client === 'QuantumultX') body = `[filter_local]\n${target.exact ? 'host' : 'host-suffix'},${domain},${field(policy)}\n`;
    else body = `[Rule]\n${type},${domain},${field(policy)}\n`;
  }
  const instructions = ['Clash', 'Egern'].includes(client)
    ? '合并到现有 YAML：将 rules 条目放在兜底规则之前；若有 rule-providers，一并合并。保留原节点、策略组和其他规则，勿重复顶层键。'
    : client === 'Loon' && target.kind === 'category'
      ? '将订阅行添加到现有配置的 [Remote Rule] 段；已有同名段时只粘贴下面的条目。Loon 的本地 / 插件规则可能先于该订阅生效。'
      : client === 'QuantumultX'
        ? `将条目合入现有配置的 ${target.kind === 'category' ? '[filter_remote]' : '[filter_local]'} 段；保留现有节点和策略。最终行为仍取决于客户端规则顺序。`
        : '将条目合入现有配置的 [Rule] 段，放在 FINAL 与可能覆盖它的宽泛规则之前；保留现有节点、策略组与兜底规则。';
  const header = [`# Rule Finder · ${clientNames[client]} · ${title}`, '# 分流片段：合入现有配置，不含节点、策略组定义或兜底规则。',
    ...(sourceURL ? [`# Rules follow ${snapshot.repository}/main; catalog ${snapshot.commit.slice(0, 7)}. Refresh subscriptions in the client.`] : []),
    ...warnings.map(w => `# ${w}`), '',
  ].join('\n');
  const suffix = ['Clash', 'Egern'].includes(client) ? 'yaml' : 'conf';
  return { filename: `RuleFinder-${client}-${title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80)}-rules.${suffix}`, content: header + body, policy, title, warnings, instructions, sourceURL };
}
