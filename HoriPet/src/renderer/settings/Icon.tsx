const paths = {
  paw: <><path d="M8 13c-3 2-4 6 0 7 2 .5 3-1 4-1s2 1.5 4 1c4-1 3-5 0-7-2-2-6-2-8 0Z"/><ellipse cx="5.5" cy="9" rx="2" ry="3" transform="rotate(-25 5.5 9)"/><ellipse cx="10" cy="5.5" rx="2" ry="3"/><ellipse cx="15" cy="5.5" rx="2" ry="3"/><ellipse cx="19" cy="10" rx="2" ry="3" transform="rotate(25 19 10)"/></>,
  leaf: <><path d="M20 3C9 2 3 7 4 14c1 8 14 6 16-11Z"/><path d="m5 20 10-11"/></>,
  sliders: <><path d="M5 3v18M12 3v18M19 3v18"/><path d="M2 8h6M9 16h6M16 8h6" strokeWidth="4"/></>,
  book: <><path d="M12 5c-3-2-7-2-10-1v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Z"/><path d="M12 5v16"/></>,
  heart: <path d="M12 21 3.5 12C-3 4 7-1 12 6c5-7 15-2 8.5 6Z"/>,
  bowl: <><path d="M3 13h18c0 6-4 8-9 8s-9-2-9-8Z"/><path d="m8 9 1-4m6 4 1-4M2 13h20"/></>,
  moon: <path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  home: <><path d="m3 11 9-8 9 8M5 9v12h14V9M10 21v-7h4v7"/></>,
  arrow: <path d="m9 5 7 7-7 7"/>,
  power: <><path d="M12 2v10M6 5a9 9 0 1 0 12 0"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  shield: <><path d="m12 2 8 3v7c0 5-5 9-8 10-3-1-8-5-8-10V5Z"/><path d="m8 12 3 3 5-6"/></>,
  sparkle: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></>
}
export type IconName = keyof typeof paths
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
