import { useEffect, useRef } from 'react'
import { useCompanion } from '../store'
import { Cat } from './Cat'
import { bubbleText } from '../i18n'
export function Pet() {
  const snapshot = useCompanion(s => s.snapshot)!, act = useCompanion(s => s.act)
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const suppressClick = useRef(false)
  const { settings, behavior } = snapshot
  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); window.horipet.drag('end') }, [])
  return <main className="pet-surface" data-testid="pet-surface" aria-label={settings.name}
    onContextMenu={e => { e.preventDefault(); if (clickTimer.current) clearTimeout(clickTimer.current); window.horipet.menu() }}
    onPointerDown={e => {
      if (e.button !== 0) return
      suppressClick.current = false
      press.current = { x: e.screenX, y: e.screenY, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
      window.horipet.drag('start')
    }}
    onPointerMove={e => {
      if (press.current && Math.hypot(e.screenX - press.current.x, e.screenY - press.current.y) > 4) press.current.moved = true
    }}
    onPointerUp={e => {
      if (e.button !== 0 || !press.current) return
      suppressClick.current = press.current.moved
      press.current = null
      window.horipet.drag('end')
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    }}
    onClick={e => {
      if (suppressClick.current || e.detail > 1) return
      if (clickTimer.current) clearTimeout(clickTimer.current)
      clickTimer.current = setTimeout(() => { clickTimer.current = undefined; void act('pet') }, 270)
    }}
    onDoubleClick={() => {
      if (suppressClick.current) return
      if (clickTimer.current) clearTimeout(clickTimer.current)
      clickTimer.current = undefined
      void act('celebrate')
    }}
    onPointerCancel={() => { press.current = null; suppressClick.current = true; window.horipet.drag('end') }}
    onLostPointerCapture={() => { if (press.current) { press.current = null; window.horipet.drag('end') } }}>
    {behavior.bubble && <div className="pet-bubble" role="status">{bubbleText(behavior.bubble, settings.locale)}</div>}
    <Cat state={behavior.state} skin={settings.skin} facing={behavior.facing} speed={settings.animationSpeed} lowPower={behavior.lowPower} label={settings.name}/>
  </main>
}
