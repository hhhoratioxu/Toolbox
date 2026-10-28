import type { Locale, PetState } from '../shared/types'
const en = {
  tagline: 'A little company.', companion: 'Companion', habitat: 'Desktop & play', preferences: 'Preferences', about: 'Field notes',
  intro: 'Your everyday, a little softer.', introSub: 'A quiet corner of your desktop, made a little warmer.',
  offline: 'HAPPILY OFFLINE', goodDay: 'A good day to be together.', mood: 'Happiness', hunger: 'Hunger', bond: 'Friendship',
  quick: 'Little moments', quickSub: 'Good company is in the small things.', feed: 'A little treat', pet: 'Gentle pets', sleep: 'Time for a nap', wake: 'Rise & shine',
  wardrobe: 'A coat for every mood', wardrobeSub: 'Same little friend. A different kind of cozy.', snow: 'Snowdrop', peach: 'Peach milk', storm: 'Rain cloud',
  name: 'A name to call home', nameHint: 'Up to 24 characters. Saved when you finish editing.',
  desktopTitle: 'A place on your desktop.', desktopSub: 'Set the pace. Make room for a little curiosity.',
  display: 'On your desktop', visible: 'Show companion', visibleSub: 'Find your friend again from the menu bar or system tray.',
  size: 'Companion size', animation: 'Animation pace', movement: 'Walking pace',
  behavior: 'A little independence', autonomous: 'Wander freely', autonomousSub: 'Explore, smile, and take the occasional nap.',
  follow: 'Follow your cursor', followSub: 'Follows nearby movement; rests when your cursor leaves or stops.',
  top: 'Always on top', topSub: 'Keep your friend above other windows.',
  reset: 'Bring companion home', resetSub: 'Moves to a safe spot on your primary screen.',
  prefTitle: 'Just your kind of cozy.', prefSub: 'Small details, settled your way.', appearance: 'Appearance', theme: 'Color theme',
  system: 'System', light: 'Light', dark: 'Dark', language: 'Language', systemSettings: 'At your service',
  login: 'Welcome me at login', loginSub: 'Start quietly when you sign in.', loginDev: 'Available after installing. Portable builds cannot register startup.',
  sound: 'Tiny sounds', soundSub: 'A soft, locally generated chime when you interact. Off by default.',
  privacy: 'A private little friendship', privacyText: 'No account. No telemetry. No cloud. Your companion and preferences live only on this computer.',
  notesTitle: 'Small paws. Thoughtful details.', notesSub: 'An original desktop companion, made with care.',
  gestures: 'A few ways to say hello', clickHint: 'Click for a little reaction. Double-click for extra affection. Drag to move. Right-click for the companion menu.',
  recovery: 'Always a way home', recoveryText: 'Use the menu bar or system tray to show your companion, open preferences, or restore a safe position.',
  keys: 'Built to stay yours', keysText: 'AI is an optional future extension. This version makes no API calls and needs no subscription or key.',
  version: 'Unsigned preview', quit: 'Quit HoriPet', close: 'Close preferences', loading: 'Waking your companion…', error: 'Could not apply this change',
  paused: 'Wandering paused', saved: 'Changes save automatically', healthy: 'Feeling lovely', hungry: 'Could use a treat',
  lowPower: 'Taking it slow', bubbleHello: 'Oh, hello there!', bubblePurr: 'Prrrr… that feels nice.', bubbleLove: 'You make my day ♡',
  bubbleYum: 'A treat? For me? ♡', bubbleNight: 'See you in my dreams…', bubbleMorning: 'Five more minutes?', bubbleHappy: 'Happy to be here ♡',
  stateIdle: 'Just being a cat', stateWalk: 'A little exploring', stateRun: 'Tiny zoomies!', stateSleep: 'Dreaming of you', stateWake: 'A sleepy stretch',
  stateHappy: 'A happy little heart', stateTouch: 'Purring softly', stateDrag: 'Up, up and away!', stateEat: 'Snack time', stateFollow: 'Right behind you'
} as const
type Messages = { [K in keyof typeof en]: string }
const zh: Messages = {
  tagline: '一点点，温柔的陪伴。', companion: '我的伙伴', habitat: '桌面与互动', preferences: '偏好设置', about: '陪伴手记',
  intro: '让日常，柔软一点。', introSub: '在忙碌的桌面上，留一个温暖的小角落。',
  offline: '安心离线 · 静静陪伴', goodDay: '今天，也要一起好好生活。', mood: '心情', hunger: '饥饿', bond: '亲密度',
  quick: '小小的亲密时刻', quickSub: '好的陪伴，藏在每一件小事里。', feed: '喂一口零食', pet: '轻轻摸摸头', sleep: '睡个好觉', wake: '起床伸个懒腰',
  wardrobe: '给心情换件外衣', wardrobeSub: '还是熟悉的小伙伴，多一点新鲜的可爱。', snow: '初雪', peach: '蜜桃牛奶', storm: '小小雨云',
  name: '一个属于它的名字', nameHint: '最多 24 个字符，编辑完成后自动保存。',
  desktopTitle: '在你的桌面，安个家。', desktopSub: '调整陪伴的节奏，给好奇心留一点空间。',
  display: '桌面上的小伙伴', visible: '显示宠物', visibleSub: '随时通过菜单栏或系统托盘找回它。',
  size: '宠物大小', animation: '动画节奏', movement: '移动速度',
  behavior: '一点点自由', autonomous: '自主活动', autonomousSub: '散散步、笑一笑，偶尔打个小盹。',
  follow: '跟随鼠标', followSub: '追随附近的光标；光标远离或停下后恢复休息。',
  top: '始终置顶', topSub: '让它陪在其他窗口上方。', reset: '带它回家', resetSub: '将宠物找回主屏幕的安全位置。',
  prefTitle: '刚刚好的，舒适。', prefSub: '一点小细节，让陪伴更合你心意。', appearance: '外观与语言', theme: '界面主题',
  system: '跟随系统', light: '浅色', dark: '深色', language: '界面语言', systemSettings: '安静地，等你回来',
  login: '登录时启动', loginSub: '登录电脑时，安静地陪你开始新一天。', loginDev: '安装后可用；便携版不注册开机启动。',
  sound: '轻柔的互动音效', soundSub: '互动时播放本地生成的轻音，默认关闭。',
  privacy: '只属于你们的小世界', privacyText: '没有账号，没有遥测，没有云端。宠物和偏好只保存在这台电脑上。',
  notesTitle: '小小爪印，认真陪伴。', notesSub: '一个原创的桌面伙伴，每一处都带着心意。',
  gestures: '打招呼的几种方式', clickHint: '单击，收获一个小表情；双击，收获更多喜欢。按住拖动来搬家，右键打开宠物菜单。',
  recovery: '总有一条回家的路', recoveryText: '通过菜单栏或系统托盘，可以重新显示宠物、打开偏好设置，或将它带回安全位置。',
  keys: '一直在你的身边', keysText: 'AI 是未来可选的扩展。当前版本不调用任何 API，不需要订阅或密钥。',
  version: '未签名预览版', quit: '退出 HoriPet', close: '关闭设置', loading: '小伙伴正在醒来…', error: '未能应用修改',
  paused: '自主活动已暂停', saved: '所有修改都会自动保存', healthy: '今天心情很好', hungry: '想吃一点零食', lowPower: '慢慢地，休息一下',
  bubbleHello: '喵，你来啦！', bubblePurr: '呼噜呼噜…好舒服。', bubbleLove: '最喜欢和你在一起 ♡', bubbleYum: '是给我的小零食吗？♡',
  bubbleNight: '我们梦里见…', bubbleMorning: '再睡五分钟好不好？', bubbleHappy: '有你在，真好 ♡',
  stateIdle: '做一只自在的小猫', stateWalk: '发现桌面的小秘密', stateRun: '小猫闪电出击！', stateSleep: '梦里也有你的身影', stateWake: '伸个长长的懒腰',
  stateHappy: '心里开了一朵小花', stateTouch: '正在小声打呼噜', stateDrag: '好像飞起来啦！', stateEat: '认真吃饭的小猫', stateFollow: '我就在你身后'
}
export const messages = (locale: Locale): Messages => locale === 'en' ? en : zh
const stateKeys: Record<PetState, keyof Messages> = { idle: 'stateIdle', walk: 'stateWalk', run: 'stateRun', sleep: 'stateSleep', wake: 'stateWake', happy: 'stateHappy', touch: 'stateTouch', drag: 'stateDrag', eat: 'stateEat', follow: 'stateFollow' }
export const stateLabel = (state: PetState, locale: Locale) => messages(locale)[stateKeys[state]]
export function bubbleText(key: string, locale: Locale): string {
  const keys: Record<string, keyof Messages> = { hello: 'bubbleHello', purr: 'bubblePurr', love: 'bubbleLove', yum: 'bubbleYum', goodnight: 'bubbleNight', morning: 'bubbleMorning', happy: 'bubbleHappy' }
  return keys[key] ? messages(locale)[keys[key]] : ''
}
