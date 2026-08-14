/**
 * Keyboard shortcuts for the operator.
 *
 * Scoreboard operating is a real-time job: the operator is watching the game,
 * not the screen. Hunting for a button with a mouse is the slowest possible
 * way to start a clock, and starting the clock is the most time-critical
 * action in the product.
 *
 * Shortcuts live here rather than in the seven sport controllers so there is a
 * single place to see the whole scheme and keep it consistent. They act on the
 * store directly, which is also what the on-screen buttons do.
 *
 * LAYOUT REASONING:
 *   Home team keys sit on the left of the keyboard, away on the right, mirroring
 *   how the teams appear on the scorebug and how physical scoreboard consoles
 *   are arranged. Q/A raise and lower home; P/L raise and lower away.
 */

import { scoreboard } from './store.js';

/** Adjust a numeric field on the current state. */
function bump(field, delta, { min = 0, max = 999 } = {}) {
  const s = scoreboard.get();
  const next = Math.max(min, Math.min(max, (s[field] ?? 0) + delta));
  scoreboard.patch({ [field]: next });
}

/** Toggle a clock's running flag. */
function toggleClock(runningField) {
  const s = scoreboard.get();
  scoreboard.patch({ [runningField]: !s[runningField] });
}

/** Set a clock to a fixed number of seconds, stopped. */
function setClock(secondsField, runningField, seconds) {
  scoreboard.patch({ [secondsField]: seconds, [runningField]: false });
}

/**
 * Which fields carry "score" for a given sport. Most sports share
 * homeScore/awayScore; Magic tracks life totals instead.
 */
function scoreFields(sport) {
  if (sport === 'mtg') return { home: 'homeLife', away: 'awayLife', min: -99 };
  return { home: 'homeScore', away: 'awayScore', min: 0 };
}

/** The larger, sport-typical scoring increment, if the sport has one. */
const BIG_SCORE = {
  'american-football': { amount: 6, label: 'Touchdown (+6)' },
  basketball: { amount: 2, label: 'Field goal (+2)' },
  cricket: { amount: 4, label: 'Boundary (+4)' },
};

/**
 * Build the shortcut list for a sport.
 *
 * @param {string} sport
 * @returns {{ group: string, items: { keys: string[], label: string, run: () => void }[] }[]}
 */
export function shortcutsFor(sport) {
  const { home, away, min } = scoreFields(sport);
  const big = BIG_SCORE[sport];
  const isMtg = sport === 'mtg';

  const scoreItems = [
    { keys: ['Q'], label: isMtg ? 'Home life +1' : 'Home +1', run: () => bump(home, 1, { min }) },
    { keys: ['A'], label: isMtg ? 'Home life −1' : 'Home −1', run: () => bump(home, -1, { min }) },
    { keys: ['P'], label: isMtg ? 'Away life +1' : 'Away +1', run: () => bump(away, 1, { min }) },
    { keys: ['L'], label: isMtg ? 'Away life −1' : 'Away −1', run: () => bump(away, -1, { min }) },
  ];

  if (big) {
    scoreItems.push(
      { keys: ['W'], label: `Home ${big.label}`, run: () => bump(home, big.amount, { min }) },
      { keys: ['O'], label: `Away ${big.label}`, run: () => bump(away, big.amount, { min }) },
    );
  }

  const groups = [];

  // Magic has no game clock, so the clock group is omitted rather than shown
  // as a row of shortcuts that quietly do nothing.
  if (!isMtg) {
    groups.push({
      group: 'Clock',
      items: [
        { keys: ['Space'], label: 'Start / stop the main clock', run: () => toggleClock('gameClockRunning') },
        { keys: ['←'], label: 'Main clock −1 second', run: () => bump('gameClockSeconds', -1, { max: 5999 }) },
        { keys: ['→'], label: 'Main clock +1 second', run: () => bump('gameClockSeconds', 1, { max: 5999 }) },
      ],
    });
  }

  groups.push({ group: isMtg ? 'Life' : 'Score', items: scoreItems });

  const extras = sportExtras(sport);
  if (extras.length) groups.push({ group: 'This sport', items: extras });

  groups.push({
    group: 'General',
    items: [
      { keys: ['Z'], label: 'Undo last action', run: () => scoreboard.undo() },
      { keys: ['?'], label: 'Show or hide this list', run: null }, // handled by the shell
    ],
  });

  return groups;
}

