/**
 * Stat tracking state.
 *
 * The cases that matter are the two disciplines the port depends on:
 * everything is derived by replaying the event log rather than accumulated,
 * and only the log travels — never what is derived from it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const sent = [];
vi.mock('./realtime.js', () => ({
  joinRoom: vi.fn(),
  sendState: vi.fn(),
  sendStateNow: vi.fn(),
  sendStats: vi.fn((s) => sent.push(s)),
}));

const PERSIST_KEY = 'scoreboard-stats-v1';

async function freshStats() {
  vi.resetModules();
  sent.length = 0;
  return import('./statsStore.js');
}

/** A rushing event, in the engine's own vocabulary. */
function rush(id, yards, playerId = 'p1') {
  return {
    id, timestamp: Date.now(), category: 'rushing', action: 'rush_attempt',
    primaryPlayerId: playerId, yards,
  };
}

const ROSTER = [{ id: 'p1', playerName: 'Jack Smith', number: '12', position: 'RB' }];

beforeEach(() => localStorage.clear());

describe('derivation, not accumulation', () => {
  it('derives player stats by replaying the log', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 7));
    stats.addEvent(rush('e2', 3));

    const s = get(stats);
    expect(s.playerStats.p1.rushing.attempts).toBe(2);
    expect(s.playerStats.p1.rushing.yards).toBe(10);
  });

  it('undoes an entry correctly with no reversal logic', async () => {
    // The whole point of replaying: taking an event out is enough.
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));
    stats.addEvent(rush('e2', 3));

    stats.undoLastEvent();

    const s = get(stats);
    expect(s.playerStats.p1.rushing.attempts).toBe(1);
    expect(s.playerStats.p1.rushing.yards).toBe(7);
  });

  it('re-derives after an edit rather than patching a total', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));

    stats.updateEvent('e1', { yards: 40 });

    expect(get(stats).playerStats.p1.rushing.yards).toBe(40);
  });

  it('re-derives after a deletion from the middle of the log', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));
    stats.addEvent(rush('e2', 3));
    stats.addEvent(rush('e3', 5));

    stats.removeEvent('e2');

    const s = get(stats);
    expect(s.events.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(s.playerStats.p1.rushing.yards).toBe(12);
  });

  it('reports nothing to undo on an empty log', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    expect(stats.undoLastEvent()).toBe(false);
  });
});

describe('what travels', () => {
  it('sends the log but never what is derived from it', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));

    const wire = sent[sent.length - 1];
    expect(wire.events).toHaveLength(1);
    expect(wire.roster).toHaveLength(1);
    // Derived on arrival instead, so the payload does not carry the same
    // information twice.
    expect(wire.playerStats).toBeUndefined();
    expect(wire.teamStats).toBeUndefined();
    expect(wire.completedDrives).toBeUndefined();
  });

  it('rebuilds the derived fields on the receiving side', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 12));
    const wire = sent[sent.length - 1];

    const receiver = await freshStats();
    receiver.stats.applyRemote(wire);

    expect(get(receiver.stats).playerStats.p1.rushing.yards).toBe(12);
  });

  it('survives a payload from an older build missing fields', async () => {
    const { stats } = await freshStats();
    expect(() => stats.applyRemote({ events: [] })).not.toThrow();
    expect(get(stats).teamStats).toBeDefined();
  });

  it('ignores an empty payload rather than wiping the game', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));

    stats.applyRemote(null);

    expect(get(stats).events).toHaveLength(1);
  });
});

describe('who owns the stats', () => {
  it('only the controller persists', async () => {
    const { stats } = await freshStats();
    stats.setFollowerTransport(() => {});
    stats.addEvent(rush('e1', 7));

    expect(localStorage.getItem(PERSIST_KEY)).toBeNull();
  });

  it('a co-controller forwards instead of broadcasting', async () => {
    const { stats } = await freshStats();
    const outbox = [];
    stats.setFollowerTransport((m) => outbox.push(m));

    stats.addEvent(rush('e1', 7));

    expect(sent).toHaveLength(0);
    expect(outbox[0].kind).toBe('stats');
    expect(outbox[0].stats.events).toHaveLength(1);
  });

  it('a co-controller still shows its own entry immediately', async () => {
    // Applied locally so the operator sees it without waiting for the echo.
    const { stats } = await freshStats();
    stats.setRoster(ROSTER);
    stats.setFollowerTransport(() => {});

    stats.addEvent(rush('e1', 7));

    expect(get(stats).playerStats.p1.rushing.yards).toBe(7);
  });

  it('restores a game in progress, re-deriving as it goes', async () => {
    const first = await freshStats();
    first.stats.becomeController();
    first.stats.setRoster(ROSTER);
    first.stats.addEvent(rush('e1', 21));

    const second = await freshStats();
    second.stats.becomeController();
    expect(second.stats.restorePersisted()).toBe(true);
    expect(get(second.stats).playerStats.p1.rushing.yards).toBe(21);
  });

  it('does not restore a stale game', async () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      savedAt: Date.now() - 7 * 60 * 60 * 1000,
      stats: { events: [rush('e1', 7)], roster: ROSTER },
    }));
    const { stats } = await freshStats();
    stats.becomeController();
    expect(stats.restorePersisted()).toBe(false);
  });

  it('does not restore an empty log', async () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      savedAt: Date.now(), stats: { events: [], roster: [] },
    }));
    const { stats } = await freshStats();
    stats.becomeController();
    expect(stats.restorePersisted()).toBe(false);
  });

  it('survives corrupt storage', async () => {
    localStorage.setItem(PERSIST_KEY, 'not json');
    const { stats } = await freshStats();
    stats.becomeController();
    expect(stats.restorePersisted()).toBe(false);
  });

  it('keeps roster and branding when the game is reset', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.setTeam({ name: 'Leeds Rams' });
    stats.addEvent(rush('e1', 7));

    stats.resetGame();

    const s = get(stats);
    expect(s.events).toHaveLength(0);
    expect(s.roster).toHaveLength(1);
    expect(s.team.name).toBe('Leeds Rams');
  });
});

