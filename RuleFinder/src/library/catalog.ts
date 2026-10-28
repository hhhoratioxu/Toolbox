import bundled from './bundled-catalog.json';
import type { Source } from '../core/types';
import { loadRemote, LoadError } from '../services/remote';

export const REPOSITORY = 'hhhoratioxu/Proxy';
export const BRANCH = 'main';
export const libraryClients = ['Loon', 'Surge', 'Clash', 'Egern', 'Shadowrocket', 'QuantumultX'] as const;
export type LibraryClient = typeof libraryClients[number];
export const clientNames: Record<LibraryClient, string> = {
  Loon: 'Loon', Surge: 'Surge', Clash: 'Clash / Mihomo', Egern: 'Egern',
  Shadowrocket: 'Shadowrocket', QuantumultX: 'Quantumult X',
};
export interface CatalogFile { path: string; sha: string; size: number }
export interface CatalogSnapshot {
  repository: string; branch: string; commit: string; tree: string;
  checkedAt: string; files: CatalogFile[];
  delivery?: 'published' | 'github-api';
}
export interface CatalogEntry extends CatalogFile { client: LibraryClient; category: string; supported: boolean }
export interface CatalogDelta { added: CatalogFile[]; changed: CatalogFile[]; removed: CatalogFile[] }
export const bundledCatalog = bundled as CatalogSnapshot;
const shaPattern = /^[a-f0-9]{40}$/i;
const clientPattern = /^(Loon|Surge|Clash|Egern|Shadowrocket|QuantumultX)\/rule\/([^/]+)\.(lsr|list|txt|yaml|yml|mrs|dat|bin)$/;

