// The daily puzzle changes at UTC midnight for everyone
export function msToMidnight(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next - now;
}

export const emptyStats = { played: 0, won: 0, streak: 0, maxStreak: 0, lastPlayed: null, lastWon: null, stars: [0, 0, 0, 0] };

// Record a finished game. starCount 0 = gave up.
export function recordResult(stats, day, starCount) {
  if (stats.lastPlayed === day) return stats;
  const won = starCount > 0;
  const streak = won ? (stats.lastWon === day - 1 ? stats.streak + 1 : 1) : 0;
  const stars = [...stats.stars];
  stars[starCount]++;
  return {
    played: stats.played + 1,
    won: stats.won + won,
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    lastPlayed: day,
    lastWon: won ? day : stats.lastWon,
    stars,
  };
}

export function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode / blocked storage: game still works, just not remembered
  }
}
