import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useCompanion } from './store'
import { Pet } from './pet/Pet'
import { Settings } from './settings/Settings'
import './styles.css'
const kind = new URLSearchParams(location.search).get('window') === 'settings' ? 'settings' : 'pet'
document.documentElement.dataset.window = kind
function App() {
  const snapshot = useCompanion(s => s.snapshot), receive = useCompanion(s => s.receive)
  useEffect(() => {
    if (!window.horipet) return
    const dispose = window.horipet.onSnapshot(receive)
    void window.horipet.getSnapshot().then(receive).catch(console.error)
    return dispose
  }, [receive])
  useEffect(() => {
    if (!snapshot) return
    document.documentElement.dataset.theme = snapshot.settings.theme === 'system' ? snapshot.systemDark ? 'dark' : 'light' : snapshot.settings.theme
    document.documentElement.lang = snapshot.settings.locale
  }, [snapshot])
  if (!snapshot) return kind === 'settings' ? <div className="loading">HoriPet · 正在唤醒小伙伴…</div> : null
  return kind === 'pet' ? <Pet/> : <Settings/>
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
