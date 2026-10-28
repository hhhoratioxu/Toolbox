import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { bundledCatalog, catalogDelta, categories, entries, findEntry, libraryClients, rawURL, readCatalogRule, refreshFromAPI as refreshCatalog, refreshCatalog as readDirectory, syncPlan, trackedPath, validateSnapshot, MANIFEST_URL } from '../src/library/catalog';
import type { CatalogSnapshot } from '../src/library/catalog';
import { parseLoon } from '../src/core/adapters/loon-parser';

const sha = (text: string) => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const snapshot = (files = bundledCatalog.files): CatalogSnapshot => ({ ...bundledCatalog, files });
describe('可更新的仓库目录', () => {
  it('内置快照覆盖真实六端目录，包含 Loon .lsr', () => {
    expect(validateSnapshot(bundledCatalog)).toBe(true);
    expect(bundledCatalog.files).toHaveLength(156);
    expect(categories(bundledCatalog)).toHaveLength(26);
    for (const client of libraryClients) expect(entries(bundledCatalog, client)).toHaveLength(26);
    expect(findEntry(bundledCatalog, 'AI', 'Loon')?.path).toBe('Loon/rule/AI.lsr');
  });
  it('目录新增分类无需修改前端代码', () => {
    const next = snapshot([...bundledCatalog.files, { path: 'Loon/rule/NewService.lsr', sha: 'a'.repeat(40), size: 100 }]);
    expect(categories(next)).toContain('NewService');
    expect(catalogDelta(bundledCatalog, next).added[0].path).toContain('NewService');
  });
  it('识别新增、修改和删除；不将旧目录原地修改', () => {
    const previous = snapshot(bundledCatalog.files.slice(0, 3));
    const next = snapshot([{ ...previous.files[0], sha: 'b'.repeat(40) }, previous.files[1], { path: 'Loon/rule/New.lsr', sha: 'c'.repeat(40), size: 1 }]);
    const diff = catalogDelta(previous, next);
    expect(diff.added).toHaveLength(1); expect(diff.changed).toHaveLength(1); expect(diff.removed).toHaveLength(1);
    expect(previous.files).toHaveLength(3);
  });
  it('刷新先读取主分支，再读取对应的完整文件树', async () => {
    const commit = 'a'.repeat(40), tree = 'b'.repeat(40);
    const fn = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: commit, commit: { tree: { sha: tree } } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ truncated: false, tree: [
        { type: 'blob', path: 'Loon/rule/NewService.lsr', sha: 'c'.repeat(40), size: 30 },
        { type: 'blob', path: 'Loon/script/private.js', sha: 'd'.repeat(40), size: 40 },
        { type: 'blob', path: 'Loon/rule/README.md', sha: 'e'.repeat(40), size: 30 },
      ] })));
    const next = await refreshCatalog(undefined, fn as typeof fetch);
    expect(next.commit).toBe(commit); expect(next.tree).toBe(tree); expect(next.files).toHaveLength(1);
    expect(fn.mock.calls[1][0]).toContain(`/git/trees/${tree}?recursive=1`);
  });
  it('截断的文件树不能冒充完整更新或推断删除', async () => {
    const fn = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: 'a'.repeat(40), commit: { tree: { sha: 'b'.repeat(40) } } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ truncated: true, tree: [] })));
    await expect(refreshCatalog(undefined, fn as typeof fetch)).rejects.toMatchObject({ kind: 'format' });
  });
  it('HTTP 限流或目录读取失败保持明确错误', async () => {
    await expect(refreshCatalog(undefined, (async () => new Response('rate limit', { status: 403 })) as typeof fetch)).rejects.toMatchObject({ kind: 'http' });
  });
  it('无效缓存、重复路径与损坏 SHA 不会被当作有效目录', () => {
    expect(validateSnapshot({})).toBe(false);
    expect(validateSnapshot(snapshot([bundledCatalog.files[0], bundledCatalog.files[0]]))).toBe(false);
    expect(validateSnapshot(snapshot([{ ...bundledCatalog.files[0], sha: 'broken' }]))).toBe(false);
  });
  it('稳定订阅 URL 指向 main，校验下载 URL 固定到提交', () => {
    const file = findEntry(bundledCatalog, 'AI', 'Loon')!;
    expect(rawURL(file)).toBe('https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/AI.lsr');
    expect(rawURL(file, bundledCatalog.commit)).toContain(`/${bundledCatalog.commit}/`);
  });
  it('下载后校验 Git blob SHA，不能把不一致的内容报告为已更新', async () => {
    const content = '# 原文\r\n\r\nDOMAIN,example.com\r\n';
    const file = { path: 'Loon/rule/Test.lsr', sha: sha(content), size: Buffer.byteLength(content) };
    const fn = vi.fn(async (_input: unknown) => new Response(content));
    expect(await readCatalogRule(file, bundledCatalog, undefined, fn as typeof fetch)).toBe(content);
    expect(fn.mock.calls[0][0]).toContain(`/${bundledCatalog.commit}/`);
    await expect(readCatalogRule({ ...file, sha: 'f'.repeat(40) }, bundledCatalog, undefined, fn as typeof fetch)).rejects.toMatchObject({ kind: 'format' });
  });
  it('UTF-8 BOM 与原始换行也参与真实字节校验', async () => {
    const content = '\uFEFF# 注释\r\nDOMAIN,example.com\r\n';
    const file = { path: 'Loon/rule/Test.lsr', sha: sha(content), size: Buffer.byteLength(content) };
    expect(await readCatalogRule(file, bundledCatalog, undefined, (async () => new Response(content)) as typeof fetch)).toBe(content);
  });
  it('已添加规则按 blob SHA 更新；删除只作不可用计划，保留原文', () => {
    const file = findEntry(bundledCatalog, 'AI', 'Loon')!;
    const source = parseLoon({ id: 'a', name: 'AI', url: rawURL(file), content: '# 原文\nDOMAIN,example.com', origin: 'remote' });
    source.catalog = { repository: bundledCatalog.repository, path: file.path, sha: file.sha, commit: bundledCatalog.commit };
    expect(syncPlan([source], bundledCatalog)[0].action).toBe('unchanged');
    const changed = snapshot(bundledCatalog.files.map(f => f.path === file.path ? { ...f, sha: 'd'.repeat(40) } : f));
    expect(syncPlan([source], changed)[0].action).toBe('update');
    expect(syncPlan([source], snapshot(bundledCatalog.files.filter(f => f.path !== file.path)))[0].action).toBe('removed');
    expect(source.content).toBe('# 原文\nDOMAIN,example.com');
  });
  it('既有的 Proxy/main 手动导入可纳入更新；其他仓库和格式不混入 Loon', () => {
    const file = findEntry(bundledCatalog, 'AI', 'Loon')!;
    const source = parseLoon({ id: 'a', name: 'AI', url: rawURL(file), content: 'DOMAIN,example.com', origin: 'remote' });
    expect(trackedPath(source)).toBe(file.path); expect(syncPlan([source], bundledCatalog)[0].action).toBe('update');
    expect(trackedPath({ ...source, url: source.url!.replace('/Loon/', '/Surge/') })).toBeUndefined();
    expect(trackedPath({ ...source, url: source.url!.replace('/hhhoratioxu/Proxy/', '/someone/other/') })).toBeUndefined();
  });
  it('优先读取随仓库更新的公开目录，不依赖匿名 API 额度', async () => {
    const fn = vi.fn(async (_url: unknown) => new Response(JSON.stringify(bundledCatalog)));
    const result = await readDirectory(undefined, fn as typeof fetch);
    expect(fn).toHaveBeenCalledTimes(1); expect(fn.mock.calls[0][0]).toContain(MANIFEST_URL);
    expect(result.delivery).toBe('published'); expect(result.files).toHaveLength(156);
  });
  it('新公开目录内的新增、变更和删除正常反映，且更新请求绕过旧缓存', async () => {
    const next = snapshot([{ path: 'Loon/rule/New.lsr', sha: 'd'.repeat(40), size: 1 }]);
    const fn = vi.fn(async (_url: unknown) => new Response(JSON.stringify(next)));
    const result = await readDirectory(undefined, fn as typeof fetch);
    expect(result.files).toEqual(next.files); expect(String(fn.mock.calls[0][0])).toContain('?rf=');
    expect(catalogDelta(bundledCatalog, result).removed).toHaveLength(156);
  });
  it('公开目录不可用时才回退 GitHub API', async () => {
    const fn = vi.fn().mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: 'a'.repeat(40), commit: { tree: { sha: 'b'.repeat(40) } } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tree: [{ type: 'blob', path: 'Loon/rule/New.lsr', sha: 'c'.repeat(40), size: 10 }] })));
    expect((await readDirectory(undefined, fn as typeof fetch)).delivery).toBe('github-api');
  });
});
