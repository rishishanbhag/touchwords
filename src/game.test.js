import { describe, expect, test } from 'vitest';
import { solve, check, resolve, isLinked, stars } from './game.js';
import { msToMidnight, recordResult, emptyStats } from './daily.js';
import calendar from '../server/days.json';
import themes from './themes.json';
import { getPuzzle, dayIndex as serverDay } from '../server/puzzle.js';

const theme = { name: 'Test', words: ['cat', 'tiger', 'rat', 'toad', 'dog', 'goat'] };
const puzzle = { s: 'cat', e: 'goat' };

test('solve finds shortest chain', () => {
  expect(solve(theme.words, 'cat', 'goat')).toEqual(['toad', 'dog']);
  expect(solve(theme.words, 'goat', 'cat')).toBeNull();
});

test('check rules', () => {
  expect(check('lion', ['cat'], puzzle, theme)).toBe('Not in Test');
  expect(check('cat', ['cat'], puzzle, theme)).toBe('Already used');
  expect(check('goat', ['cat'], puzzle, theme)).toBe('Already used');
  expect(check('dog', ['cat'], puzzle, theme)).toBe('Must start with T');
  expect(check('toad', ['cat'], puzzle, theme)).toBeNull();
  expect(isLinked(['cat', 'toad'], puzzle)).toBe(false);
  expect(isLinked(['cat', 'toad', 'dog'], puzzle)).toBe(true);
});

test('plurals', () => {
  const th = { name: 'T', words: ['cat', 'wolf', 'berry', 'fox', 'bus', 'toad', 'dog', 'goat'] };
  expect(['cats', 'wolves', 'berries', 'foxes', 'bus', 'buses', 'cator'].map((w) => resolve(w, th))).toEqual(['cat', 'wolf', 'berry', 'fox', 'bus', 'bus', null]);
  const p = { s: 'cat', e: 'goat' };
  expect(check('toads', ['cat'], p, th)).toBeNull();
  expect(check('goats', ['cat', 'toad'], p, { ...th, words: [...th.words] })).toBe('Already used'); // end word's plural
  expect(check('cats', ['cat'], p, th)).toBe('Already used');
  expect(check('dogs', ['cat', 'toad'], p, th)).toBeNull();
});

test('stars', () => {
  expect([stars(2, 2), stars(1, 2), stars(3, 2), stars(9, 2)]).toEqual([3, 3, 2, 1]);
});

test('server day index is UTC-based', () => {
  expect(serverDay(new Date('2026-10-25T00:00:00Z'))).toBe(0);
  expect(serverDay(new Date('2026-10-25T23:59:59Z'))).toBe(0);
  expect(serverDay(new Date('2026-10-26T00:00:00Z'))).toBe(1);
  expect(serverDay(new Date('2027-03-30T12:00:00Z'))).toBe(156);
});

test('getPuzzle hides the solution unless asked, and wraps past the calendar end', () => {
  expect(getPuzzle({ day: 3 })).not.toHaveProperty('sol');
  expect(getPuzzle({ day: 3, solution: true }).sol.length).toBe(getPuzzle({ day: 3 }).p);
  expect(getPuzzle({ day: calendar.days.length + 2 }).s).toBe(getPuzzle({ day: 2 }).s);
});

test('countdown targets UTC midnight', () => {
  expect(msToMidnight(new Date('2026-10-25T23:00:00Z'))).toBe(3600000);
});

test('streaks', () => {
  let s = recordResult(emptyStats, 5, 3);
  s = recordResult(s, 5, 3); // double record ignored
  s = recordResult(s, 6, 2);
  expect(s).toMatchObject({ played: 2, won: 2, streak: 2, maxStreak: 2 });
  expect(recordResult(s, 8, 1).streak).toBe(1); // skipped a day
  expect(recordResult(s, 7, 0)).toMatchObject({ streak: 0, maxStreak: 2, played: 3 });
});

describe('generated puzzles', () => {
  test('every day has a valid optimal solution', () => {
    for (const d of calendar.days) {
      const t = themes[d.t];
      const chain = [d.s];
      for (const w of d.sol) {
        expect(check(w, chain, d, t)).toBeNull();
        chain.push(w);
      }
      expect(isLinked(chain, d)).toBe(true);
    }
  });
});
