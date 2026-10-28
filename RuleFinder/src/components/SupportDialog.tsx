import { CheckCircle2, CircleHelp, ExternalLink, ShieldCheck } from 'lucide-react';
import { Modal } from './Shared';
export function SupportDialog({ onClose }: { onClose: () => void }) {
  return <Modal title="支持范围与模拟边界" subtitle="Rule Finder 1.0 · 首版只开放 Loon 适配器" onClose={onClose} wide>
    <div className="support-content"><div className="info-box"><ShieldCheck size={20} /><div><strong>本地计算，不访问查询目标</strong><p>配置解析、原文搜索和批量匹配在 Web Worker 中执行。只有你添加或加载远程引用时，浏览器才请求相应文件；不使用代理中转，不上传完整配置。</p></div></div>
      <h3><CheckCircle2 size={17} />已实现</h3><table className="support-table"><tbody><tr><th>输入</th><td>域名、URL、IPv4、IPv6、方括号 IPv6 与端口；大小写、末尾点、IDN 转 Punycode。URL 的 HTTP / HTTPS 端口可确定；传输协议需单独提供。</td></tr><tr><th>规则</th><td>DOMAIN、DOMAIN-SUFFIX（标签边界）、DOMAIN-KEYWORD、IP-CIDR、IP-CIDR6、FINAL；DEST-PORT 的单端口、闭区间和比较式；PROTOCOL 的 TCP / UDP。</td></tr><tr><th>文件与引用</th><td>.list / .txt 的 Loon 原生规则；.conf 的 [Rule] / [Remote Rule] / [Proxy Group] / [Plugin]；.lpx / .plugin 的 [Rule]。远程规则在引用处绑定策略；引用 URL 必须完全对应。</td></tr><tr><th>匹配顺序</th><td>按 Loon 3.0.3+ 文档：域名请求先判断域名阶段，再判断 IP / 其他规则；每阶段本地 → 插件 → 订阅，同来源按配置位置；FINAL 最后。域名精确规则不会自动压过更早的后缀规则。</td></tr><tr><th>no-resolve</th><td>按 Loon 官方说明只匹配 IP 字面量请求；域名请求即使补充 DNS IP 也跳过。无此参数的 IP 规则需要目标 IP；多 IP 结果不一致或 DNS 集合不完整时保持无法判断。</td></tr></tbody></table>
      <h3><CircleHelp size={17} />保留原文，明确显示无法判断</h3><p>DOMAIN-WILDCARD、GEOIP、IP-ASN、GEOSITE、逻辑表达式 AND / OR / NOT、HTTP / 进程 / 脚本规则、未知参数、资源解析器和二进制数据库尚未模拟。未知或混合类型按可能的最早匹配阶段保守阻断；更早的未知项不会被后面的 FINAL 掩盖。</p>
      <p>规则模拟假定请求已进入 Loon 的规则引擎、且客户端处于规则模式。General 路由绕过、Host / DNS 覆盖、IP Rewrite、MITM、Rewrite、脚本和节点可用性不在本版模拟范围；这些配置原文仍保留。不将结果当作设备实测或实际连接保证。</p>
      <p>策略组只展示类型与静态成员；没有客户端运行状态，无法获知 select / url-test / fallback 当前节点。停用来源或补充高级条件后，结果标记为当前模拟结果。远程来源只加载手动触发的快照，不自动定时更新。</p>
      <p>单文件上限 5 MiB，工作区最多 40 个来源、总原文约 30 MiB，单次批量最多 200 行。浏览器跨域失败通常无法可靠区分 CORS、证书和断网；显示可确定的错误类别，并提供离线替代入口。</p>
      <h3>适配器边界与官方依据</h3><p>Surge 的逐行顺序、pre-matching、RULE-SET 参数与 Mihomo 的 YAML、rule-providers、MATCH 均需要独立适配，首版不会套用 Loon 语义。导入 YAML 会保留原文并标记未支持。</p>
      <div className="docs-links"><a href="https://nsloon.app/docs/Rule/" target="_blank" rel="noreferrer">Loon 规则文档 <ExternalLink size={13} /></a><a href="https://manual.nssurge.com/rules/overview.html" target="_blank" rel="noreferrer">Surge 规则文档 <ExternalLink size={13} /></a><a href="https://wiki.metacubex.one/en/config/rules/" target="_blank" rel="noreferrer">Mihomo 规则文档 <ExternalLink size={13} /></a></div>
    </div><div className="modal-footer"><span>文档核对：2026-10-28</span><button className="primary" onClick={onClose}>了解，开始使用</button></div>
  </Modal>;
}
