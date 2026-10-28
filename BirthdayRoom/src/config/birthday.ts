/** All personal information, story copy and puzzle clues live here. */
export const birthday = {
  recipient: '亲爱的你',
  date: '2026-10-19',
  sender: '一直陪着你的人',
  pageTitle: '生日小屋 · A Little Room for You',
  title: '生日小屋',
  subtitle: 'A LITTLE ROOM FOR YOU',
  enableDayNight: true,
  saveProgress: true,
  backgroundMusic: '', // Optional self-hosted audio URL. Empty = original Web Audio music.
  theme: { cream: '#f5f0e5', ink: '#514b3e', sage: '#76876a', blush: '#d8a091', gold: '#d2ad69' },
  welcome: {
    eyebrow: '一份只属于你的生日礼物',
    heading: '门开着，\n就等你了。',
    description: '我把一些小小的惊喜藏进了这个房间。慢慢走，慢慢看。',
    footnote: '今天，没有什么比你的快乐更重要。',
    button: '走进小屋',
    continue: '继续上次的探索',
  },
  notes: {
    intro: '这里的每一样小东西，都替我藏着一句想对你说的话。先从书架上的三本书开始吧。',
    clock: '时针指向四点，分针停在二十。窗边的抽屉，还记得这个约定。',
    locked: '惊喜还在悄悄准备。找到四份心意，再让唱片转起来，钥匙就能打开礼物。',
    recordLocked: '唱片可以先听。等书、抽屉、绿芽和小钥匙都找到了，再来把这支曲子送给今天的你。',
    recordReady: '四份心意已经到齐。轻轻放下唱针，为这间小屋点亮最后一份惊喜。',
    giftReady: '五份心意，都为你准备好了。茶几上的绿色礼物盒，正在等你打开。',
  },
  puzzles: {
    books: {
      title: '把一天排成一列',
      subtitle: '从第一片晨光，到最后一抹晚霞。',
      hint: '清晨的绿叶 → 午后的日光 → 傍晚的云霞。',
      cards: [
        { id: 'pink', color: '#d9a396', title: '傍晚的云霞', time: 'DUSK', symbol: 'cloud' },
        { id: 'green', color: '#94a77c', title: '清晨的绿叶', time: 'MORNING', symbol: 'leaf' },
        { id: 'yellow', color: '#e3c477', title: '午后的日光', time: 'AFTERNOON', symbol: 'sun' },
      ],
      order: ['green', 'yellow', 'pink'],
      error: '好像有一点不对。让我们从清晨重新开始。',
      blessing: {
        title: '下一站，晴天',
        text: '愿你的每一天，都有绿叶的清新、日光的明亮，还有晚霞的温柔。偶尔下雨也没关系，下一站，总会是晴天。',
        clue: '看看墙上的时钟，再去找窗边的抽屉。',
      },
    },
    drawer: {
      title: '约好的那个时间',
      subtitle: '时针在前，分钟在后。',
      password: '420',
      hint: '墙上的时钟停在 4:20。把小时与分钟连起来。',
      error: '时间好像还没对上。再看看墙上的时钟？',
      blessing: {
        title: '你值得被好好记得',
        text: '时间会带走很多事，却带不走那些认真惦记你的心意。愿你在往后的日子里，总被温柔以待，被坚定选择。',
        clue: '窗台上，有一株正在等你的绿芽。',
      },
    },
    plant: {
      title: '慢慢长大的勇气',
      text: '不必和别人同时开花。你有自己的季节，自己的方向。愿你一直有慢慢长大的勇气，也有被生活轻轻拥抱的运气。',
      clue: '沙发上的小抱枕，好像藏着一个口袋。',
    },
    pillow: {
      title: '抱枕藏着一个小口袋',
      subtitle: '里面有一把，刚好属于你的钥匙。',
      blessing: {
        title: '总有一扇门为你打开',
        text: '愿你想去的地方都有路，想见的人都在身旁。把这把小钥匙收好，它会为你打开今天最后的惊喜。',
        clue: '让黑胶唱片转起来，给今天配一首歌。',
      },
    },
    record: {
      title: '给今天的一首小曲',
      subtitle: '唱针落下，好事正在发生。',
      blessing: {
        title: '把快乐调成循环',
        text: '愿往后的每一个普通日子，都有值得反复播放的小快乐。现在，带着钥匙去打开茶几上的礼物吧。',
        clue: '绿色礼物盒已经解锁。最后的惊喜，就在里面。',
      },
    },
  },
  finale: {
    opening: '有些心意，要慢慢打开。',
    celebrated: '愿望已经收好。愿美好，正在来路上。',
    wishTitle: '现在，把时间留给你。',
    wish: '闭上眼睛，悄悄许一个愿望。不用说出来，我们也会替它保密。',
    blow: '许好啦，吹灭蜡烛',
    greeting: '生日快乐。',
    english: 'HAPPY BIRTHDAY TO YOU',
    paragraphs: [
      '愿你新的一岁，有热爱可奔赴，有温柔可停靠。',
      '愿所有不期而遇的美好，都恰好落在你的生活里。',
      '慢慢来，尽情笑。你本身，就是一份很好的礼物。',
    ],
    signature: '带着满满的心意',
    replay: '再看一遍',
    restart: '重新探索小屋',
  },
} as const;

export const keepsakes = [
  { id: 'books', name: '一整天的晴朗', icon: 'leaf', caption: birthday.puzzles.books.blessing.title },
  { id: 'drawer', name: '被记得的时光', icon: 'clock', caption: birthday.puzzles.drawer.blessing.title },
  { id: 'plant', name: '一株小小勇气', icon: 'sprout', caption: birthday.puzzles.plant.title },
  { id: 'pillow', name: '温柔的小钥匙', icon: 'key', caption: birthday.puzzles.pillow.blessing.title },
  { id: 'record', name: '循环的小快乐', icon: 'music', caption: birthday.puzzles.record.blessing.title },
] as const;
