import type { ErrorKind } from '../core/types';

export const MAX_BYTES = 5 * 1024 * 1024;
export const TIMEOUT_MS = 15000;
export class LoadError extends Error { constructor(public kind: ErrorKind, message: string) { super(message); this.name = 'LoadError'; } }
export function normalizeRemoteURL(input: string): string {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new LoadError('format', '请输入完整的 HTTP(S) 规则文件地址。'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new LoadError('format', '只支持不含登录凭据的 HTTP(S) 文件地址。');
  if (url.hostname === 'github.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[2] === 'blob' && parts.length >= 5) {
      url = new URL(`https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join('/')}`);
    }
  }
  url.hash = ''; return url.href;
}
export async function loadRemote(input: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<string> {
  const url = normalizeRemoteURL(input); const controller = new AbortController(); let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new LoadError('network', '浏览器当前离线。可先上传文件或粘贴规则。');
    const response = await fetcher(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new LoadError('http', `HTTP ${response.status} ${response.statusText}：规则文件加载失败。`);
    if (+response.headers.get('Content-Length')! > MAX_BYTES) throw new LoadError('size', '远程文件超过 5 MiB 限制，请拆分后导入。');
    const reader = response.body?.getReader(); let size = 0;
    const decoder = new TextDecoder('utf-8', { fatal: true }); let text = '';
    if (reader) {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new LoadError('size', '远程文件超过 5 MiB 限制。'); }
        try { text += decoder.decode(value, { stream: true }); } catch { await reader.cancel(); throw new LoadError('format', '文件不是有效 UTF-8 文本；不支持二进制规则库。'); }
      }
      try { text += decoder.decode(); } catch { throw new LoadError('format', 'UTF-8 文本被截断或格式损坏。'); }
    } else {
      const bytes = await response.arrayBuffer(); if (bytes.byteLength > MAX_BYTES) throw new LoadError('size', '远程文件超过 5 MiB 限制。');
      try { text = decoder.decode(bytes); } catch { throw new LoadError('format', '文件不是有效 UTF-8 文本。'); }
    }
    if (!text.trim() || /^\s*(?:<!doctype\s+html|<html)/i.test(text) || text.includes('\0')) throw new LoadError('format', '返回内容不是规则文本（可能是 HTML 页面或二进制文件）。请使用 Raw 地址。');
    return text;
  } catch (error) {
    if (error instanceof LoadError) throw error;
    if (controller.signal.aborted) throw new LoadError(timedOut ? 'timeout' : 'cancelled', timedOut ? '请求超过 15 秒，已取消。可重试或上传本地文件。' : '加载已取消。');
    throw new LoadError('cors-or-network', '浏览器未返回可读取的响应：可能是 CORS 限制、网络连接或证书问题。浏览器无法进一步可靠区分；可下载后上传，或直接粘贴内容。');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export function githubLineURL(input: string | undefined, line: number): string | undefined {
  if (!input || line < 1) return;
  try {
    const url = new URL(input); const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname === 'raw.githubusercontent.com' && parts.length >= 4) {
      // A branch/ref containing '/' is ambiguous in raw URLs; generate links only for simple refs or SHAs.
      if (parts[2] === 'refs' || parts[2].includes('%2F')) return;
      return `https://github.com/${parts[0]}/${parts[1]}/blob/${parts.slice(2).join('/')}#L${line}`;
    }
    if (url.hostname === 'github.com' && parts[2] === 'blob' && parts.length >= 5) { url.hash = `L${line}`; return url.href; }
  } catch { return; }
}
