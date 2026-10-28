import type { Adapter } from '../types';
import { parseLoon } from './loon-parser';
import { evaluateLoon, loonPriority } from './loon-matcher';
export const loon: Adapter = { id: 'loon', name: 'Loon', parse: parseLoon, evaluate: evaluateLoon, priority: loonPriority };
/** Only shipped adapters are exposed to the UI. Surge and Mihomo must supply their own parser/order. */
export const adapters: Adapter[] = [loon];
