import { parseLoon } from './core/adapters/loon-parser';
export const DEMO_CONFIG = `# Rule Finder 内置示例 · 所有域名与地址仅用于说明
# 示例来源 example:// 不触发网络请求
[General]
ipv6 = true

[Proxy Group]
海外服务 = select, 香港节点, 日本节点

[Rule]
# 本地精确规则先于插件与订阅中的域名规则
DOMAIN,api.example.com,DIRECT
DOMAIN-SUFFIX,local.example,DIRECT

# 域名不匹配时才进入 IP / 其他条件判断
IP-CIDR,203.0.113.0/24,DIRECT,no-resolve
IP-CIDR6,2001:db8::/32,DIRECT,no-resolve
FINAL,海外服务

[Remote Rule]
example://rules/services.list,policy=海外服务,tag=服务规则,enabled=true

[Plugin]
example://rules/privacy.lpx,enabled=true
`;
export const DEMO_RULES = `# 服务规则 · 规则集本身没有策略绑定

DOMAIN-SUFFIX,example.com
DOMAIN-KEYWORD,example

# 验证域名标签边界：notexample.com 不匹配 example.com 后缀
DOMAIN,cdn.example.net
IP-CIDR,198.51.100.0/24,no-resolve
IP-CIDR6,2001:db8:1234::/48,no-resolve
`;
export const DEMO_PLUGIN = `#!name=隐私规则示例
#!desc=仅提供规则，不执行脚本

[Rule]
DOMAIN,ads.example.com,REJECT
DOMAIN-SUFFIX,tracking.example,REJECT
`;
export function createDemo() {
  return [
    parseLoon({ id: 'demo-config', name: '示例主配置.conf', content: DEMO_CONFIG, filename: 'demo.conf', origin: 'demo', demo: true }),
    parseLoon({ id: 'demo-services', name: '服务规则.list', content: DEMO_RULES, url: 'example://rules/services.list', origin: 'demo', kind: 'subscription', demo: true }),
    parseLoon({ id: 'demo-privacy', name: '隐私规则.lpx', content: DEMO_PLUGIN, url: 'example://rules/privacy.lpx', origin: 'demo', kind: 'plugin', demo: true, formatHint: 'plugin' }),
  ];
}
export const sampleTargets = ['api.example.com', 'ads.example.com', '203.0.113.8', '2001:db8::1'];
