/// <reference lib="webworker" />
import { parseLoon } from './core/adapters/loon-parser';
import { query, searchText } from './core/engine';
import type { Source } from './core/types';
let sources: Source[] = [];
self.onmessage = event => {
  const { id, type, payload } = event.data;
  try {
    let value: unknown;
    if (type === 'parse') value = parseLoon(payload);
    else if (type === 'sync') sources = payload;
    else if (type === 'query') value = payload.inputs.map((input: string) => {
      try { return { input, result: query(sources, input, payload.mode, payload.conditions, payload.configId) }; }
      catch (error) { return { input, error: error instanceof Error ? error.message : '输入无效' }; }
    });
    else if (type === 'search') value = searchText(sources, payload);
    else throw new Error('未知的后台操作');
    self.postMessage({ id, value });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : '后台操作失败' }); }
};
