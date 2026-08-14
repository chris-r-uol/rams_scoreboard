/**
 * Keyboard shortcuts and the remote command vocabulary.
 *
 * The suppression cases matter most: shortcuts fire on a bare window listener,
 * so without them typing a team name would score points.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('./realtime.js', () => ({
  joinRoom: vi.fn(), sendState: vi.fn(), sendStateNow: vi.fn(),
}));

const { shortcutsFor, matchShortcut, commandsFor, runCommand } = await import('./shortcuts.js');
const { scoreboard } = await import('./store.js');

/** Build a KeyboardEvent as if it came from a given element. */
function keyFrom(key, tagName = 'BODY', extra = {}) {
  return { key, target: { tagName, isContentEditable: false }, ...extra };
}

describe('matchShortcut', () => {
  it('matches a letter regardless of case', () => {
    expect(matchShortcut(keyFrom('q'), 'soccer')).toBeTruthy();
    expect(matchShortcut(keyFrom('Q'), 'soccer')).toBeTruthy();
  });

  it('maps space to the clock', () => {
    const hit = matchShortcut(keyFrom(' '), 'soccer');
    expect(hit?.label).toMatch(/clock/i);
  });

  it('stands down while typing in a field', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(matchShortcut(keyFrom('q', tag), 'soccer')).toBeNull();
    }
  });

  it('stands down in a contenteditable', () => {
    const e = { key: 'q', target: { tagName: 'DIV', isContentEditable: true } };
    expect(matchShortcut(e, 'soccer')).toBeNull();
  });

  it('leaves modifier combinations to the browser and OS', () => {
    expect(matchShortcut(keyFrom('q', 'BODY', { metaKey: true }), 'soccer')).toBeNull();
    expect(matchShortcut(keyFrom('q', 'BODY', { ctrlKey: true }), 'soccer')).toBeNull();
    expect(matchShortcut(keyFrom('q', 'BODY', { altKey: true }), 'soccer')).toBeNull();
  });

  it('ignores keys with no binding', () => {
    expect(matchShortcut(keyFrom('j'), 'soccer')).toBeNull();
  });
});

describe('per-sport bindings', () => {
  it('puts home on the left of the keyboard and away on the right', () => {
    const score = shortcutsFor('soccer').find((g) => g.group === 'Score');
    const keyFor = (label) => score.items.find((i) => i.label === label)?.keys[0];
    expect(keyFor('Home +1')).toBe('Q');
    expect(keyFor('Away +1')).toBe('P');
  });

  it('offers football its own controls', () => {
    const labels = shortcutsFor('american-football').flatMap((g) => g.items.map((i) => i.label));
    expect(labels.join(' ')).toMatch(/play clock/i);
    expect(labels.join(' ')).toMatch(/down/i);
  });

  it('offers hockey penalty timers', () => {
    const labels = shortcutsFor('ice-hockey').flatMap((g) => g.items.map((i) => i.label));
    expect(labels.join(' ')).toMatch(/penalty/i);
  });

  it('omits the clock group for Magic, which has no game clock', () => {
    // Better absent than shown as shortcuts that quietly do nothing.
    const groups = shortcutsFor('mtg').map((g) => g.group);
    expect(groups).not.toContain('Clock');
    expect(groups).toContain('Life');
  });

  it('gives each binding a unique key within a sport', () => {
    for (const sport of ['american-football', 'ice-hockey', 'basketball', 'mtg']) {
      const keys = shortcutsFor(sport).flatMap((g) => g.items.map((i) => i.keys[0]));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('remote commands', () => {
  it('reuses the shortcut definitions rather than a second vocabulary', () => {
    const commandLabels = commandsFor('soccer').flatMap((g) => g.items.map((i) => i.label));
    const shortcutLabels = shortcutsFor('soccer')
      .flatMap((g) => g.items.filter((i) => i.run).map((i) => i.label));
    expect(commandLabels.sort()).toEqual(shortcutLabels.sort());
  });

  it('drops the cheat sheet, which a remote cannot ask for', () => {
    const ids = commandsFor('soccer').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('?');
  });

  it('runs a known command and reports an unknown one', () => {
    scoreboard.becomeController();
    scoreboard.setSport('soccer');
    scoreboard.patch({ homeScore: 0 });

    expect(runCommand('soccer', 'Q')).toBe(true);
    expect(runCommand('soccer', 'not-a-command')).toBe(false);
  });
});
