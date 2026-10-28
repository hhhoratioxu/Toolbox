import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Cloud,
  Gift,
  Heart,
  KeyRound,
  Leaf,
  Lightbulb,
  Music2,
  Navigation,
  RotateCcw,
  Sparkles,
  Sprout,
  Sun,
  X,
} from 'lucide-react';
import { birthday, keepsakes } from '../config/birthday';
import { canSolve, nextPuzzle, useGame } from '../game/store';
import { objectById } from '../game/world';
import { audio } from '../game/audio';
import type { ObjectId, PuzzleId } from '../game/types';

const iconMap = { leaf: Leaf, clock: Clock3, sprout: Sprout, key: KeyRound, music: Music2 };
export function goToObject(id: ObjectId) {
  useGame.getState().close();
  window.dispatchEvent(new CustomEvent('room:navigate', { detail: id }));
}

function PanelTitle({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <>
      <div className="dialog-emblem">{icon ?? <Sparkles size={25} strokeWidth={1.25} />}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="dialog-title">{title}</h2>
      {description && <p className="dialog-description">{description}</p>}
    </>
  );
}
function Blessing({ id }: { id: PuzzleId }) {
  const data = id === 'plant' ? birthday.puzzles.plant : birthday.puzzles[id].blessing;
  const next = nextPuzzle(useGame.getState().solved);
  return (
    <div className="blessing-content">
      <PanelTitle
        eyebrow="收集到一份小小的心意"
        title={data.title}
        icon={<Heart size={25} strokeWidth={1.25} />}
      />
      <p className="blessing-text">{data.text}</p>
      <div className="clue-slip">
        <Lightbulb size={16} />
        <span>{data.clue}</span>
      </div>
      <button
        className="primary-button full"
        onClick={() => {
          audio.effect('click');
          useGame.getState().close();
        }}
      >
        把心意收好 <Heart size={16} />
      </button>
      <button className="text-button full" onClick={() => goToObject(next)}>
        带我去下一站 <Navigation size={14} />
      </button>
    </div>
  );
}
function Prerequisite({ id }: { id: PuzzleId }) {
  const next = nextPuzzle(useGame.getState().solved);
  return (
    <>
      <PanelTitle eyebrow="美好的事情，可以慢慢来" title="还有一份心意在等你" icon={<BookOpen size={24} />} />
      <p className="dialog-description">
        先去看看{objectById[next].name}吧。小屋里的惊喜，会一点一点为你展开。
      </p>
      {id === 'record' && (
        <button
          className="secondary-button full"
          onClick={() => {
            void audio.start(birthday.backgroundMusic);
            audio.effect('found');
            useGame.getState().notify('轻轻的旋律，已经在小屋里响起。');
          }}
        >
          先听一小段 <Music2 size={16} />
        </button>
      )}
      <button className="primary-button full" onClick={() => goToObject(next)}>
        带我去看看 <Navigation size={16} />
      </button>
    </>
  );
}
function BooksPuzzle() {
  const [selection, setSelection] = useState<string[]>([]),
    [error, setError] = useState('');
  function select(id: string) {
    audio.effect('click');
    if (id !== birthday.puzzles.books.order[selection.length]) {
      setSelection([]);
      setError(birthday.puzzles.books.error);
      return;
    }
    const selected = [...selection, id];
    setSelection(selected);
    setError('');
    if (selected.length === 3) {
      useGame.getState().solve('books');
      audio.effect('success');
    }
  }
  return (
    <>
      <PanelTitle
        eyebrow="第一份心意 · 藏在书页之间"
        title={birthday.puzzles.books.title}
        description={birthday.puzzles.books.subtitle}
        icon={<BookOpen size={26} strokeWidth={1.3} />}
      />
      <div className="color-cards">
        {birthday.puzzles.books.cards.map((card) => {
          const Icon = card.symbol === 'leaf' ? Leaf : card.symbol === 'sun' ? Sun : Cloud;
          const index = selection.indexOf(card.id);
          return (
            <motion.button
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.96 }}
              key={card.id}
              aria-label={card.title}
              disabled={index >= 0}
              className={`color-card ${index >= 0 ? 'selected' : ''}`}
              style={{ '--card-color': card.color } as React.CSSProperties}
              onClick={() => select(card.id)}
            >
              <span className="card-number">{index >= 0 ? `0${index + 1}` : '·'}</span>
              <Icon size={34} strokeWidth={1.1} />
              <small>{card.time}</small>
              <span>{card.title}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="sequence-slots" aria-label={`已选 ${selection.length}/3`}>
        {[0, 1, 2].map((i) => (
          <span className={selection[i] ? 'filled' : ''} key={i}>
            {selection[i] ? <Check size={13} /> : i + 1}
          </span>
        ))}
      </div>
      <p className={`puzzle-feedback ${error ? 'error' : ''}`} role="status">
        {error || '按照时间的顺序，轻轻点击三张卡片。'}
      </p>
    </>
  );
}
function DrawerPuzzle() {
  const [value, setValue] = useState(''),
    [error, setError] = useState('');
  return (
    <>
      <PanelTitle
        eyebrow="第二份心意 · 时间替我记得"
        title={birthday.puzzles.drawer.title}
        description={birthday.puzzles.drawer.subtitle}
        icon={<Clock3 size={26} strokeWidth={1.3} />}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value === birthday.puzzles.drawer.password) {
            useGame.getState().solve('drawer');
            audio.effect('drawer');
          } else {
            setError(birthday.puzzles.drawer.error);
            audio.effect('click');
          }
        }}
      >
        <label className="code-label" htmlFor="drawer-code">
          三位数字密码
        </label>
        <input
          id="drawer-code"
          className="code-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, '').slice(0, 3));
            setError('');
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{3}"
          maxLength={3}
          autoComplete="off"
          placeholder="···"
          aria-describedby="password-feedback"
        />
        <p id="password-feedback" className={`puzzle-feedback ${error ? 'error' : ''}`} role="status">
          {error || '在墙上的时钟里，找找答案。'}
        </p>
        <button type="submit" className="primary-button full" disabled={value.length !== 3}>
          打开抽屉 <KeyRound size={16} />
        </button>
      </form>
      <button className="text-button full" onClick={() => goToObject('clock')}>
        先去看看时钟 <Clock3 size={14} />
      </button>
    </>
  );
}
function PlantPuzzle() {
  const data = birthday.puzzles.plant;
  return (
    <>
      <PanelTitle
        eyebrow="第三份心意 · 与一株绿芽相遇"
        title={data.title}
        icon={<Sprout size={28} strokeWidth={1.2} />}
      />
      <p className="blessing-text">{data.text}</p>
      <button
        className="primary-button full"
        onClick={() => {
          useGame.getState().solve('plant');
          audio.effect('found');
        }}
      >
        收下这份勇气 <Sprout size={17} />
      </button>
    </>
  );
}
function PillowPuzzle() {
  return (
    <>
      <PanelTitle
        eyebrow="第四份心意 · 温柔有一个小秘密"
        title={birthday.puzzles.pillow.title}
        description={birthday.puzzles.pillow.subtitle}
        icon={<KeyRound size={28} strokeWidth={1.2} />}
      />
      <div className="key-illustration">
        <KeyRound size={72} strokeWidth={0.85} />
        <span className="key-spark one">✧</span>
        <span className="key-spark two">✧</span>
      </div>
      <button
        className="primary-button full"
        onClick={() => {
          useGame.getState().takeKey();
          audio.effect('found');
        }}
      >
        收好小钥匙 <KeyRound size={16} />
      </button>
    </>
  );
}
function RecordPuzzle() {
  return (
    <>
      <PanelTitle
        eyebrow="第五份心意 · 快乐可以单曲循环"
        title={birthday.puzzles.record.title}
        description={birthday.puzzles.record.subtitle}
        icon={<Music2 size={27} strokeWidth={1.2} />}
      />
      <div className="record-illustration">
        <span />
        <i />
      </div>
      <p className="dialog-description">{birthday.notes.recordReady}</p>
      <button
        className="primary-button full"
        onClick={() => {
          useGame.getState().solve('record');
          void audio.start(birthday.backgroundMusic);
          audio.effect('success');
        }}
      >
        轻轻放下唱针 <Music2 size={16} />
      </button>
    </>
  );
}
function Hint() {
  const solved = useGame((s) => s.solved),
    next = nextPuzzle(solved);
  const hints: Record<ObjectId, string> = {
    books: birthday.puzzles.books.hint,
    drawer: birthday.puzzles.drawer.hint,
    plant: '窗台上的绿芽很小，却藏着关于勇气的话。',
    pillow: birthday.puzzles.pillow.subtitle,
    record: birthday.notes.recordReady,
    gift: birthday.notes.giftReady,
    clock: birthday.notes.clock,
  };
  return (
    <>
      <PanelTitle
        eyebrow="给你一点点方向"
        title={next === 'gift' ? '最后一站，生日惊喜' : `去看看${objectById[next].name}`}
        icon={<Lightbulb size={26} strokeWidth={1.2} />}
      />
      <p className="blessing-text">{solved.length === 0 ? birthday.notes.intro : hints[next]}</p>
      <div className="clue-slip">
        <span>小提示</span>
        <span>{hints[next]}</span>
      </div>
      <button className="primary-button full" onClick={() => goToObject(next)}>
        带我去看看 <Navigation size={17} />
      </button>
      <p className="fine-print">会沿着房间里的小路慢慢走过去。随时移动即可停下。</p>
    </>
  );
}
function Journal({ collection = false }: { collection?: boolean }) {
  const solved = useGame((s) => s.solved);
  const [reading, setReading] = useState<PuzzleId | null>(null);
  if (reading)
    return (
      <>
        <button className="text-button journal-back" onClick={() => setReading(null)}>
          ← 回到手记
        </button>
        <Blessing id={reading} />
      </>
    );
  return (
    <>
      <PanelTitle
        eyebrow={collection ? '把每一份温柔都收好' : '关于今天的小小记录'}
        title={collection ? '已收集的心意' : '小屋手记'}
        icon={collection ? <Heart size={25} /> : <BookOpen size={25} />}
      />
      <div className="journal-list">
        {keepsakes.map((item, i) => {
          const Icon = iconMap[item.icon],
            done = solved.includes(item.id),
            next = nextPuzzle(solved) === item.id;
          return (
            <button
              className={`journal-item ${done ? 'done' : ''}`}
              key={item.id}
              onClick={() => {
                if (done) setReading(item.id);
                else if (next) goToObject(item.id);
              }}
              disabled={!done && !next}
            >
              <span className="journal-icon">
                <Icon size={20} strokeWidth={1.4} />
              </span>
              <span>
                <b>{done ? item.name : collection ? '还没发现的小心意' : objectById[item.id].name}</b>
                <small>{done ? item.caption : next ? '下一站，等你来发现' : '顺着线索，慢慢找到它'}</small>
              </span>
              <span className="journal-status">{done ? <Check size={16} /> : `0${i + 1}`}</span>
            </button>
          );
        })}
      </div>
      <p className="fine-print">
        {solved.length}/5 份心意已收好 ·{' '}
        {birthday.saveProgress ? '进度会自动保存在这台设备上' : '此版本未启用进度保存'}
      </p>
    </>
  );
}
function Help() {
  const quality = useGame((s) => s.quality);
  return (
    <>
      <PanelTitle eyebrow="小屋使用说明" title="自在一点，就很好" icon={<Heart size={24} />} />
      <div className="help-rows">
        <p>
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </span>
          <span>前后左右，慢慢走</span>
        </p>
        <p>
          <span>鼠标 / 拖动</span>
          <span>环顾房间 · 双击锁定视角</span>
        </p>
        <p>
          <span>
            <kbd>E</kbd> / 点击
          </span>
          <span>与眼前的小东西互动</span>
        </p>
        <p>
          <span>
            <kbd>Esc</kbd>
          </span>
          <span>释放鼠标 / 合上卡片</span>
        </p>
        <p>
          <span>手机与平板</span>
          <span>左摇杆移动，右侧滑动环顾</span>
        </p>
      </div>
      <p className="dialog-description">不知道往哪走时，打开「线索提示」，小屋会带你慢慢走到下一站。</p>
      <label className="quality-label" htmlFor="quality">
        画面细腻程度
        <select
          id="quality"
          value={quality}
          onChange={(e) => useGame.getState().setQuality(e.target.value as typeof quality)}
        >
          <option value="auto">随设备自动调整</option>
          <option value="high">细腻</option>
          <option value="low">轻盈</option>
        </select>
      </label>
      <button className="primary-button full" onClick={() => useGame.getState().close()}>
        知道啦，继续探索 <ArrowRight size={16} />
      </button>
    </>
  );
}
export function Dialogs() {
  const dialog = useGame((s) => s.dialog),
    lastBlessing = useGame((s) => s.lastBlessing),
    solved = useGame((s) => s.solved);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const input = panel.current?.querySelector('input');
      (input ?? panel.current?.querySelector<HTMLElement>('button'))?.focus();
    }, 90);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panel.current) return;
      const all = Array.from(
        panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]'),
      );
      if (!all.length) return;
      const first = all[0],
        last = all[all.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || !panel.current.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [dialog]);
  let content: ReactNode = null;
  if (dialog === 'books') content = <BooksPuzzle />;
  if (dialog === 'drawer') content = <DrawerPuzzle />;
  if (dialog === 'plant') content = <PlantPuzzle />;
  if (dialog === 'pillow') content = <PillowPuzzle />;
  if (dialog === 'record') content = <RecordPuzzle />;
  if (dialog && ['books', 'drawer', 'plant', 'pillow', 'record'].includes(dialog)) {
    const id = dialog as PuzzleId;
    if (!canSolve(id, solved)) content = <Prerequisite id={id} />;
    if (lastBlessing === id || solved.includes(id)) content = <Blessing id={id} />;
  }
  if (dialog === 'clock')
    content = (
      <>
        <PanelTitle
          eyebrow="时间在这里，留下了一个约定"
          title="4:20"
          description={birthday.notes.clock}
          icon={<Clock3 size={28} />}
        />
        <button className="primary-button full" onClick={() => goToObject('drawer')}>
          去窗边的抽屉看看 <Navigation size={17} />
        </button>
      </>
    );
  if (dialog === 'gift')
    content = (
      <>
        <PanelTitle
          eyebrow="五份心意，刚好拼成一个今天"
          title="这份惊喜，终于等到你"
          description={birthday.notes.giftReady}
          icon={<Gift size={29} strokeWidth={1.2} />}
        />
        <div className="gift-seal">
          <KeyRound size={24} />
          <span>小钥匙已就位</span>
          <Check size={17} />
        </div>
        <button
          className="primary-button full"
          onClick={() => {
            audio.effect('gift');
            useGame.getState().startGift();
          }}
        >
          打开生日礼物 <Sparkles size={17} />
        </button>
      </>
    );
  if (dialog === 'hint') content = <Hint />;
  if (dialog === 'journal' || dialog === 'collection')
    content = <Journal collection={dialog === 'collection'} />;
  if (dialog === 'help') content = <Help />;
  if (dialog === 'reset')
    content = (
      <>
        <PanelTitle
          eyebrow="每一次相遇，都可以是第一次"
          title="想重新探索一次吗？"
          description="这台设备上保存的机关进度会清空。小屋里所有的心意，都会重新藏好。"
          icon={<RotateCcw size={26} />}
        />
        <button className="primary-button full" onClick={() => useGame.getState().reset()}>
          重新探索小屋 <ArrowRight size={17} />
        </button>
        <button className="text-button full" onClick={() => useGame.getState().close()}>
          再待一会儿
        </button>
      </>
    );
  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          className="dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) useGame.getState().close();
          }}
        >
          <motion.div
            ref={panel}
            className={`dialog paper ${dialog === 'journal' || dialog === 'collection' ? 'journal-dialog' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            key={dialog}
            initial={{ opacity: 0, y: 22, rotate: -0.8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.32 }}
          >
            <button
              className="close-button icon-button"
              onClick={() => useGame.getState().close()}
              aria-label="合上卡片"
            >
              <X size={19} strokeWidth={1.3} />
            </button>
            {content}
            <div className="card-bottom-mark">
              WITH A LITTLE LOVE <Heart size={9} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
