import type { Source } from '../core/types';
import type { CatalogSnapshot } from '../library/catalog';
const DATABASE = 'rule-finder-v1';
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('workspace'); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
export async function readSources(): Promise<Source[]> {
  const db = await openDB();
  try { return await new Promise((resolve, reject) => { const req = db.transaction('workspace').objectStore('workspace').get('user-sources'); req.onsuccess = () => resolve(req.result ?? []); req.onerror = () => reject(req.error); }); }
  finally { db.close(); }
}
export async function saveSources(sources: Source[]): Promise<void> {
  const db = await openDB();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('workspace', 'readwrite'); tx.objectStore('workspace').put(sources, 'user-sources'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }
  finally { db.close(); }
}
export async function readCatalogCache(): Promise<unknown> {
  const db = await openDB();
  try { return await new Promise((resolve, reject) => { const req = db.transaction('workspace').objectStore('workspace').get('proxy-catalog'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  finally { db.close(); }
}
export async function saveCatalogCache(snapshot: CatalogSnapshot): Promise<void> {
  const db = await openDB();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('workspace', 'readwrite'); tx.objectStore('workspace').put(snapshot, 'proxy-catalog'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
  finally { db.close(); }
}
