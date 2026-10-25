// Pure game rules, shared by the app and the puzzle generator.
export const last = (w) => w[w.length - 1];

// Shortest list of theme words linking start -> end (both excluded), or null.
export function solve(words, start, end) {
  const prev = new Map([[start, null]]);
  const queue = [start];
  for (const u of queue) {
    if (u !== start && last(u) === end[0]) {
      const path = [];
      for (let w = u; w !== start; w = prev.get(w)) path.unshift(w);
      return path;
    }
    for (const v of words) {
      if (v[0] === last(u) && v !== end && !prev.has(v)) {
        prev.set(v, u);
        queue.push(v);
      }
    }
  }
  return null;
}

const sets = new WeakMap();
const wordSet = (theme) => sets.get(theme) ?? sets.set(theme, new Set(theme.words)).get(theme);

// The theme word a typed word stands for (itself, or its singular), or null.
export function resolve(word, theme) {
  const set = wordSet(theme);
  if (set.has(word)) return word;
  const singulars = [];
  if (word.endsWith('ies')) singulars.push(word.slice(0, -3) + 'y');
  if (word.endsWith('ves')) singulars.push(word.slice(0, -3) + 'f', word.slice(0, -3) + 'fe');
  if (word.endsWith('es')) singulars.push(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) singulars.push(word.slice(0, -1));
  return singulars.find((s) => set.has(s)) ?? null;
}

// Error message for playing `word` after `chain` (chain[0] is the start word), or null if legal.
// Plurals are accepted, and a word and its plural count as the same word for repeats.
export function check(word, chain, puzzle, theme) {
  const base = resolve(word, theme);
  if (!base) return `Not in ${theme.name}`;
  const key = (w) => resolve(w, theme) ?? w;
  if (base === key(puzzle.e) || chain.some((w) => key(w) === base)) return 'Already used';
  if (word[0] !== last(chain[chain.length - 1])) return `Must start with ${last(chain[chain.length - 1]).toUpperCase()}`;
  return null;
}

export const isLinked = (chain, puzzle) => chain.length > 1 && last(chain[chain.length - 1]) === puzzle.e[0];

export const stars = (used, par) => (used <= par ? 3 : used === par + 1 ? 2 : 1);
