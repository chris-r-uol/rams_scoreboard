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

const { gameContextFrom, withGameContext, teamConfigFrom } = await import('./gameContext.js');

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

describe('teamConfigFrom', () => {
  it('takes the team from the scoreboard rather than a second setup screen', () => {
    // Standalone, stats had its own team name, colours and logo. Deriving them
    // removes a duplicate settings screen and removes any way for the scorebug
    // and a stats overlay to disagree about the home side.
    const team = teamConfigFrom({
      homeName: 'Leeds Rams',
      homePrimary: '#123456',
      homeSecondary: '#654321',
      homeText: '#FFFFFF',
      homeLogo: 'data:image/webp;base64,AAAA',
    });

    expect(team.name).toBe('Leeds Rams');
    expect(team.primaryColor).toBe('#123456');
    expect(team.secondaryColor).toBe('#654321');
    expect(team.logoDataUrl).toBe('data:image/webp;base64,AAAA');
  });

  it('keeps an abbreviation the scoreboard has no field for', () => {
    const team = teamConfigFrom({ homeName: 'Leeds Rams' }, { abbreviation: 'LDS' });
    expect(team.abbreviation).toBe('LDS');
    expect(team.name).toBe('Leeds Rams');
  });

  it('falls back to the name when no abbreviation has been set', () => {
    expect(teamConfigFrom({ homeName: 'RAMS' }).abbreviation).toBe('RAMS');
  });

  it('produces something usable from empty state', () => {
    const team = teamConfigFrom({});
    expect(team.name).toBe('HOME');
    expect(team.primaryColor).toBeTruthy();
  });

  it('leaves the logo undefined rather than empty, which the overlay checks', () => {
    expect(teamConfigFrom({ homeName: 'X', homeLogo: '' }).logoDataUrl).toBeUndefined();
  });
});

describe('down and distance', () => {
  it('stamps them in football, so first downs need no separate entry', () => {
    const context = gameContextFrom({ sport: 'american-football', quarter: 2, down: 3, distance: 7 });
    expect(context.down).toBe(3);
    expect(context.distance).toBe(7);
  });

  it('leaves them off every other sport', () => {
    // Downs do not exist in hockey. Stamping "3rd & 7" on a save would be
    // worse than leaving the fields blank.
    for (const sport of ['ice-hockey', 'soccer', 'basketball', 'cricket', 'mtg']) {
      const context = gameContextFrom({ sport, down: 3, distance: 7 });
      expect(context.down).toBeUndefined();
      expect(context.distance).toBeUndefined();
    }
  });

  it('omits them when the scoreboard has not set them', () => {
    const context = gameContextFrom({ sport: 'american-football', quarter: 1 });
    expect('down' in context).toBe(false);
  });

  it('still lets an existing value on the event win', () => {
    // Same rule as the clock: a correction entered after the fact must not be
    // relabelled with the situation as it reads now.
    const stamped = withGameContext(
      { id: 'e1', down: 1, distance: 10 },
      { sport: 'american-football', down: 4, distance: 2 },
    );
    expect(stamped.down).toBe(1);
    expect(stamped.distance).toBe(10);
  });
});
