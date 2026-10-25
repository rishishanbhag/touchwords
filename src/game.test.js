import { describe, expect, test } from 'vitest';
import { solve, check, resolve, isLinked, stars } from './game.js';
import { dayIndex, recordResult, emptyStats } from './daily.js';
import data from './puzzles.json';

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

test('day index', () => {
  expect(dayIndex('2026-10-25', new Date(2026, 9, 25, 23, 59))).toBe(0);
  expect(dayIndex('2026-10-25', new Date(2026, 9, 26, 0, 1))).toBe(1);
  expect(dayIndex('2026-10-25', new Date(2027, 2, 30, 12))).toBe(156); // across DST
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
    for (const d of data.days) {
      const t = data.themes[d.t];
      const chain = [d.s];
      for (const w of d.sol) {
        expect(check(w, chain, d, t)).toBeNull();
        chain.push(w);
      }
      expect(isLinked(chain, d)).toBe(true);
    }
  });
});