/**
 * The same actions, flattened and addressable by id, for the phone remote.
 *
 * The remote deliberately reuses the shortcut definitions rather than defining
 * its own vocabulary: one list to keep correct, and the buttons on the phone
 * are guaranteed to do exactly what the keyboard does.
 *
 * `?` is dropped — showing a cheat sheet is a Controller concern, not something
 * a remote can ask for.
 */
export function commandsFor(sport) {
  return shortcutsFor(sport)
    .map(({ group, items }) => ({
      group,
      items: items
        .filter((i) => i.run)
        .map((i) => ({ id: commandId(i), label: i.label, keys: i.keys })),
    }))
    .filter((g) => g.items.length);
}

/** Stable identifier for an action — its primary key is unique within a sport. */
function commandId(item) {
  return item.keys[0];
}

/**
 * Execute a command received from a remote.
 *
 * Commands are looked up in the sport's own action list rather than applied as
 * arbitrary state patches, so a paired phone can only do things the controller
 * itself offers — not write anything it likes into the scoreboard.
 *
 * @returns {boolean} whether a matching action was found and run
 */
export function runCommand(sport, id) {
  for (const { items } of shortcutsFor(sport)) {
    for (const item of items) {
      if (item.run && commandId(item) === id) {
        item.run();
        return true;
      }
    }
  }
  return false;
}

/** Shortcuts that only make sense for one sport. */
function sportExtras(sport) {
  switch (sport) {
    case 'american-football':
      return [
        { keys: ['S'], label: 'Play clock — start / stop', run: () => toggleClock('playClockRunning') },
        { keys: ['D'], label: 'Reset play clock to 40', run: () => setClock('playClockSeconds', 'playClockRunning', 40) },
        { keys: ['N'], label: 'Next down', run: () => {
          const s = scoreboard.get();
          scoreboard.patch({ down: s.down >= 4 ? 1 : s.down + 1 });
        } },
        { keys: ['F'], label: 'Toggle penalty flag', run: () => {
          const s = scoreboard.get();
          scoreboard.patch({ flagThrown: !s.flagThrown });
        } },
      ];

    case 'basketball':
      return [
        { keys: ['S'], label: 'Shot clock — start / stop', run: () => toggleClock('shotClockRunning') },
        { keys: ['D'], label: 'Reset shot clock to 24', run: () => setClock('shotClockSeconds', 'shotClockRunning', 24) },
      ];

    case 'ice-hockey':
      return [
        { keys: ['['], label: 'Home penalty — 2 minutes', run: () => {
          scoreboard.patch({ homePenaltySeconds: 120, homePenaltyRunning: true });
        } },
        { keys: [']'], label: 'Away penalty — 2 minutes', run: () => {
          scoreboard.patch({ awayPenaltySeconds: 120, awayPenaltyRunning: true });
        } },
      ];

    default:
      return [];
  }
}

/**
 * Resolve a keyboard event to a shortcut action.
 *
 * Returns null when the event should be left alone — while typing in a field,
 * or when a modifier is held, so browser and OS shortcuts keep working.
 */
export function matchShortcut(event, sport) {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;

  const el = event.target;
  const tag = el?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) {
    return null;
  }

  const key = normaliseKey(event);
  if (!key) return null;

  for (const { items } of shortcutsFor(sport)) {
    for (const item of items) {
      if (item.run && item.keys.includes(key)) return item;
    }
  }
  return null;
}

/** Map a KeyboardEvent onto the key labels used in the shortcut tables. */
function normaliseKey(event) {
  switch (event.key) {
    case ' ': return 'Space';
    case 'ArrowLeft': return '←';
    case 'ArrowRight': return '→';
    case '[': return '[';
    case ']': return ']';
    default:
      return /^[a-zA-Z]$/.test(event.key) ? event.key.toUpperCase() : null;
  }
}
