import { categories } from './catalog';
import type { CatalogSnapshot } from './catalog';

interface SoftwareName { category: string; name: string; aliases: string[]; shared?: boolean }
// Names help find existing repository categories; they never supply invented domains.
const names: SoftwareName[] = [
  { category: 'AI', name: 'AI', aliases: ['人工智能', 'AI 服务'] },
  { category: 'AI', name: 'ChatGPT / OpenAI', aliases: ['ChatGPT', 'OpenAI'], shared: true },
  { category: 'AI', name: 'Claude / Anthropic', aliases: ['Claude', 'Anthropic'], shared: true },
  { category: 'AI', name: 'Gemini', aliases: ['谷歌 Gemini'], shared: true },
  { category: 'AI', name: 'DeepSeek', aliases: ['深度求索'], shared: true },
  { category: 'AI', name: 'Perplexity', aliases: [], shared: true },
  { category: 'AI', name: 'Grok', aliases: [], shared: true },
  { category: 'Adobe', name: 'Adobe', aliases: ['Adobe 全家桶'] },
  { category: 'Adobe', name: 'Photoshop', aliases: ['PS'], shared: true },
  { category: 'Apple', name: 'Apple', aliases: ['苹果', '苹果服务'] },
  { category: 'Apple', name: 'iCloud', aliases: ['苹果云盘'], shared: true },
  { category: 'Bilibili', name: 'Bilibili', aliases: ['哔哩哔哩', 'B站'] },
  { category: 'Disney', name: 'Disney+', aliases: ['Disney', '迪士尼'] },
  { category: 'GitHub', name: 'GitHub', aliases: [] },
  { category: 'Google', name: 'Google', aliases: ['谷歌', '谷歌服务'] },
  { category: 'Google', name: 'YouTube', aliases: ['油管'], shared: true },
  { category: 'Google', name: 'Gmail', aliases: ['谷歌邮箱'], shared: true },
  { category: 'HBOMAX', name: 'HBO Max', aliases: ['HBO', 'Max'] },
  { category: 'Infuse', name: 'Infuse', aliases: ['Infuse 播放器'] },
  { category: 'LAN', name: 'LAN', aliases: ['局域网', '内网'] },
  { category: 'Meituan', name: 'Meituan', aliases: ['美团', '美团外卖'] },
  { category: 'Meta', name: 'Meta', aliases: [] },
  { category: 'Meta', name: 'Facebook', aliases: ['脸书'], shared: true },
  { category: 'Meta', name: 'Instagram', aliases: ['IG'], shared: true },
  { category: 'Meta', name: 'WhatsApp', aliases: [], shared: true },
  { category: 'Microsoft', name: 'Microsoft', aliases: ['微软', '微软服务'] },
  { category: 'Microsoft', name: 'OneDrive', aliases: ['微软云盘'], shared: true },
  { category: 'Microsoft', name: 'Outlook', aliases: [], shared: true },
  { category: 'Microsoft', name: 'Office', aliases: ['Microsoft 365'], shared: true },
  { category: 'Microsoft', name: 'Xbox', aliases: [], shared: true },
  { category: 'NTP', name: 'NTP', aliases: ['时间同步', '网络校时'] },
  { category: 'Netflix', name: 'Netflix', aliases: ['奈飞', '网飞'] },
  { category: 'Parsec', name: 'Parsec', aliases: ['Parsec 远程桌面'] },
  { category: 'ParsecP2P', name: 'Parsec P2P', aliases: ['ParsecP2P'] },
  { category: 'SiriAI', name: 'Siri AI', aliases: ['Siri', 'SiriAI', 'Apple Intelligence', '苹果智能'] },
  { category: 'Spotify', name: 'Spotify', aliases: ['声破天'] },
  { category: 'Telegram', name: 'Telegram', aliases: ['电报', 'TG'] },
  { category: 'TikTok', name: 'TikTok', aliases: ['抖音国际版', '国际版抖音'] },
  { category: 'Twitter', name: 'Twitter / X', aliases: ['Twitter', 'X', '推特'] },
  { category: 'WeChat', name: 'WeChat', aliases: ['微信'] },
  { category: 'Weverse', name: 'Weverse', aliases: [] },
  { category: 'Wikimedia', name: 'Wikimedia', aliases: ['Wikipedia', '维基百科', '维基媒体'] },
  { category: 'Xiaohongshu', name: '小红书', aliases: ['Xiaohongshu', 'REDnote'] },
];

export interface SoftwareMatch {
  category: string; name: string; score: number; shared: boolean; reason: string;
}
export const normalizeSoftwareName = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').replace(/[\s._+\-/]/g, '');

export function findSoftware(query: string, snapshot: CatalogSnapshot): SoftwareMatch[] {
  const key = normalizeSoftwareName(query.trim());
  if (!key || query.length > 200) return [];
  const available = categories(snapshot);
  const records: SoftwareName[] = [
    ...available.map(category => ({ category, name: category, aliases: [] })),
    ...names.filter(n => available.includes(n.category)),
  ];
  const found = new Map<string, SoftwareMatch>();
  for (const record of records) {
    // Douyin and TikTok are different services; a partial alias must not equate them.
    if (record.category === 'TikTok' && key === '抖音') continue;
    const terms = [record.name, ...record.aliases].map(normalizeSoftwareName);
    const exact = terms.includes(key);
    const partial = key.length >= 2 && terms.some(term => term.includes(key));
    if (!exact && !partial) continue;
    // A new dedicated category beats an alias pointing at an older, broader category.
    const score = normalizeSoftwareName(record.category) === key ? 120 : exact ? 100 : 50;
    const match = {
      category: record.category, name: record.name, score, shared: !!record.shared,
      reason: record.shared ? `${record.name} 收录在 ${record.category} 分类中` : `对应仓库中的 ${record.category} 分类`,
    };
    const previous = found.get(record.category);
    if (!previous || score > previous.score || (score === previous.score && record.shared)) found.set(record.category, match);
  }
  return [...found.values()].sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
}

export function preferredSoftware(matches: SoftwareMatch[]): SoftwareMatch | undefined {
  if (matches.length === 1) return matches[0];
  if (matches[0]?.score >= 100 && matches[0].score > (matches[1]?.score ?? 0)) return matches[0];
}
