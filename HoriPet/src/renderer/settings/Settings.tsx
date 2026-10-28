import { useEffect, useState } from 'react'
import type { Action, Settings as SettingsData, Skin } from '../../shared/types'
import { useCompanion } from '../store'
import { messages, stateLabel } from '../i18n'
import { Cat } from '../pet/Cat'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type Tab = 'companion' | 'habitat' | 'preferences' | 'about'
export function Settings() {
  const snapshot = useCompanion(s => s.snapshot)!, update = useCompanion(s => s.update), act = useCompanion(s => s.act)
  const error = useCompanion(s => s.error), clearError = useCompanion(s => s.clearError)
  const { settings: s, pet, behavior } = snapshot, t = messages(s.locale)
  const [tab, setTab] = useState<Tab>('companion'), [name, setName] = useState(s.name)
  useEffect(() => setName(s.name), [s.name])
  const nav: { id: Tab; icon: IconName }[] = [{ id: 'companion', icon: 'paw' }, { id: 'habitat', icon: 'leaf' }, { id: 'preferences', icon: 'sliders' }, { id: 'about', icon: 'book' }]
  const toggle = (key: keyof SettingsData, title: string, description: string, disabled = false) => <div className="setting-row" key={key}>
    <div><strong>{title}</strong><p>{description}</p></div><button type="button" role="switch" aria-checked={!!s[key]} aria-label={title} disabled={disabled}
      className={`switch ${s[key] ? 'on' : ''}`} onClick={() => void update({ [key]: !s[key] })}><span/></button>
  </div>
  const slider = (key: 'size' | 'animationSpeed' | 'moveSpeed', title: string, min: number, max: number, step: number) => <label className="slider-row" key={key}>
    <span>{title}<output>{key === 'size' ? `${s[key]} px` : `${s[key].toFixed(1)}×`}</output></span>
    <input type="range" aria-label={title} min={min} max={max} step={step} value={s[key]} onChange={e => void update({ [key]: Number(e.target.value) })}/>
  </label>
  const gesture = (action: Action, icon: IconName, title: string, color: string) => <button className={`gesture ${color}`} onClick={() => void act(action)} data-testid={`action-${action}`}>
    <span className="gesture-icon"><Icon name={icon} size={23}/></span><span>{title}</span><Icon name="arrow" size={14}/>
  </button>
  return <div className="settings-shell">
    <div className={`window-drag ${snapshot.platform === 'darwin' ? 'mac' : ''}`}><span>HoriPet</span>
      {snapshot.platform !== 'darwin' && <button onClick={() => window.horipet.closeSettings()} aria-label={t.close}><Icon name="close" size={17}/></button>}
    </div>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Icon name="paw" size={25}/></span><div><b>HoriPet<span>✦</span></b><small>{t.tagline}</small></div></div>
      <nav>{nav.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} data-testid={`nav-${item.id}`}><Icon name={item.icon}/><span>{t[item.id]}</span>{tab === item.id && <i/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-label"><i/><span>LOCAL & LOVED</span></div><p>{t.privacyText.split('。')[0]?.split('. ')[0]}</p><small>HoriPet {snapshot.version}</small></div>
    </aside>
    <main className="settings-main" data-testid="settings-main">
      <header className="page-header"><span className="eyebrow">{tab === 'companion' ? 'YOUR LITTLE COMPANION' : tab === 'habitat' ? 'A SPACE TO BE' : tab === 'preferences' ? 'MAKE IT YOURS' : 'MADE WITH CARE'}</span>
        <h1>{tab === 'companion' ? t.intro : tab === 'habitat' ? t.desktopTitle : tab === 'preferences' ? t.prefTitle : t.notesTitle}</h1>
        <p>{tab === 'companion' ? t.introSub : tab === 'habitat' ? t.desktopSub : tab === 'preferences' ? t.prefSub : t.notesSub}</p>
      </header>
      {(error || snapshot.notice) && <div className="error-banner" role="alert"><span>{error || snapshot.notice}</span><button onClick={clearError} aria-label="Dismiss"><Icon name="close" size={14}/></button></div>}
      {tab === 'companion' && <div className="page-body companion-page">
        <section className="companion-card">
          <div className="companion-stage"><span className="offline-pill"><i/>{t.offline}</span><div className="stage-orbit orbit-one"/><div className="stage-orbit orbit-two"/>
            <span className="stage-star star-one">✧</span><span className="stage-star star-two">✦</span><div className="preview-cat"><Cat state={behavior.state} skin={s.skin} speed={s.animationSpeed} lowPower={behavior.lowPower} label={s.name}/></div>
            <span className="stage-leaf leaf-one"/><span className="stage-leaf leaf-two"/>
            <div className="companion-caption"><h2>{s.name}<span>♥</span></h2><p><i/>{stateLabel(behavior.state, s.locale)}</p></div>
          </div>
          <div className="vitals">{([{ name: t.mood, value: pet.mood, color: 'sage', icon: 'sun' }, { name: t.hunger, value: pet.hunger, color: 'peach', icon: 'bowl' }, { name: t.bond, value: pet.bond, color: 'rose', icon: 'heart' }] as const).map(stat =>
            <div className={`vital ${stat.color}`} key={stat.name}><span className="vital-name"><Icon name={stat.icon} size={15}/>{stat.name}<b>{Math.round(stat.value)}<small>/100</small></b></span><div className="meter"><span style={{ width: `${stat.value}%` }}/></div></div>)}</div>
        </section>
        <section className="moment-section"><div className="section-heading"><h3>{t.quick}</h3><p>{t.quickSub}</p></div><div className="gestures">
          {gesture('feed', 'bowl', t.feed, 'peach')}{gesture('pet', 'heart', t.pet, 'rose')}
          {gesture(behavior.state === 'sleep' ? 'wake' : 'sleep', behavior.state === 'sleep' ? 'sun' : 'moon', behavior.state === 'sleep' ? t.wake : t.sleep, 'lavender')}
        </div></section>
        <section className="coat-section"><div className="section-heading"><h3>{t.wardrobe}</h3><p>{t.wardrobeSub}</p></div><div className="coat-options">{(['snow', 'peach', 'storm'] as Skin[]).map(skin =>
          <button className={`coat-option ${s.skin === skin ? 'selected' : ''}`} key={skin} onClick={() => void update({ skin })} aria-label={t[skin]} aria-pressed={s.skin === skin}>
            <div className={`coat-preview ${skin}`}><Cat skin={skin} lowPower label={t[skin]}/></div><span>{t[skin]}</span>{s.skin === skin && <i><Icon name="check" size={11}/></i>}
          </button>)}</div></section>
        <label className="name-card"><div><strong>{t.name}</strong><p>{t.nameHint}</p></div><input aria-label={t.name} value={name} maxLength={24} onChange={e => setName(e.target.value)}
          onBlur={() => { if (name.trim() && name.trim() !== s.name) void update({ name }); else setName(s.name) }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}/></label>
      </div>}
      {tab === 'habitat' && <div className="page-body">
        <section className="settings-card"><h3>{t.display}</h3>{toggle('visible', t.visible, t.visibleSub)}<div className="sliders-grid">{slider('size', t.size, 160, 340, 10)}{slider('animationSpeed', t.animation, .5, 2, .1)}{slider('moveSpeed', t.movement, .4, 2, .1)}</div></section>
        <section className="settings-card"><h3>{t.behavior}</h3>{toggle('autonomous', t.autonomous, t.autonomousSub)}{toggle('followMouse', t.follow, t.followSub)}{toggle('alwaysOnTop', t.top, t.topSub)}</section>
        <button className="recovery-button" onClick={() => void act('reset-position')}><span className="recovery-icon"><Icon name="home" size={23}/></span><div><strong>{t.reset}</strong><p>{t.resetSub}</p></div><Icon name="arrow" size={17}/></button>
      </div>}
      {tab === 'preferences' && <div className="page-body">
        <section className="settings-card"><h3>{t.appearance}</h3><div className="setting-row"><strong>{t.theme}</strong><div className="segmented">{(['system', 'light', 'dark'] as const).map(theme => <button key={theme} className={s.theme === theme ? 'selected' : ''} onClick={() => void update({ theme })}>{t[theme]}</button>)}</div></div>
          <label className="setting-row"><strong>{t.language}</strong><select aria-label={t.language} value={s.locale} onChange={e => void update({ locale: e.target.value as 'en' | 'zh-CN' })}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label>
        </section><section className="settings-card"><h3>{t.systemSettings}</h3>{toggle('launchAtLogin', t.login, snapshot.loginAvailable ? t.loginSub : t.loginDev, !snapshot.loginAvailable)}{toggle('sound', t.sound, t.soundSub)}</section>
        <section className="privacy-card"><Icon name="shield" size={27}/><div><h3>{t.privacy}</h3><p>{t.privacyText}</p></div></section>
      </div>}
      {tab === 'about' && <div className="page-body"><div className="about-hero"><Icon name="paw" size={43}/><h2>HoriPet</h2><p>{t.tagline}</p><span>v{snapshot.version} · {t.version}</span></div>
        {([{ title: t.gestures, text: t.clickHint, icon: 'heart' }, { title: t.recovery, text: t.recoveryText, icon: 'home' }, { title: t.keys, text: t.keysText, icon: 'sparkle' }] as const).map(note => <article className="note-card" key={note.title}><Icon name={note.icon} size={22}/><div><h3>{note.title}</h3><p>{note.text}</p></div></article>)}
      </div>}
      <footer className="page-footer"><span><i/>{t.saved}</span><button className="quit-button" onClick={() => window.horipet.quit()}><Icon name="power" size={13}/>{t.quit}</button></footer>
    </main>
  </div>
}
