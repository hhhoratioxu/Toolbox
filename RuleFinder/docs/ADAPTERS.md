# 客户端适配器规范

`src/core/types.ts` 的 `Adapter` 把 `parse`、`evaluate`、`priority` 分为独立契约。规则来源管理、Worker 和 UI 使用共同结构；客户端语法与判断机制各自实现。只有在 `src/core/adapters/index.ts` 注册并交付测试的适配器才能出现在 UI。

| 客户端 | 已核对的官方依据 | 实现状态 |
| --- | --- | --- |
| Loon | [Rule](https://nsloon.app/docs/Rule/)、[domain](https://nsloon.app/docs/Rule/domain_rule/)、[IP](https://nsloon.app/docs/Rule/ip_rule/)、[订阅](https://nsloon.app/docs/Rule/sub_rule/)、[端口](https://nsloon.app/docs/Rule/port_rule/)、[协议](https://nsloon.app/docs/Rule/protocol_rule/) | 原生文本和配置中常用规则；详细范围见 README。 |
| Surge | [Rules Overview](https://manual.nssurge.com/rules/overview.html) | 预留。需要独立处理顺序、pre-matching、RULE-SET / DOMAIN-SET 和自身 no-resolve 参数语义。 |
| Mihomo | [Route Rules](https://wiki.metacubex.one/en/config/rules/) | 预留。需要 YAML / rule-providers、behavior / format、MATCH、UDP 能力等客户端机制。 |

核对日期 2026-10-28。链接变更或客户端新版本需要重新核对。未实现客户端不做语法转换、不提供占位选择项。

## 共同数据约束

- Source 保留原始完整文本、来源类别、URL / 文件名、规则与引用、静态组、加载状态、成功时间和解析提示。
- Rule 保留稳定 ID、sourceId、原始行号（1 起）、raw、类型、值、参数、显式策略、section 与原配置位置。未加载的依赖占位使用内部 `line=0`，界面显示「待加载」，绝不展示成原文件第 0 / 1 行。
- Reference 使用精确 URL 关联，保留引用自己的原始行号、顺序、策略和 enabled。离线替代文件也必须明确绑定 URL，不能按相同文件名猜测。
- Evaluation 为 match / no-match / unknown。未知不能转换为 false；优先规则未知时，后续匹配最多是 candidate。
- 确定性与完整性分开。已确定的本地规则可以先于缺失的低优先级依赖，但缺失依赖仍让匹配明细标为部分结果。
- 策略组保留静态关系；运行时节点缺失不影响已知的策略组名，但不能据此宣称最终节点已确定。

## Loon 首版模型

域名请求采用域名阶段、IP / 其他阶段、FINAL 三阶段；各阶段按 local / plugin / subscription 来源优先级与配置位置排序。不能识别类别的规则和未展开引用可能包含域名条目，因此保守放在最早可能阶段。这可能产生比设备更保守的无法判断，但不会以未知项替代确定的不匹配。

输入为 IP 字面量时域名谓词确定不匹配；no-resolve 对域名目标按官方 Loon 语义跳过。对于没有 no-resolve 的 IP 条件，只使用用户提供的 IP。集合内结论不同或没有确认完整集合，结论为 unknown。

索引只排除明确不可能匹配的已支持 DOMAIN / DOMAIN-SUFFIX，其余规则始终保留求值机会。索引不改变原配置位置和规则优先级。弱引用缓存跟随 Source 对象更新失效。

## 新适配器的发布条件

新增独立目录及官方文档对照，至少通过：域名标签边界、实际客户端顺序、真实行号、IPv4 / IPv6 边界、引用绑定与链路、更高优先级未知传播、依赖失败、独立列表不编造策略、策略组不编造节点、后续匹配不生效解释。未实现的语法必须留在 Source 并显示提示。
