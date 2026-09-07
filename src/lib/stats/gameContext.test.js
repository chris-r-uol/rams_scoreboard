/**
 * The scoreboard/stats seam.
 *
 * These pin down the thing that makes the merge worth doing: a stat event
 * knowing the real game situation without anyone typing it. They also pin down
 * what it must *not* do — invent a period for a sport that has none, or relabel
 * a correction with the clock as it reads now.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../realtime.js', () => ({
  joinRoom: vi.fn(), sendState: vi.fn(), sendStateNow: vi.fn(),
}));

const { gameContextFrom, withGameContext } = await import('./gameContext.js');

describe('gameContextFrom', () => {
  it('stamps quarter and clock for football', () => {
    expect(gameContextFrom({ sport: 'american-football', quarter: 2, gameClockSeconds: 754 }))
      .toEqual({ quarter: 'Q2', gameClock: '12:34' });
  });

  it('uses each sport\'s own name for the period', () => {
    expect(gameContextFrom({ sport: 'ice-hockey', period: 3, gameClockSeconds: 60 }).quarter).toBe('3rd');
    expect(gameContextFrom({ sport: 'soccer', half: 2, gameClockSeconds: 60 }).quarter).toBe('2nd Half');
    expect(gameContextFrom({ sport: 'basketball', quarter: 4, gameClockSeconds: 60 }).quarter).toBe('Q4');
  });

  it('omits the period for a sport that has none rather than inventing one', () => {
    const context = gameContextFrom({ sport: 'mtg', gameClockSeconds: 0 });
    expect(context.quarter).toBeUndefined();
  });

  it('returns nothing at all before a sport is chosen', () => {
    expect(gameContextFrom({ sport: null })).toEqual({});
    expect(gameContextFrom(undefined)).toEqual({});
  });

  it('formats the clock the way the scorebug does, so they never disagree', () => {
    expect(gameContextFrom({ sport: 'american-football', quarter: 1, gameClockSeconds: 5 }).gameClock)
      .toBe('00:05');
  });

  it('omits the clock when there is no numeric value to format', () => {
    expect(gameContextFrom({ sport: 'american-football', quarter: 1 }).gameClock).toBeUndefined();
  });
});

describe('withGameContext', () => {
  it('stamps an event with the current situation', () => {
    const event = withGameContext(
      { action: 'rush', yards: 7 },
      { sport: 'american-football', quarter: 3, gameClockSeconds: 125 },
    );
    expect(event).toMatchObject({ action: 'rush', yards: 7, quarter: 'Q3', gameClock: '02:05' });
  });

  it('never overwrites context already on the event', () => {
    // A correction entered later belongs to when it happened, not to now.
    const event = withGameContext(
      { action: 'rush', quarter: 'Q1', gameClock: '15:00' },
      { sport: 'american-football', quarter: 4, gameClockSeconds: 10 },
    );
    expect(event.quarter).toBe('Q1');
    expect(event.gameClock).toBe('15:00');
  });
});
