import { initials } from '../lib/format.js';

const COLORS = [
  ['#0F2E25', '#FFFFFF'],
  ['#087A4A', '#FFFFFF'],
  ['#2F5D8A', '#FFFFFF'],
  ['#7A3E65', '#FFFFFF'],
  ['#FFC21A', '#0F2E25'],
  ['#B93226', '#FFFFFF'],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** A circle with the person's initials. A colour is picked from their name so it stays the same. */
export function Avatar({ name, size = 44, tone }) {
  const [bg, fg] = tone === 'sun' ? COLORS[4] : COLORS[hash(name || '') % COLORS.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