export function toEntry(file: CatalogFile): CatalogEntry | undefined {
  const match = file.path.match(clientPattern);
  if (!match || !libraryClients.includes(match[1] as LibraryClient) || /[\x00-\x1f]/.test(file.path) || ['.', '..'].includes(match[2])) return;
  const client = match[1] as LibraryClient;
  const supported = ['Clash', 'Egern'].includes(client)
    ? /^(yaml|yml)$/.test(match[3]) : /^(lsr|list|txt)$/.test(match[3]);
  return { ...file, client, category: match[2], supported };
}
export function entries(snapshot: CatalogSnapshot, client?: LibraryClient): CatalogEntry[] {
  return snapshot.files.map(toEntry).filter((e): e is CatalogEntry => !!e && (!client || e.client === client));
}
export function categories(snapshot: CatalogSnapshot): string[] {
  return [...new Set(entries(snapshot).map(e => e.category))].sort((a, b) => a.localeCompare(b));
}
export function findEntry(snapshot: CatalogSnapshot, category: string, client: LibraryClient) {
  return entries(snapshot, client).find(e => e.category === category);
}
export function rawURL(file: CatalogFile, revision = BRANCH): string {
  if (!toEntry(file) || (revision !== BRANCH && !shaPattern.test(revision))) throw new Error('规则来源路径或版本无效');
  return `https://raw.githubusercontent.com/${REPOSITORY}/${revision}/${file.path.split('/').map(encodeURIComponent).join('/')}`;
}
export function catalogDelta(previous: CatalogSnapshot, next: CatalogSnapshot): CatalogDelta {
  const old = new Map(previous.files.map(f => [f.path, f]));
  const current = new Map(next.files.map(f => [f.path, f]));
  return {
    added: next.files.filter(f => !old.has(f.path)),
    changed: next.files.filter(f => old.has(f.path) && old.get(f.path)!.sha !== f.sha),
    removed: previous.files.filter(f => !current.has(f.path)),
  };
}
export function validateSnapshot(value: unknown): value is CatalogSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as CatalogSnapshot;
  return s.repository === REPOSITORY && s.branch === BRANCH && shaPattern.test(s.commit) && shaPattern.test(s.tree)
    && Number.isFinite(Date.parse(s.checkedAt)) && Array.isArray(s.files) && s.files.length <= 10000
    && s.files.every(f => f && typeof f.path === 'string' && !!toEntry(f) && shaPattern.test(f.sha) && Number.isFinite(f.size) && f.size >= 0)
    && new Set(s.files.map(f => f.path)).size === s.files.length;
}
export async function refreshFromAPI(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<CatalogSnapshot> {
  let branch: { commit?: { sha?: string; commit?: { tree?: { sha?: string } } } };
  try { branch = JSON.parse(await loadRemote(`https://api.github.com/repos/${REPOSITORY}/branches/${BRANCH}`, signal, fetcher)); }
  catch (e) { if (e instanceof SyntaxError) throw new LoadError('format', 'GitHub 目录响应不是有效 JSON'); throw e; }
  const commit = branch.commit?.sha; const treeSHA = branch.commit?.commit?.tree?.sha;
  if (!commit || !treeSHA || !shaPattern.test(commit) || !shaPattern.test(treeSHA)) throw new LoadError('format', 'GitHub 没有返回可验证的分支版本');
  let tree: { truncated?: boolean; tree?: { type?: string; path?: string; sha?: string; size?: number }[] };
  try { tree = JSON.parse(await loadRemote(`https://api.github.com/repos/${REPOSITORY}/git/trees/${treeSHA}?recursive=1`, signal, fetcher)); }
  catch (e) { if (e instanceof SyntaxError) throw new LoadError('format', 'GitHub 文件树响应格式错误'); throw e; }
  if (tree.truncated || !Array.isArray(tree.tree)) throw new LoadError('format', 'GitHub 文件目录不完整，保留上一次目录，不将缺项当成删除');
  const files = tree.tree.filter(f => f.type === 'blob' && typeof f.path === 'string' && clientPattern.test(f.path))
    .map(f => ({ path: f.path!, sha: f.sha!, size: f.size ?? 0 }));
  const result: CatalogSnapshot = { repository: REPOSITORY, branch: BRANCH, commit, tree: treeSHA, checkedAt: new Date().toISOString(), files };
  if (!files.length || !validateSnapshot(result)) throw new LoadError('format', '规则目录为空或格式无效，未替换上一次目录');
  return { ...result, delivery: 'github-api' };
}
export const MANIFEST_URL = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/Docs/RuleFinder-Catalog.json`;
export async function refreshCatalog(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<CatalogSnapshot> {
  try {
    const value = JSON.parse(await loadRemote(`${MANIFEST_URL}?rf=${Date.now()}`, signal, fetcher));
    if (!validateSnapshot(value) || !value.files.length) throw new LoadError('format', '自动目录格式无效');
    return { ...value, delivery: 'published' };
  } catch (manifestError) {
    if (signal?.aborted) throw manifestError;
    try { return await refreshFromAPI(signal, fetcher); }
    catch (apiError) { throw new LoadError(apiError instanceof LoadError ? apiError.kind : 'network', `公开目录与备用目录接口均未更新成功，旧目录已保留。${apiError instanceof Error ? apiError.message : ''}`); }
  }
}
export function trackedPath(source: Source): string | undefined {
  if (source.catalog?.repository === REPOSITORY) return source.catalog.path;
  if (!source.url) return;
  try {
    const url = new URL(source.url);
    if (url.hostname !== 'raw.githubusercontent.com' || !url.pathname.startsWith(`/${REPOSITORY}/${BRANCH}/`)) return;
    const path = decodeURIComponent(url.pathname.slice(`/${REPOSITORY}/${BRANCH}/`.length));
    if (toEntry({ path, sha: '', size: 0 })?.client === 'Loon') return path;
  } catch { return; }
}
export function syncPlan(sources: Source[], snapshot: CatalogSnapshot) {
  return sources.flatMap(source => {
    const path = trackedPath(source); if (!path) return [];
    const file = snapshot.files.find(f => f.path === path);
    return [{ source, file, action: !file ? 'removed' as const : source.catalog?.sha === file.sha && source.status === 'ready' ? 'unchanged' as const : 'update' as const }];
  });
}
export async function readCatalogRule(file: CatalogFile, snapshot: CatalogSnapshot, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<string> {
  const content = await loadRemote(rawURL(file, snapshot.commit), signal, fetcher);
  const encoded = new TextEncoder().encode(content);
  const prefix = new TextEncoder().encode(`blob ${encoded.byteLength}\0`);
  const data = new Uint8Array(prefix.length + encoded.length);
  data.set(prefix); data.set(encoded, prefix.length);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const sha = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (sha !== file.sha) throw new LoadError('format', '下载内容与仓库文件版本不一致，未将此来源标记为已更新，请重试');
  return content;
}
