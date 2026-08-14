/**
 * Scoreboard store — clocks, undo, persistence and co-controller forwarding.
 *
 * Every case here corresponds to something that actually broke:
 *
 *   Clocks      counted interval fires, so a backgrounded controller fell
 *               minutes behind with nothing on screen to indicate it.
 *   Undo        did not exist; corrections were mental arithmetic mid-game.
 *   Persistence did not exist; a reload mid-match blanked the overlay.
 *   Follower    sent absolute values computed from a mirrored state, so two
 *               taps inside one round trip scored one goal instead of two.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

// The transport is not under test here; the store's behaviour is.
const sent = [];
vi.mock('./realtime.js', () => ({
  joinRoom: vi.fn(),
  sendState: vi.fn((s) => sent.push(s)),
  sendStateNow: vi.fn((s) => sent.push(s)),
}));

const PERSIST_KEY = 'scoreboard-state-v1';

/** Fresh module instance per test — the store holds process-wide state. */
async function freshStore() {
  vi.resetModules();
  sent.length = 0;
  return import('./store.js');
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-14T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('clocks derive from wall time', () => {
  it('anchors a clock when its seconds are set', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();

    scoreboard.patch({ gameClockSeconds: 600, gameClockRunning: false });

    const s = get(scoreboard);
    expect(s.gameClockAnchorSeconds).toBe(600);
    expect(s.gameClockAnchorMs).toBe(Date.now());
  });

  it('counts down in real time while running', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({ gameClockSeconds: 100, gameClockRunning: true });

    vi.advanceTimersByTime(5000);

    expect(get(scoreboard).gameClockSeconds).toBe(95);
  });

  it('does not move while stopped', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({ gameClockSeconds: 100, gameClockRunning: false });

    vi.advanceTimersByTime(10000);

    expect(get(scoreboard).gameClockSeconds).toBe(100);
  });

  it('self-corrects after a long stall instead of losing the time', async () => {
    // The failure this replaces: a hidden tab is throttled to roughly one timer
    // fire per minute, and counting fires lost every second that did not tick.
    // Here the wall clock jumps 60s while the projector fires only once after.
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({ gameClockSeconds: 100, gameClockRunning: true });

    vi.setSystemTime(Date.now() + 60_000);
    vi.advanceTimersByTime(250); // a single projection after the stall

    expect(get(scoreboard).gameClockSeconds).toBe(40);
  });

  it('stops at zero rather than going negative', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({ gameClockSeconds: 3, gameClockRunning: true });

    vi.advanceTimersByTime(10_000);

    const s = get(scoreboard);
    expect(s.gameClockSeconds).toBe(0);
    expect(s.gameClockRunning).toBe(false);
  });

  it('counts up when the clock is set to', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({ gameClockDirection: 'up', gameClockSeconds: 0, gameClockRunning: true });

    vi.advanceTimersByTime(7000);

    expect(get(scoreboard).gameClockSeconds).toBe(7);
  });

  it('runs independent clocks at once, as a hockey penalty does', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({
      gameClockSeconds: 100, gameClockRunning: true,
      homePenaltySeconds: 120, homePenaltyRunning: true,
    });

    vi.advanceTimersByTime(8000);

    const s = get(scoreboard);
    expect(s.gameClockSeconds).toBe(92);
    expect(s.homePenaltySeconds).toBe(112);
  });
});

describe('undo', () => {
  it('unwinds operator actions in reverse order', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();

    scoreboard.patch({ homeScore: 1 });
    scoreboard.patch({ homeScore: 7 });
    scoreboard.patch({ awayScore: 3 });

    scoreboard.undo();
    expect(get(scoreboard).awayScore).toBe(0);
    scoreboard.undo();
    expect(get(scoreboard).homeScore).toBe(1);
    scoreboard.undo();
    expect(get(scoreboard).homeScore).toBe(0);
  });

  it('is not buried by a running clock', async () => {
    // Clock movement is applied silently precisely so a mis-click is one undo
    // away, not hundreds of one-second entries deep.
    const { scoreboard, undoDepth } = await freshStore();
    scoreboard.becomeController();

    scoreboard.patch({ homeScore: 1 });
    scoreboard.patch({ gameClockSeconds: 100, gameClockRunning: true });
    vi.advanceTimersByTime(30_000);

    const depthBefore = get(undoDepth);
    scoreboard.undo(); // takes back the clock start
    scoreboard.undo(); // takes back the score

    expect(depthBefore).toBeLessThan(5);
    expect(get(scoreboard).homeScore).toBe(0);
  });

  it('reports nothing to undo on a fresh game', async () => {
    const { scoreboard, undoDepth } = await freshStore();
    scoreboard.becomeController();
    expect(get(undoDepth)).toBe(0);
    expect(scoreboard.undo()).toBe(false);
  });

  it('takes back a reset', async () => {
    const { scoreboard, undoableReset } = await freshStore();
    scoreboard.becomeController();
    scoreboard.patch({ homeScore: 5, awayScore: 2 });

    scoreboard.reset();
    expect(get(scoreboard).homeScore).toBe(0);
    expect(get(undoableReset)).toBe(true);

    scoreboard.undo();
    expect(get(scoreboard).homeScore).toBe(5);
    expect(get(scoreboard).awayScore).toBe(2);
  });
});

