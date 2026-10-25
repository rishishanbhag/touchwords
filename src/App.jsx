import { useEffect, useState, useCallback } from 'react';
import data from './puzzles.json';
import { check, isLinked, last, stars } from './game.js';
import { dayIndex, msToMidnight, emptyStats, recordResult, load, save } from './daily.js';

// ?day=N previews another day (dev/testing); progress for it is still saved under that day
const override = new URLSearchParams(location.search).get('day');
const DAY = override !== null ? Number(override) : dayIndex(data.epoch);
const puzzle = data.days[((DAY % data.days.length) + data.days.length) % data.days.length];
const theme = data.themes[puzzle.t];
const NUMBER = DAY + 1;

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function freshGame() {
  return { day: DAY, chain: [puzzle.s], status: 'playing' };
}

function Word({ word, color, linkFirst, linkLast, label }) {
  return (
    <div className="flex items-center gap-2 pop" aria-label={label ? `${label}: ${word}` : word}>
      <div className="flex gap-1">
        {[...word].map((ch, i) => {
          const isLink = (linkFirst && i === 0) || (linkLast && i === word.length - 1);
          return (
            <span
              key={i}
              className={`tile ${isLink ? 'bg-violet text-white' : color}`}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Link() {
  return <div aria-hidden="true" className="h-4 w-1 bg-ink ml-3" />;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-20 bg-ink/30 grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="brutal bg-cream w-full max-w-sm p-5 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-2 right-3 font-display text-xl" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="font-display text-xl mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Countdown() {
  const [ms, setMs] = useState(msToMidnight());
  useEffect(() => {
    const id = setInterval(() => setMs(msToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = new Date(ms).toISOString().slice(11, 19);
  return <span className="font-display tabular-nums">{t}</span>;
}

export default function App() {
  const [game, setGame] = useState(() => {
    const saved = load('tw-game', null);
    // start word check: a regenerated puzzles.json can change what today's puzzle is
    return saved?.day === DAY && saved.chain?.[0] === puzzle.s ? saved : freshGame();
  });
  const [stats, setStats] = useState(() => load('tw-stats', emptyStats));
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState('');
  const [shake, setShake] = useState(false);
  const [modal, setModal] = useState(() => (load('tw-seen-help', false) ? (game.status !== 'playing' ? 'result' : null) : 'help'));

  useEffect(() => save('tw-game', game), [game]);
  useEffect(() => save('tw-stats', stats), [stats]);

  const playing = game.status === 'playing';
  const need = last(game.chain[game.chain.length - 1]);
  const used = game.chain.length - 1;

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? '' : t)), 1800);
  };

  const finish = (status, starCount) => {
    setStats((s) => recordResult(s, DAY, starCount));
    setTimeout(() => setModal('result'), 700);
    return status;
  };

  const submit = useCallback(() => {
    const word = need + typed;
    if (!typed) return;
    const err = check(word, game.chain, puzzle, theme);
    if (err) {
      flash(err);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const chain = [...game.chain, word];
    const won = isLinked(chain, puzzle);
    setGame({ ...game, chain, status: won ? finish('won', stars(chain.length - 1, puzzle.p)) : 'playing' });
    setTyped('');
  }, [game, typed, need]);

  const press = useCallback(
    (key) => {
      if (!playing || modal) return;
      if (key === 'Enter') submit();
      else if (key === 'Backspace') setTyped((t) => t.slice(0, -1));
      else if (/^[a-z]$/i.test(key) && typed.length < 15) setTyped((t) => t + key.toLowerCase());
    },
    [playing, modal, submit, typed]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      press(e.key);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [press]);

  const undo = () => {
    if (used > 0) setGame({ ...game, chain: game.chain.slice(0, -1) });
    setTyped('');
  };

  const giveUp = () => {
    setModal(null);
    setGame({ ...game, status: finish('gaveup', 0) });
  };

  const result = game.status === 'won' ? stars(used, puzzle.p) : 0;

  const share = async () => {
    const text = [
      `Touchwords #${NUMBER} · ${theme.name}`,
      result ? `${'★'.repeat(result)}${'☆'.repeat(3 - result)} ${used} words (par ${puzzle.p})` : `Gave up (par ${puzzle.p})`,
      `${'■'.repeat(used)}${result ? '□' : '×'}`,
      location.origin + location.pathname,
    ].join('\n');
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        flash('Copied to clipboard!');
      }
    } catch {
      flash("Couldn't share");
    }
  };

  const closeModal = useCallback(() => {
    save('tw-seen-help', true);
    setModal(null);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pb-4">
      {/* header */}
      <header className="w-full max-w-md flex items-center justify-between py-3">
        <button className="btn bg-white w-10 h-10" onClick={() => setModal('help')} aria-label="How to play">
          ?
        </button>
        <h1 className="font-display text-2xl tracking-tight">
          Touch<span className="text-violet">words</span>
        </h1>
        <button className="btn bg-white h-10 px-3 text-sm" onClick={() => setModal('stats')} aria-label="Statistics">
          Stats
        </button>
      </header>

      {/* theme card */}
      <section className="w-full max-w-md brutal bg-sky p-3 mt-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium">Puzzle #{NUMBER} · today's theme</p>
          <p className="font-display text-xl leading-tight">
            {theme.name}
          </p>
        </div>
        <div className="text-right font-medium leading-tight">
          <p className="text-xs">Par</p>
          <p className="font-display text-2xl">{puzzle.p}</p>
        </div>
      </section>

      {/* chain */}
      <main className="w-full max-w-md flex-1 brutal bg-white mt-4 p-3 overflow-y-auto">
        <Word word={puzzle.s} color="bg-pink" linkLast label="Start" />
        {game.chain.slice(1).map((w) => (
          <div key={w}>
            <Link />
            <Word word={w} color="bg-white" linkFirst linkLast />
          </div>
        ))}
        {playing && (
          <>
            <Link />
            <div className={`flex gap-1 ${shake ? 'shake' : ''}`} aria-label={`Your word: ${need}${typed}`}>
              <span className="tile bg-violet text-white">{need}</span>
              {[...typed].map((ch, i) => (
                <span key={i} className="tile bg-white">
                  {ch}
                </span>
              ))}
              <span className="tile bg-white border-dashed animate-pulse" aria-hidden="true" />
            </div>
          </>
        )}
        {game.status === 'gaveup' && (
          <>
            <p className="text-sm font-medium mt-3 mb-1">One best chain:</p>
            {puzzle.sol.map((w) => (
              <div key={w}>
                <Word word={w} color="bg-white" linkFirst linkLast />
                <Link />
              </div>
            ))}
          </>
        )}
        <div className={playing ? 'opacity-60 mt-4' : ''}>
          {!playing && game.status === 'won' && <Link />}
          {playing && <p className="text-xs font-medium mb-1">…until you reach</p>}
          <Word word={puzzle.e} color="bg-mint" linkFirst label="End" />
        </div>
      </main>

      {/* toast */}
      <div role="status" aria-live="polite" className="h-0 relative w-full max-w-md">
        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-14 brutal bg-ink text-white px-4 py-2 font-medium whitespace-nowrap z-10">
            {toast}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="w-full max-w-md flex gap-2 mt-3">
        {playing ? (
          <>
            <button className="btn bg-white flex-1 py-2 text-sm" onClick={undo} disabled={!used && !typed}>
              ↶ Undo word
            </button>
            <span className="brutal bg-cream px-3 py-2 font-display text-sm grid place-items-center">{used} used</span>
            <button className="btn bg-white flex-1 py-2 text-sm" onClick={() => setModal('giveup')}>
              Give up
            </button>
          </>
        ) : (
          <button className="btn bg-lemon flex-1 py-3" onClick={() => setModal('result')}>
            See result
          </button>
        )}
      </div>

      {/* keyboard */}
      {playing && (
        <div className="w-full max-w-md mt-3 flex flex-col gap-1.5 select-none">
          {ROWS.map((row, r) => (
            <div key={row} className="flex gap-1 justify-center">
              {r === 2 && (
                <button className="btn bg-mint px-2 text-xs h-12" onClick={() => press('Enter')}>
                  Enter
                </button>
              )}
              {[...row].map((k) => (
                <button key={k} className="btn bg-white flex-1 max-w-10 h-12 text-sm !shadow-[2px_2px_0_#1c1b29]" onClick={() => press(k)}>
                  {k.toUpperCase()}
                </button>
              ))}
              {r === 2 && (
                <button className="btn bg-pink px-2 text-sm h-12" onClick={() => press('Backspace')} aria-label="Delete letter">
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'help' && (
        <Modal title="How to play" onClose={closeModal}>
          <ul className="space-y-2 text-sm font-medium">
            <li>Get from the <b className="bg-pink px-1">START</b> word to the <b className="bg-mint px-1">END</b> word with a chain of words.</li>
            <li>Each word must start with the <b className="bg-violet text-white px-1">last letter</b> of the word before it.</li>
            <li>Every word must fit <b>today's theme</b>, and no repeats.</li>
            <li>You win when your last word ends with the END word's first letter.</li>
            <li>Match par for 3 stars. A new puzzle every day at midnight.</li>
          </ul>
          <div className="mt-4 text-xs font-medium">Example · Animals</div>
          <div className="mt-1 space-y-1 scale-90 origin-left">
            <Word word="cat" color="bg-pink" linkLast />
            <Word word="toad" color="bg-white" linkFirst linkLast />
            <Word word="dog" color="bg-mint" linkFirst />
          </div>
          <button className="btn bg-lemon w-full py-3 mt-4" onClick={closeModal}>
            Let's go
          </button>
        </Modal>
      )}

      {modal === 'giveup' && (
        <Modal title="Give up?" onClose={closeModal}>
          <p className="text-center font-medium mt-2">
            We'll show you one best chain, but today counts as a loss and your {stats.streak}-day streak resets.
          </p>
          <div className="flex gap-2 mt-4">
            <button className="btn bg-mint flex-1 py-3" onClick={closeModal}>
              Keep going
            </button>
            <button className="btn bg-pink flex-1 py-3" onClick={giveUp}>
              Give up
            </button>
          </div>
        </Modal>
      )}

      {modal === 'stats' && (
        <Modal title="Stats" onClose={closeModal}>
          <StatsGrid stats={stats} />
        </Modal>
      )}

      {modal === 'result' && (
        <Modal title={result ? 'Linked!' : 'Next time!'} onClose={closeModal}>
          <p className="text-3xl text-center tracking-widest" aria-label={`${result} stars`}>
            {'★'.repeat(result) + '☆'.repeat(3 - result)}
          </p>
          <p className="text-center font-medium mt-1">
            {result ? `${used} word${used === 1 ? '' : 's'} · par ${puzzle.p}` : `Par was ${puzzle.p}: ${puzzle.sol.join(' → ')}`}
          </p>
          <StatsGrid stats={stats} />
          <button className="btn bg-lemon w-full py-3 mt-4" onClick={share}>
            Share
          </button>
          <p className="text-center text-sm font-medium mt-3">
            Next puzzle in <Countdown />
          </p>
        </Modal>
      )}
    </div>
  );
}

function StatsGrid({ stats }) {
  const items = [
    ['Played', stats.played],
    ['Win %', stats.played ? Math.round((stats.won / stats.played) * 100) : 0],
    ['Streak', stats.streak],
    ['Best', stats.maxStreak],
  ];
  return (
    <>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {items.map(([k, v], i) => (
          <div key={k} className={`brutal p-2 text-center ${['bg-pink', 'bg-lemon', 'bg-mint', 'bg-sky'][i]}`}>
            <div className="font-display text-xl">{v}</div>
            <div className="text-[10px] font-medium">{k}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-sm font-medium">
        {[3, 2, 1].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-12 text-violet">{'★'.repeat(n)}</span>
            <div className="flex-1">
              <div
                className="bg-violet text-white border-[3px] border-ink rounded px-1 text-right"
                style={{ width: `${Math.max(8, (stats.stars[n] / Math.max(1, ...stats.stars)) * 100)}%` }}
              >
                {stats.stars[n]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
