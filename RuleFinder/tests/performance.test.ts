import { expect, it } from 'vitest';
import { parseLoon } from '../src/core/adapters/loon-parser';
import { query } from '../src/core/engine';
it('10 万条域名规则索引保持正确结果与原始行号', () => {
  const content = ['# 大文件回归', '', ...Array.from({ length: 100_000 }, (_, i) => `DOMAIN,node${i}.example.test`)].join('\n');
  const source = parseLoon({ id: 'large', name: 'large.list', content, origin: 'file' });
  const r = query([source], 'node99999.example.test', 'library');
  expect(r.checked).toBe(100_000); expect(r.rows).toHaveLength(1); expect(r.rows[0].rule.line).toBe(100002); expect(r.noMatch).toBe(99_999);
}, 20000);
