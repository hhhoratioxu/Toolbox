import { useEffect, useRef, useState } from 'react';
import { bundledCatalog, catalogDelta, refreshCatalog, validateSnapshot } from './catalog';
import type { CatalogSnapshot } from './catalog';
import { readCatalogCache, saveCatalogCache } from '../services/storage';

export function useCatalog() {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot>(bundledCatalog);
  const [origin, setOrigin] = useState<'bundled' | 'cache' | 'live'>('bundled');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(snapshot); ref.current = snapshot;
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void readCatalogCache().then(value => {
      if (active && validateSnapshot(value) && Date.parse(value.checkedAt) > Date.parse(ref.current.checkedAt)) {
        ref.current = value; setSnapshot(value); setOrigin('cache');
      }
    }).catch(() => { /* The bundled directory is still usable without storage. */ });
    return () => { active = false; controller.current?.abort(); };
  }, []);
  const refresh = async () => {
    if (controller.current) throw new Error('正在检查规则库，请稍候');
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError('');
    try {
      const next = await refreshCatalog(current.signal);
      const delta = catalogDelta(ref.current, next);
      ref.current = next; setSnapshot(next); setOrigin('live');
      await saveCatalogCache(next).catch(() => { /* A storage failure does not invalidate a live directory. */ });
      return { snapshot: next, delta };
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新目录失败');
      throw e;
    } finally { setBusy(false); controller.current = undefined; }
  };
  return { snapshot, origin, busy, error, refresh, cancel: () => controller.current?.abort() };
}
