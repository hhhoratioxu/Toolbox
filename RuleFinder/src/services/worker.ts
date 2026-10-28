import type { Conditions, QueryResult, Source, SourceDraft } from '../core/types';
import type { searchText } from '../core/engine';
export interface QueryItem { input: string; result?: QueryResult; error?: string }
export type TextHit = ReturnType<typeof searchText>[number];
class EngineWorker {
  worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
  sequence = 0;
  syncedSources?: Source[];
  pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  constructor() {
    this.worker.onmessage = event => { const { id, value, error } = event.data; const request = this.pending.get(id); if (!request) return; this.pending.delete(id); if (error) request.reject(new Error(error)); else request.resolve(value); };
    this.worker.onerror = () => { for (const request of this.pending.values()) request.reject(new Error('后台解析器启动失败，请刷新页面或使用较新的浏览器。')); this.pending.clear(); };
  }
  call<T>(type: string, payload: unknown): Promise<T> { const id = ++this.sequence; return new Promise((resolve, reject) => { this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject }); this.worker.postMessage({ id, type, payload }); }); }
  parse(draft: SourceDraft) { return this.call<Source>('parse', draft); }
  sync(sources: Source[]) {
    if (this.syncedSources === sources) return Promise.resolve();
    this.syncedSources = sources;
    return this.call<void>('sync', sources).catch(error => { this.syncedSources = undefined; throw error; });
  }
  query(inputs: string[], mode: QueryResult['mode'], conditions: Conditions, configId?: string) { return this.call<QueryItem[]>('query', { inputs, mode, conditions, configId }); }
  search(term: string) { return this.call<TextHit[]>('search', term); }
}
export const engineWorker = new EngineWorker();
