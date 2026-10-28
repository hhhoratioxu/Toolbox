import { useRef } from 'react';
import { Hand, Move } from 'lucide-react';
import { input, clearInput } from '../game/input';
import { useGame } from '../game/store';
import { objectById } from '../game/world';

export function MobileControls() {
  const entered = useGame((s) => s.entered),
    dialog = useGame((s) => s.dialog),
    phase = useGame((s) => s.phase),
    active = useGame((s) => s.active);
  const stick = useRef<HTMLDivElement>(null),
    origin = useRef({ x: 0, y: 0 }),
    look = useRef<{ id: number; x: number; y: number } | null>(null);
  if (!entered || dialog || phase !== 'explore') return null;
  return (
    <div className="mobile-controls">
      <div
        className="look-pad"
        aria-label="拖动环顾房间"
        onPointerDown={(e) => {
          look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = look.current;
          if (!p || p.id !== e.pointerId) return;
          input.lookX += (e.clientX - p.x) * 0.004;
          input.lookY += (e.clientY - p.y) * 0.004;
          p.x = e.clientX;
          p.y = e.clientY;
        }}
        onPointerUp={() => {
          look.current = null;
        }}
        onPointerCancel={() => {
          look.current = null;
        }}
      />
      <div
        className="joystick"
        role="group"
        aria-label="移动摇杆"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const dx = e.clientX - origin.current.x,
            dy = e.clientY - origin.current.y,
            distance = Math.hypot(dx, dy),
            r = Math.min(34, distance);
          const x = distance ? (dx / distance) * r : 0,
            y = distance ? (dy / distance) * r : 0;
          input.moveX = x / 34;
          input.moveZ = y / 34;
          if (stick.current) stick.current.style.transform = `translate(${x}px, ${y}px)`;
        }}
        onPointerUp={() => {
          clearInput();
          if (stick.current) stick.current.style.transform = '';
        }}
        onPointerCancel={() => {
          clearInput();
          if (stick.current) stick.current.style.transform = '';
        }}
      >
        <div className="joystick-knob" ref={stick}>
          <Move size={22} strokeWidth={1.4} />
        </div>
        <span>慢慢走</span>
      </div>
      <button
        className={`touch-interact ${active ? 'available' : ''}`}
        aria-label={active ? `互动：${objectById[active].name}` : '互动'}
        disabled={!active}
        onClick={() => {
          if (active) useGame.getState().interact(active);
        }}
      >
        <Hand size={25} />
        <span>互动</span>
      </button>
      <span className="look-caption">右侧滑动 · 环顾小屋</span>
    </div>
  );
}
