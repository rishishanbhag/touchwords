// Offline: turns data/themes.mjs into src/themes.json (browser) and server/days.json (server only).
import { writeFileSync } from 'node:fs';
import themes from '../data/themes.mjs';
import { solve } from '../src/game.js';

const EPOCH = '2026-10-25';
const DAYS = 730;
const MIN_PAR = 2, MAX_PAR = 5;

// mulberry32: deterministic so rebuilding gives the same calendar
let seed = 20261025;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// All usable (start, end) pairs per theme, shuffled
const pools = themes.map((theme) => {
  const words = theme.common;
  for (const w of theme.words) if (!/^[a-z]+$/.test(w)) throw new Error(`${theme.name}: bad word "${w}"`);
  const pairs = [];
  for (const s of words)
    for (const e of words) {
      if (s === e) continue;
      const sol = solve(words, s, e);
      if (sol && sol.length >= MIN_PAR && sol.length <= MAX_PAR) pairs.push({ s, e, p: sol.length, sol });
    }
  console.log(`${theme.name.padEnd(22)} ${words.length} words, ${pairs.length} pairs`);
  return shuffle(pairs);
});

// Difficulty ramps through the week: Mon easy -> Sun hard (day 0 is a Sunday-start of the cycle)
const RAMP = [2, 2, 3, 3, 3, 4, 5];
const usable = themes.map((_, i) => i).filter((i) => {
  const ok = pools[i].some((p) => p.p >= 3);
  if (!ok) console.warn(`skipping "${themes[i].name}": no puzzle with par >= 3`);
  return ok;
});

// take a pair with the wanted par, else the nearest easier one, else any
const take = (pool, want) => {
  for (let p = want; p >= MIN_PAR; p--) {
    const k = pool.findIndex((x) => x.p === p);
    if (k >= 0) return pool.splice(k, 1)[0];
  }
  return pool.pop();
};

const days = [];
while (days.length < DAYS) {
  if (usable.every((i) => !pools[i].length)) throw new Error('ran out of pairs');
  for (const t of shuffle([...usable])) {
    if (days.length >= DAYS) break;
    const pair = pools[t].length && take(pools[t], RAMP[days.length % 7]);
    if (pair) days.push({ t, ...pair });
  }
}
// themes stay in the file (indexes unchanged) even if never scheduled

// themes ship to the browser (needed to check words); the day calendar stays server-side
writeFileSync(new URL('../src/themes.json', import.meta.url), JSON.stringify(themes.map(({ name, words }) => ({ name, words }))));
writeFileSync(new URL('../server/days.json', import.meta.url), JSON.stringify({ epoch: EPOCH, days }));
console.log(`wrote ${days.length} days`);
