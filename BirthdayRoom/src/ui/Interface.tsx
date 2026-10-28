import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Footprints,
  Gift,
  Heart,
  House,
  KeyRound,
  Lightbulb,
  Moon,
  Mouse,
  RotateCcw,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { birthday, keepsakes } from '../config/birthday';
import { nextPuzzle, useGame } from '../game/store';
import { objectById } from '../game/world';
import { audio } from '../game/audio';
import { Dialogs } from './Dialogs';
import { MobileControls } from './MobileControls';

function Welcome() {
  const entered = useGame((s) => s.entered),
    solved = useGame((s) => s.solved),
    ready = useGame((s) => s.ready);
  return (
    <AnimatePresence>
      {!entered && (
        <motion.aside
          className="welcome"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.65 }}
        >
          <div className="welcome-overline">
            <span /> A LITTLE SURPRISE, JUST FOR YOU
          </div>
          <div className="welcome-card paper">
            <div className="welcome-stamp">
              <House size={23} strokeWidth={1.2} />
              <span>
                ROOM
                <br />
                NO. 01
              </span>
            </div>
            <p className="eyebrow">{birthday.welcome.eyebrow}</p>
            <h1>
              {birthday.welcome.heading.split('\n').map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </h1>
            <p className="welcome-description">{birthday.welcome.description}</p>
            <div className="welcome-divider">
              <span />
              <LeafDoodle />
              <span />
            </div>
            <button
              className="primary-button welcome-enter"
              disabled={!ready}
              onClick={() => {
                void audio.start(birthday.backgroundMusic);
                audio.effect('click');
                useGame.getState().enter();
                window.dispatchEvent(new Event('room:lock'));
              }}
            >
              {solved.length > 0 ? birthday.welcome.continue : birthday.welcome.button}
              <ArrowRight size={18} strokeWidth={1.3} />
            </button>
            <p className="welcome-footnote">{birthday.welcome.footnote}</p>
          </div>
          <p className="welcome-postscript">
            <Heart size={12} strokeWidth={1.3} /> 五个小机关 · 一份藏了很久的心意
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
function LeafDoodle() {
  return (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none" aria-hidden="true">
      <path
        d="M4 17C13 8 21 10 29 2M12 11C7 11 7 5 7 4C13 4 15 6 12 11ZM22 7C19 2 23 1 26 1C28 5 25 7 22 7ZM16 10C20 9 25 12 25 15C18 16 15 14 16 10Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Progress() {
  const solved = useGame((s) => s.solved),
    entered = useGame((s) => s.entered),
    phase = useGame((s) => s.phase);
  if (!entered || phase !== 'explore') return null;
  const next = nextPuzzle(solved);
  return (
    <motion.aside
      className="progress-card paper"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="progress-heading">
        <span className="status-dot" />
        <span>生日寻宝进行中</span>
        <span className="progress-fraction">
          {solved.length}
          <small>/5</small>
        </span>
      </div>
      <p className="progress-copy">已解开 {solved.length}/5 个小机关</p>
      <div className="progress-pips" aria-label={`进度 ${solved.length}/5`}>
        {keepsakes.map((item) => (
          <span key={item.id} className={solved.includes(item.id) ? 'done' : ''}>
            {solved.includes(item.id) ? <Check size={11} /> : <span />}
          </span>
        ))}
      </div>
      <div className="next-stop">
        <span>下一站</span>
        <b>{objectById[next].name}</b>
        <button aria-label="查看下一条线索" onClick={() => useGame.getState().open('hint')}>
          <ArrowRight size={17} />
        </button>
      </div>
    </motion.aside>
  );
}
function FinalSequence() {
  const phase = useGame((s) => s.phase),
    entered = useGame((s) => s.entered);
  if (!entered) return null;
  return (
    <AnimatePresence mode="wait">
      {phase === 'opening' && (
        <motion.div
          className="opening-caption"
          key="opening"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <Sparkles size={20} />
          <p>{birthday.finale.opening}</p>
          <span>FOR YOUR MOST BEAUTIFUL DAY</span>
        </motion.div>
      )}
      {phase === 'wish' && (
        <motion.div
          className="wish-card paper"
          key="wish"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          <p className="eyebrow">MAKE A LITTLE WISH</p>
          <h2>{birthday.finale.wishTitle}</h2>
          <p>{birthday.finale.wish}</p>
          <button
            className="primary-button"
            onClick={() => {
              audio.effect('blow');
              useGame.getState().blow();
            }}
          >
            {birthday.finale.blow}
            <Sparkles size={17} />
          </button>
        </motion.div>
      )}
      {phase === 'celebrating' && (
        <motion.div
          className="celebration-caption"
          key="celebrating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Heart size={22} />
          <p>{birthday.finale.celebrated}</p>
        </motion.div>
      )}
      {phase === 'greeting' && (
        <motion.div
          className="greeting-backdrop"
          key="greeting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.article
            className="greeting-card paper"
            initial={{ opacity: 0, y: 25, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="greeting-border" />
            <span className="greeting-corner top-left">✧</span>
            <span className="greeting-corner bottom-right">✧</span>
            <div className="greeting-flower">
              <LeafDoodle />
              <span>✽</span>
              <LeafDoodle />
            </div>
            <p className="eyebrow">{birthday.finale.english}</p>
            <span className="greeting-date">{birthday.date.replaceAll('-', '.')}</span>
            <h2>
              {birthday.recipient}，<br />
              <em>{birthday.finale.greeting}</em>
            </h2>
            <div className="greeting-rule">
              <span />
              <Heart size={13} />
              <span />
            </div>
            <div className="greeting-text">
              {birthday.finale.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            <div className="greeting-signature">
              <span>{birthday.finale.signature}</span>
              <b>{birthday.sender}</b>
            </div>
            <div className="greeting-actions">
              <button
                className="primary-button"
                onClick={() => {
                  useGame.getState().replay();
                  audio.effect('gift');
                }}
              >
                {birthday.finale.replay}
                <Gift size={16} />
              </button>
              <button className="secondary-button" onClick={() => useGame.getState().open('reset')}>
                {birthday.finale.restart}
                <RotateCcw size={15} />
              </button>
            </div>
            <p className="card-bottom-mark">A LITTLE ROOM, A LOT OF LOVE</p>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function Interface() {
  const music = useGame((s) => s.music),
    night = useGame((s) => s.night),
    entered = useGame((s) => s.entered),
    phase = useGame((s) => s.phase),
    active = useGame((s) => s.active),
    dialog = useGame((s) => s.dialog),
    locked = useGame((s) => s.locked),
    toast = useGame((s) => s.toast),
    hasKey = useGame((s) => s.hasKey),
    solved = useGame((s) => s.solved);
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setToastVisible(true);
    const timer = setTimeout(() => {
      setToastVisible(false);
      useGame.getState().notify('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <div className={`interface ${entered ? 'is-entered' : ''} ${phase !== 'explore' ? 'is-finale' : ''}`}>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (entered) useGame.getState().open('journal');
          }}
          aria-label="生日小屋"
        >
          <span className="brand-icon">
            <House size={26} strokeWidth={1.25} />
            <Heart className="brand-heart" size={9} fill="currentColor" />
          </span>
          <span>
            <b>{birthday.title}</b>
            <small>{birthday.subtitle}</small>
          </span>
        </a>
        <div className="topbar-center">
          <span className="tiny-star">✧</span>
          {phase === 'explore'
            ? entered
              ? '慢慢走，惊喜就藏在日常里'
              : '一间为你留着灯的小屋'
            : '今天，所有温柔都属于你'}
          <span className="tiny-star">✧</span>
        </div>
        <nav className="topbar-actions" aria-label="房间设置">
          <button
            className="icon-button sound-button"
            aria-label={music ? '关闭音乐' : '开启音乐'}
            aria-pressed={music}
            onClick={() => {
              void audio.start(birthday.backgroundMusic);
              useGame.getState().toggleMusic();
            }}
          >
            {music ? <Volume2 size={18} strokeWidth={1.4} /> : <VolumeX size={18} strokeWidth={1.4} />}
            <span>音乐{music ? '开' : '关'}</span>
          </button>
          {birthday.enableDayNight && (
            <button
              className="icon-button"
              aria-label={night ? '切换白天' : '切换夜晚'}
              disabled={phase !== 'explore'}
              onClick={() => {
                audio.effect('click');
                useGame.getState().toggleNight();
              }}
            >
              {night ? <Moon size={18} strokeWidth={1.4} /> : <Sun size={19} strokeWidth={1.3} />}
            </button>
          )}
          <span className="nav-separator" />
          <button
            className="icon-button"
            aria-label="操作帮助"
            onClick={() => useGame.getState().open('help')}
          >
            <CircleHelp size={19} strokeWidth={1.3} />
          </button>
        </nav>
      </header>
      <Welcome />
      <Progress />
      {!entered && (
        <div className="room-description">
          <span className="room-tag">THE BIRTHDAY ROOM</span>
          <p>把平凡的日子，过成值得珍藏的片刻。</p>
          <span className="room-coordinate">22° WARMTH · 100% LOVE</span>
        </div>
      )}
      {entered && phase === 'explore' && !dialog && (
        <>
          <div className={`crosshair ${active ? 'active' : ''}`} aria-hidden="true">
            <span />
          </div>
          <AnimatePresence mode="wait">
            {active && (
              <motion.button
                key="interaction"
                className="interact-prompt"
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => useGame.getState().interact(active)}
              >
                <kbd>E</kbd>
                <span>{objectById[active].name}</span>
                <span className="prompt-action">轻轻看看</span>
              </motion.button>
            )}
          </AnimatePresence>
          {hasKey && (
            <div className="key-inventory paper">
              <KeyRound size={18} strokeWidth={1.4} />
              <span>小钥匙</span>
              <Check size={12} />
            </div>
          )}
        </>
      )}
      <MobileControls />
      <FinalSequence />
      <Dialogs />
      <AnimatePresence>
        {toastVisible && toast && (
          <motion.div
            className="toast paper"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Lightbulb size={17} />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="bottom-bar">
        <div className="control-hint">
          {entered ? (
            <>
              <button className="view-lock" onClick={() => window.dispatchEvent(new Event('room:lock'))}>
                <Mouse size={17} strokeWidth={1.3} />
                <span>{locked ? '鼠标环顾' : '拖动环顾'}</span>
              </button>
              <span className="control-divider" />
              <span>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> 移动
              </span>
              <span className="control-divider" />
              <span>
                <kbd>E</kbd> 互动
              </span>
            </>
          ) : (
            <>
              <Footprints size={19} strokeWidth={1.3} />
              <span>不用着急，小屋里的时间是慢的。</span>
            </>
          )}
        </div>
        <nav className="bottom-actions" aria-label="探索工具">
          <button disabled={!entered || phase !== 'explore'} onClick={() => useGame.getState().open('hint')}>
            <Lightbulb size={17} strokeWidth={1.35} />
            <span>线索提示</span>
          </button>
          <button onClick={() => useGame.getState().open('journal')}>
            <BookOpen size={17} strokeWidth={1.35} />
            <span>手记</span>
          </button>
          <button onClick={() => useGame.getState().open('collection')}>
            <Heart size={17} strokeWidth={1.35} />
            <span>已收集的心意</span>
            <small>{solved.length}/5</small>
          </button>
          <span className="control-divider" />
          <button aria-label="重新开始" onClick={() => useGame.getState().open('reset')}>
            <RotateCcw size={16} strokeWidth={1.35} />
            <span>重新开始</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
