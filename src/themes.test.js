import { describe, expect, test } from 'vitest';
import calendar from '../server/days.json';
import shipped from './themes.json';
import themes from '../data/themes.mjs';
import probes from '../data/probes.mjs';
import { solve } from './game.js';

describe.each(themes.map((t, i) => [t.name, t, i]))('theme %s', (name, theme, i) => {
  const days = calendar.days.filter((d) => d.t === i);

  test('shipped words match the data build', () => {
    expect(shipped[i].name).toBe(name);
    expect(shipped[i].words).toEqual(theme.words);
  });

  test('words are clean and unique', () => {
    expect(theme.words.every((w) => /^[a-z]{2,15}$/.test(w))).toBe(true);
    expect(new Set(theme.words).size).toBe(theme.words.length);
  });

  test('accepts the obvious members (probes)', () => {
    const missing = probes[name].split(/\s+/).filter((w) => !theme.words.includes(w));
    expect(missing).toEqual([]);
  });

  test('has enough puzzle words and appears in the calendar', () => {
    expect(theme.common.length).toBeGreaterThanOrEqual(80);
    expect(days.length).toBeGreaterThan(15);
  });

  test('every scheduled puzzle is solvable at its par from common words', () => {
    for (const d of days) {
      expect(theme.common).toContain(d.s);
      expect(theme.common).toContain(d.e);
      expect(solve(theme.common, d.s, d.e)).toHaveLength(d.p);
    }
  });

  test('difficulty spread: more than one par value', () => {
    expect(new Set(days.map((d) => d.p)).size).toBeGreaterThan(1);
  });
});
