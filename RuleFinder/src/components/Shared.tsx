import { X, Check, AlertCircle, CircleHelp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Verdict } from '../core/types';
export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null; dialog.showModal(); return () => { dialog.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={20} /></button></div>
    {children}
  </dialog>;
}
export function Status({ verdict, label }: { verdict: Verdict; label?: string }) {
  const Icon = verdict === 'match' ? Check : verdict === 'unknown' ? CircleHelp : AlertCircle;
  return <span className={`status ${verdict}`}><Icon size={13} />{label ?? (verdict === 'match' ? '匹配' : verdict === 'unknown' ? '无法判断' : '不匹配')}</span>;
}
export const kindLabels = { local: '本地规则', plugin: '插件规则', subscription: '订阅规则' };
export const formatLabels = { 'loon-config': '主配置', 'loon-rules': '规则列表', 'loon-plugin': 'Loon 插件', unsupported: '未支持格式' };