describe('persistence', () => {
  it('saves and restores a game in progress', async () => {
    const first = await freshStore();
    first.scoreboard.becomeController();
    first.scoreboard.setSport('ice-hockey');
    first.scoreboard.patch({ homeScore: 4 });

    const second = await freshStore();
    second.scoreboard.becomeController();
    expect(second.scoreboard.restorePersisted()).toBe(true);
    expect(get(second.scoreboard).homeScore).toBe(4);
    expect(get(second.scoreboard).sport).toBe('ice-hockey');
  });

  it('never resumes a clock on its own', async () => {
    // A clock that restarted during a reload would run on unwatched.
    const first = await freshStore();
    first.scoreboard.becomeController();
    first.scoreboard.setSport('soccer');
    first.scoreboard.patch({ gameClockSeconds: 300, gameClockRunning: true });

    const second = await freshStore();
    second.scoreboard.becomeController();
    second.scoreboard.restorePersisted();

    expect(get(second.scoreboard).gameClockRunning).toBe(false);
  });

  it('ignores a stale game rather than resuming last week', async () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      savedAt: Date.now() - 7 * 60 * 60 * 1000,
      state: { sport: 'soccer', homeScore: 9 },
    }));

    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    expect(scoreboard.restorePersisted()).toBe(false);
    expect(get(scoreboard).homeScore).toBe(0);
  });

  it('ignores a saved game with no sport chosen', async () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      savedAt: Date.now(), state: { sport: null, homeScore: 3 },
    }));
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    expect(scoreboard.restorePersisted()).toBe(false);
  });

  it('does not restore a saved plan, which is a stale claim about the account', async () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      savedAt: Date.now(), state: { sport: 'soccer', plan: 'free' },
    }));
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    scoreboard.restorePersisted();

    expect(get(scoreboard).plan).toBeNull();
  });

  it('survives corrupt storage instead of throwing on load', async () => {
    localStorage.setItem(PERSIST_KEY, 'not json at all');
    const { scoreboard } = await freshStore();
    scoreboard.becomeController();
    expect(scoreboard.restorePersisted()).toBe(false);
  });

  it('only the host persists — a co-controller must not save its own copy', async () => {
    const { scoreboard } = await freshStore();
    scoreboard.setFollowerTransport(() => {});
    scoreboard.patch({ homeScore: 3 });

    expect(localStorage.getItem(PERSIST_KEY)).toBeNull();
  });
});

describe('co-controller forwarding', () => {
  it('forwards changes instead of owning them', async () => {
    const { scoreboard } = await freshStore();
    const outbox = [];
    scoreboard.setFollowerTransport((m) => outbox.push(m));

    scoreboard.patch({ homeScore: 2 });

    expect(outbox).toEqual([{ kind: 'patch', patch: { homeScore: 2 } }]);
  });

  it('does not drop rapid taps', async () => {
    // The bug this replaces: changes are computed from the mirrored state and
    // sent as absolute values, so two taps inside one round trip both computed
    // from the same starting score and the second overwrote the first.
    const { scoreboard } = await freshStore();
    const outbox = [];
    scoreboard.setFollowerTransport((m) => outbox.push(m));

    const bump = () => scoreboard.update((s) => ({ ...s, homeScore: s.homeScore + 1 }));
    bump(); bump(); bump(); bump();

    expect(outbox.map((m) => m.patch.homeScore)).toEqual([1, 2, 3, 4]);
  });

  it('sends only what changed, not the whole game', async () => {
    const { scoreboard } = await freshStore();
    const outbox = [];
    scoreboard.setFollowerTransport((m) => outbox.push(m));

    scoreboard.update((s) => ({ ...s, awayScore: s.awayScore + 1 }));

    expect(Object.keys(outbox[0].patch)).toEqual(['awayScore']);
  });

  it('forwards named calls so repeats do not coalesce', async () => {
    const { scoreboard } = await freshStore();
    const outbox = [];
    scoreboard.setFollowerTransport((m) => outbox.push(m));

    scoreboard.undo();
    scoreboard.undo();
    scoreboard.setSport('cricket');

    expect(outbox).toEqual([
      { kind: 'call', method: 'undo' },
      { kind: 'call', method: 'undo' },
      { kind: 'call', method: 'setSport', args: ['cricket'] },
    ]);
  });

  it('applies host state without echoing it back', async () => {
    const { scoreboard } = await freshStore();
    const outbox = [];
    scoreboard.setFollowerTransport((m) => outbox.push(m));

    scoreboard.applyHostState({ ...get(scoreboard), homeScore: 9 }, Date.now());

    expect(get(scoreboard).homeScore).toBe(9);
    expect(outbox).toHaveLength(0);
  });
});