describe('restoring a deleted entry', () => {
  it('puts it back where it was, not at the end', async () => {
    // The log is read in order, so an entry reinstated at the end would appear
    // to have happened after plays that actually followed it.
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));
    stats.addEvent(rush('e2', 3));
    stats.addEvent(rush('e3', 5));

    const removed = get(stats).events[1];
    stats.removeEvent('e2');
    stats.restoreEvent(removed, 1);

    expect(get(stats).events.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('clamps an out-of-range index rather than losing the entry', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));

    stats.restoreEvent(rush('e9', 1), 99);

    expect(get(stats).events.map((e) => e.id)).toEqual(['e1', 'e9']);
  });

  it('re-derives the totals after restoring', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 7));
    const removed = get(stats).events[0];
    stats.removeEvent('e1');
    expect(get(stats).playerStats.p1?.rushing.yards ?? 0).toBe(0);

    stats.restoreEvent(removed, 0);
    expect(get(stats).playerStats.p1.rushing.yards).toBe(7);
  });
});

describe('alerts', () => {
  it('raises a big-play alert on a long run and carries it on the wire', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 42));

    const state = get(stats);
    expect(state.alertQueue).toHaveLength(1);
    expect(state.alertQueue[0].type).toBe('big_play');
    expect(state.alertQueue[0].sourceEventId).toBe('e1');

    // Alerts are not derived, so they must survive the trip to the overlay —
    // otherwise the card fires on the controller and never goes on air.
    expect(stats.wire().alertQueue).toHaveLength(1);
  });

  it('leaves an ordinary play alone', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 3));

    expect(get(stats).alertQueue).toHaveLength(0);
  });

  it('queues a second big play behind the first rather than replacing it', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 42));
    const first = get(stats).alertQueue[0];

    stats.addEvent(rush('e2', 38));
    const queue = get(stats).alertQueue;

    expect(queue).toHaveLength(2);
    expect(queue[1].expiresAt).toBeGreaterThan(first.expiresAt);
  });

  it('retracts the alert when its event is deleted', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 42));
    stats.addEvent(rush('e2', 55));
    stats.removeEvent('e1');

    const ids = get(stats).alertQueue.map((a) => a.sourceEventId);
    expect(ids).toEqual(['e2']);
  });

  it('retracts the alert when the entry is undone', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 42));
    stats.undoLastEvent();

    expect(get(stats).alertQueue).toHaveLength(0);
    expect(get(stats).events).toHaveLength(0);
  });

  it('clears what is on air without touching the log', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);

    stats.addEvent(rush('e1', 42));
    stats.clearActiveAlert();

    expect(get(stats).alertQueue).toHaveLength(0);
    expect(get(stats).events).toHaveLength(1);
    // The play still counts — only the celebration was pulled.
    expect(get(stats).playerStats.p1.rushing.yards).toBe(42);
  });

  it('does not re-raise old alerts when the log is replayed', async () => {
    const { stats } = await freshStats();
    stats.becomeController();
    stats.setRoster(ROSTER);
    stats.addEvent(rush('e1', 42));
    stats.clearActiveAlert();

    // Any change re-derives the whole log. If alerts were derived rather than
    // detected at entry, this would put an hour-old touchdown back on air.
    stats.addEvent(rush('e2', 2));

    expect(get(stats).alertQueue).toHaveLength(0);
  });
});

describe('overlay mode', () => {
  it('travels on the wire so the overlay knows what to show', async () => {
    const { stats } = await freshStats();
    stats.becomeController();

    stats.setOverlayMode('leaderboard');

    expect(get(stats).overlayMode).toBe('leaderboard');
    expect(stats.wire().overlayMode).toBe('leaderboard');
  });
});

describe('ownership', () => {
  it('reports the owner, so echoed copies can be refused', async () => {
    const { stats } = await freshStats();
    expect(stats.isOwner()).toBe(false);

    stats.becomeController();

    // The local relay replays the last stats it saw to whoever connects next.
    // Without this flag the host would adopt its own game back from a client
    // repeating an old copy, undoing entries made since.
    expect(stats.isOwner()).toBe(true);
  });
});
