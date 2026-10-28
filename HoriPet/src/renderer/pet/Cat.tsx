import { useEffect, useId, useState } from 'react'
import type { PetState, Skin } from '../../shared/types'
import './cat.css'
export const COATS: Record<Skin, { top: string; bottom: string; line: string; ear: string; collar: string }> = {
  snow: { top: '#fffef9', bottom: '#e8e8e4', line: '#c2c6bd', ear: '#efc0bc', collar: '#89b8a4' },
  peach: { top: '#fff2dd', bottom: '#edc9ac', line: '#c7a991', ear: '#edb1ac', collar: '#b798b6' },
  storm: { top: '#9daebc', bottom: '#718797', line: '#5a6e7b', ear: '#d1a7b6', collar: '#e5b873' }
}
export function Cat({ state = 'idle', skin = 'snow', facing = 1, speed = 1, lowPower = false, label = 'Mochi' }: {
  state?: PetState; skin?: Skin; facing?: -1 | 1; speed?: number; lowPower?: boolean; label?: string
}) {
  const id = useId().replace(/:/g, ''), coat = COATS[skin]
  const [blinking, setBlinking] = useState(false)
  const closed = state === 'sleep' || state === 'happy' || state === 'touch'
  useEffect(() => {
    if (closed || lowPower) { setBlinking(false); return }
    let timer: ReturnType<typeof setTimeout>, release: ReturnType<typeof setTimeout>
    const schedule = () => { timer = setTimeout(() => {
      setBlinking(true)
      release = setTimeout(() => { setBlinking(false); schedule() }, 140)
    }, 2200 + Math.random() * 5800) }
    schedule()
    return () => { clearTimeout(timer); clearTimeout(release) }
  }, [closed, lowPower])
  return <svg className={`cat state-${state} ${lowPower ? 'cat-low-power' : ''} ${blinking ? 'is-blinking' : ''}`} data-state={state} viewBox="0 0 260 290" role="img" aria-label={label}
    style={{ '--tempo': 1 / speed } as React.CSSProperties}>
    <defs>
      <linearGradient id={`${id}fur`} x1="20%" y1="0%" x2="80%" y2="100%">
        <stop stopColor={coat.top}/><stop offset="1" stopColor={coat.bottom}/>
      </linearGradient>
      <radialGradient id={`${id}blush`}><stop stopColor="#f3b1a9" stopOpacity=".65"/><stop offset="1" stopColor="#f3b1a9" stopOpacity="0"/></radialGradient>
      <radialGradient id={`${id}eye`}><stop stopColor="#607875"/><stop offset=".65" stopColor="#344b4b"/><stop offset="1" stopColor="#263d3c"/></radialGradient>
    </defs>
    <ellipse className="cat-shadow" cx="130" cy="276" rx="67" ry="7" fill="#464a43" opacity=".13"/>
    <g transform={facing === -1 ? 'translate(260 0) scale(-1 1)' : undefined}>
      <g className="cat-motion" fill={`url(#${id}fur)`} stroke={coat.line} strokeWidth="2.2" strokeLinejoin="round">
        <path className="cat-tail" d="M168 242 C197 253 225 245 225 224 C225 210 214 208 210 217 C205 226 217 231 193 229" strokeWidth="16" strokeLinecap="round" fill="none" stroke={coat.bottom}/>
        <ellipse className="cat-body" cx="128" cy="226" rx="50" ry="44"/>
        <ellipse cx="128" cy="234" rx="30" ry="29" fill={coat.top} stroke="none" opacity=".7"/>
        <g className="paw paw-left"><path d="M103 236 Q88 241 77 258 Q73 270 94 271 L111 270 Q124 267 118 258"/>
          <path d="M88 263 L88 267 M96 263 L96 268" strokeWidth="1.5" strokeLinecap="round"/></g>
        <g className="paw paw-right"><path d="M151 236 Q167 241 178 258 Q181 270 160 271 L143 270 Q132 267 138 258"/>
          <path d="M158 263 L158 268 M166 263 L166 267" strokeWidth="1.5" strokeLinecap="round"/></g>
        <path d="M96 205 Q127 223 159 205 L159 218 Q126 235 96 218Z" fill={coat.collar} stroke="none"/>
        <g className="cat-head">
          <path d="M58 135 L61 74 Q61 62 71 68 L109 106 M147 106 L183 68 Q192 61 194 75 L199 137"/>
          <path d="M69 117 L70 83 Q70 79 75 83 L94 105Z M160 105 L181 83 Q186 79 186 86 L190 119Z" fill={coat.ear} stroke="none"/>
          <path d="M54 145 C52 115 82 96 126 97 C171 96 201 115 202 146 C204 183 175 209 128 211 C81 211 51 187 54 145Z"/>
          <path d="M109 101 Q119 110 126 107 L122 98 M128 98 Q132 110 142 107" fill="none" opacity=".52" strokeLinecap="round"/>
          <ellipse cx="76" cy="174" rx="23" ry="15" fill={`url(#${id}blush)`} stroke="none"/>
          <ellipse cx="180" cy="174" rx="23" ry="15" fill={`url(#${id}blush)`} stroke="none"/>
          {closed ? <g fill="none" stroke="#45554e" strokeWidth="3.5" strokeLinecap="round">
            <path d={state === 'sleep' ? 'M83 157 Q95 166 106 157' : 'M83 159 Q95 145 106 158'}/>
            <path d={state === 'sleep' ? 'M149 157 Q161 166 173 157' : 'M149 158 Q161 145 173 159'}/>
          </g> : <g className="cat-eyes" stroke="none">
            <ellipse cx="95" cy="153" rx="12" ry={state === 'drag' ? 18 : 15} fill={`url(#${id}eye)`}/>
            <ellipse cx="161" cy="153" rx="12" ry={state === 'drag' ? 18 : 15} fill={`url(#${id}eye)`}/>
            <ellipse cx="91" cy="147" rx="4.5" ry="5.3" fill="#fff"/><ellipse cx="157" cy="147" rx="4.5" ry="5.3" fill="#fff"/>
            <circle cx="100" cy="159" r="2.5" fill="#cce2c8"/><circle cx="166" cy="159" r="2.5" fill="#cce2c8"/>
          </g>}
          <path d="M122 173 Q128 169 134 173 Q128 182 122 173Z" fill="#d89893" stroke="none"/>
          <g className="cat-mouth" fill="none" stroke="#727c71" strokeWidth="2" strokeLinecap="round"><path d="M128 178 L128 183 Q123 190 117 184 M128 183 Q133 190 139 184"/></g>
          <g stroke={coat.line} strokeWidth="1.6" strokeLinecap="round" opacity=".85"><path d="M78 177 L49 173 M78 184 L51 188 M177 177 L206 173 M177 184 L204 188"/></g>
        </g>
        <g className="cat-bell"><circle cx="128" cy="222" r="8" fill="#e6c47b" stroke="#c7aa69" strokeWidth="1.5"/><path d="M124 223 L132 223 M128 222 L128 228" stroke="#ac915c" strokeWidth="1.5" strokeLinecap="round"/><circle cx="125" cy="219" r="2" fill="#fff6d5" stroke="none"/></g>
      </g>
    </g>
    {state === 'sleep' && <g className="sleep-letters" fill="#91a6a0" fontFamily="system-ui" fontWeight="600" stroke="none"><text x="193" y="103" fontSize="15">z</text><text x="212" y="82" fontSize="21">z</text><text x="230" y="57" fontSize="27">z</text></g>}
    {(state === 'happy' || state === 'touch') && <g className="cat-hearts" fill="#dfa29b"><path d="M39 102 C23 88 39 78 44 88 C50 77 65 89 44 104Z"/><path d="M211 126 C201 115 212 110 216 116 C221 109 231 118 216 129Z"/></g>}
    {state === 'eat' && <g className="cat-food"><path d="M89 262 L173 262 Q168 283 131 283 Q95 283 89 262" fill="#9cbbae"/><ellipse cx="131" cy="262" rx="42" ry="7" fill="#d3dcd0"/><g fill="#ba8c63"><circle cx="113" cy="260" r="5"/><circle cx="126" cy="257" r="5"/><circle cx="140" cy="260" r="5"/><circle cx="151" cy="258" r="4"/></g><path d="M125 271 L136 271" stroke="#eaf1e7" strokeWidth="3" strokeLinecap="round"/></g>}
    {state === 'happy' && <g className="cat-sparkles" fill="#e9cf8e"><path d="M219 158 L223 169 L234 173 L223 177 L219 188 L215 177 L204 173 L215 169Z"/><path d="M42 214 L45 222 L53 225 L45 228 L42 236 L39 228 L31 225 L39 222Z"/></g>}
  </svg>
}
