// Server-side only: the day calendar never ships to the browser.
import calendar from './days.json' with { type: 'json' };

const dayNum = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000;

// Whole UTC days since the calendar epoch
export const dayIndex = (now = new Date()) => dayNum(now) - dayNum(new Date(calendar.epoch + 'T00:00:00Z'));

// What the browser may know about a day. The solution is only included when asked for.
export function getPuzzle({ now = new Date(), day = dayIndex(now), solution = false } = {}) {
  const n = calendar.days.length;
  const d = calendar.days[((day % n) + n) % n];
  return { day, t: d.t, s: d.s, e: d.e, p: d.p, ...(solution && { sol: d.sol }) };
}
