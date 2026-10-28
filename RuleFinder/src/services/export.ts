import type { QueryItem } from './worker';
export function resultSummary(item: QueryItem): string {
  if (!item.result) return `${item.input}：${item.error}`;
  const r = item.result; const row = r.rows.find(x => x.id === (r.effectiveId ?? r.candidateId));
  return [`Rule Finder · ${r.mode === 'simulate' ? '当前模拟结果' : '规则库检索'}`, `输入：${r.target.raw}`, `规范化：${r.target.normalized}`,
    `结论：${r.certainty === 'certain' ? '规则选择确定' : r.certainty === 'library' ? '仅检索，不推断实际策略' : '尚不能确定'}`,
    `策略：${r.policy ?? '未提供策略绑定'}`, `规则依赖：${r.incomplete ? '部分结果，存在未就绪依赖' : '已加载'}`, row ? `规则：${row.rule.raw}` : '', row ? `来源：${row.trace.map(t => `${t.name}:${t.line || '待加载'}`).join(' → ')}` : '',
    ...r.missing.map(x => `缺失 / 限制：${x}`)].filter(Boolean).join('\n');
}
export function toCSV(items: QueryItem[]): string {
  const rows: unknown[][] = [['输入', '规范化目标', '模式', '确定性', '状态', '规则类型', '匹配内容', '策略', '来源', '原始行号', '原因', '引用路径', '缺失信息']];
  for (const item of items) {
    const r = item.result;
    if (!r) { rows.push([item.input, '', '', '', '输入错误', '', '', '', '', '', item.error, '', '']); continue; }
    if (!r.rows.length) rows.push([item.input, r.target.normalized, r.mode, r.certainty, '无匹配', '', '', '', '', '', '', '', r.missing.join('；')]);
    for (const e of r.rows) rows.push([item.input, r.target.normalized, r.mode, r.certainty, e.verdict, e.rule.type, e.rule.value, e.policy ?? '未提供策略绑定', e.trace.at(-1)?.name, e.rule.line || '待加载', e.reason, e.trace.map(t => `${t.name}:${t.line || '待加载'}`).join(' → '), r.missing.join('；')]);
  }
  // Prefix spreadsheet formula initiators to keep exports inert when opened in Excel.
  return '\uFEFF' + rows.map(row => row.map(cell => { let value = String(cell ?? ''); if (/^[=+@\-\t\r]/.test(value)) value = "'" + value; return `"${value.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
}
export function downloadFile(name: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
