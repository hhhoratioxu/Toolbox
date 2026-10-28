import { afterEach, describe, expect, it, vi } from 'vitest';
import { githubLineURL, loadRemote, MAX_BYTES, normalizeRemoteURL } from '../src/services/remote';
import { resultSummary, toCSV } from '../src/services/export';
import { query } from '../src/core/engine';
import { createDemo } from '../src/examples';
const fetcher = (response: Response) => vi.fn(async () => response) as unknown as typeof fetch;
afterEach(() => vi.useRealTimers());
describe('远程加载的确定错误边界', () => {
  it('标准 GitHub blob 转 Raw，拒绝嵌入登录凭据', () => { expect(normalizeRemoteURL('https://github.com/a/b/blob/main/r.list')).toBe('https://raw.githubusercontent.com/a/b/main/r.list'); expect(() => normalizeRemoteURL('file:///tmp/rules')).toThrow(); expect(() => normalizeRemoteURL('https://u:password@example.com/a')).toThrow(); });
  it('读取规则文本且不携带登录凭据', async () => { const fn = vi.fn(async () => new Response('DOMAIN,example.com')); expect(await loadRemote('https://a.test/r.list', undefined, fn as typeof fetch)).toBe('DOMAIN,example.com'); expect(fn.mock.calls[0]).toEqual(['https://a.test/r.list', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })]); });
  it('HTTP 404 与网络错误分开报告', async () => { await expect(loadRemote('https://a.test/r.list', undefined, fetcher(new Response('', { status: 404 })))).rejects.toMatchObject({ kind: 'http' }); await expect(loadRemote('https://a.test/r.list', undefined, (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch)).rejects.toMatchObject({ kind: 'cors-or-network' }); });
  it.each(['<!doctype html><html>login</html>', '', '\0binary'])('拒绝非规则响应：%s', async content => { await expect(loadRemote('https://a.test/r.list', undefined, fetcher(new Response(content)))).rejects.toMatchObject({ kind: 'format' }); });
  it('拒绝超过 Content-Length 大小限制', async () => { await expect(loadRemote('https://a.test/r.list', undefined, fetcher(new Response('a', { headers: { 'Content-Length': String(MAX_BYTES + 1) } })))).rejects.toMatchObject({ kind: 'size' }); });
  it('流式响应也实施大小限制', async () => { await expect(loadRemote('https://a.test/r.list', undefined, fetcher(new Response(new Uint8Array(MAX_BYTES + 1))))).rejects.toMatchObject({ kind: 'size' }); });
  it('UTF-8 解码错误显示格式错误', async () => { await expect(loadRemote('https://a.test/r.list', undefined, fetcher(new Response(new Uint8Array([0xff, 0xfe, 0xfa]))))).rejects.toMatchObject({ kind: 'format' }); });
  it('支持主动取消', async () => { const controller = new AbortController(); const fn = ((_u: unknown, opts: RequestInit) => new Promise((_resolve, reject) => { opts.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError'))); })) as typeof fetch; const promise = loadRemote('https://a.test/r.list', controller.signal, fn); const assertion = expect(promise).rejects.toMatchObject({ kind: 'cancelled' }); controller.abort(); await assertion; });
  it('15 秒超时自动取消并显示超时错误', async () => { vi.useFakeTimers(); const fn = ((_u: unknown, opts: RequestInit) => new Promise((_resolve, reject) => { opts.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError'))); })) as typeof fetch; const promise = loadRemote('https://a.test/r.list', undefined, fn); const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' }); await vi.advanceTimersByTimeAsync(15001); await assertion; });
  it('可为可靠的 GitHub Raw 生成原始行号链接', () => { expect(githubLineURL('https://raw.githubusercontent.com/a/b/main/r.list', 17)).toBe('https://github.com/a/b/blob/main/r.list#L17'); expect(githubLineURL('https://a.test/r.list', 17)).toBeUndefined(); });
});
describe('结果导出与摘要', () => {
  it('CSV 中保留行号、策略和来源路径', () => { const item = { input: 'api.example.com', result: query(createDemo(), 'api.example.com', 'simulate') }; const csv = toCSV([item]); expect(csv).toContain('原始行号'); expect(csv).toContain('"11"'); expect(csv).toContain('"DIRECT"'); expect(resultSummary(item)).toContain('示例主配置.conf:11'); });
  it('错误输入仍有独立导出记录，并防止表格公式执行', () => { const csv = toCSV([{ input: '=HYPERLINK("https://example.com")', error: '无效目标' }]); expect(csv).toContain("'=HYPERLINK"); expect(csv).toContain('输入错误'); });
});
