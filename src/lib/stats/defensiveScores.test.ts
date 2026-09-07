/**
 * Scores the offence had nothing to do with.
 *
 * These are the plays that used to break reconciliation: a pick-six put six
 * points on the scoreboard and nothing in the box score. What matters here is
 * that they count as touchdowns, that they contribute points, and that they
 * never leak into the offensive totals — the offence was not on the field.
 */
import { describe, it, expect } from 'vitest';
import { calculateStats } from './calculateStats';
import { detectAlerts } from './alertDetection';
import { isOffensiveAction } from './drives';
import type { Player, StatEvent } from './types';

const CORNER: Player = { id: 'd1', playerName: 'Chris Rushton', number: '29', position: 'DB' };
const RETURNER: Player = { id: 's1', playerName: 'Iby Sardar', number: '0', position: 'WR' };
const ROSTER = [CORNER, RETURNER];

let n = 0;
function ev(action: string, playerId: string, yards?: number): StatEvent {
	return {
		id: `e${n++}`,
		timestamp: Date.now(),
		category: action.endsWith('return_td') || action === 'blocked_kick_td' ? 'special_teams' : 'defence',
		action,
		primaryPlayerId: playerId,
		...(yards === undefined ? {} : { yards }),
	} as StatEvent;
}

const run = (events: StatEvent[]) => calculateStats(ROSTER, events);

describe('pick six', () => {
	it('counts as an interception and a touchdown from one entry', () => {
		const { playerStats } = run([ev('interception_td', 'd1', 42)]);
		// Making the operator enter the interception separately is how one of the
		// two ends up missing on a play nobody has time to think about.
		expect(playerStats.d1.defence.interceptions).toBe(1);
		expect(playerStats.d1.defence.touchdowns).toBe(1);
	});

	it('adds six points', () => {
		expect(run([ev('interception_td', 'd1', 42)]).teamStats.totalPoints).toBe(6);
	});
});

describe('other non-offensive scores', () => {
	it('credits a fumble return without claiming a forced fumble', () => {
		// Whoever picked it up is rarely whoever knocked it out.
		const { playerStats } = run([ev('fumble_return_td', 'd1', 15)]);
		expect(playerStats.d1.defence.touchdowns).toBe(1);
		expect(playerStats.d1.defence.forcedFumbles).toBe(0);
	});

	it('counts kick, punt and blocked-kick returns as special teams', () => {
		const { teamStats, playerStats } = run([
			ev('kick_return_td', 's1', 95),
			ev('punt_return_td', 's1', 60),
			ev('blocked_kick_td', 'd1', 8),
		]);
		expect(playerStats.s1.specialTeams.touchdowns).toBe(2);
		expect(playerStats.d1.specialTeams.touchdowns).toBe(1);
		expect(teamStats.specialTeams.touchdowns).toBe(3);
		// None of them belong to the defence's own tally.
		expect(teamStats.defence.touchdowns).toBe(0);
	});

	it('scores a safety at two points', () => {
		const { teamStats } = run([ev('safety', 'd1')]);
		expect(teamStats.defence.safeties).toBe(1);
		expect(teamStats.totalPoints).toBe(2);
	});
});

describe('what they must not touch', () => {
	it('keeps return yardage out of the offensive totals', () => {
		// A 95-yard kick return is 95 yards the offence did not gain, on a play
		// it did not run.
		const { teamStats } = run([
			ev('kick_return_td', 's1', 95),
			ev('interception_td', 'd1', 42),
		]);
		expect(teamStats.totalOffensiveYards).toBe(0);
		expect(teamStats.totalOffensivePlays).toBe(0);
	});

	it('is not an offensive play for drive purposes', () => {
		// A drive is the offence's snap count. A defensive score happens while
		// the offence is on the sideline.
		for (const action of ['interception_td', 'fumble_return_td', 'safety', 'kick_return_td', 'punt_return_td', 'blocked_kick_td']) {
			expect(isOffensiveAction(action)).toBe(false);
		}
	});
});

describe('totals', () => {
	it('counts every phase as a touchdown', () => {
		const events: StatEvent[] = [
			{ id: 'o1', timestamp: 1, category: 'rushing', action: 'rush_td', primaryPlayerId: 's1', yards: 3 } as StatEvent,
			ev('interception_td', 'd1', 42),
			ev('kick_return_td', 's1', 95),
		];
		const { teamStats } = run(events);
		// A panel reading "Total TDs" that omitted the pick-six would be wrong in
		// the way nobody checks.
		expect(teamStats.totalTouchdowns).toBe(3);
		expect(teamStats.totalPoints).toBe(18);
		// Offensive yards and plays stay strictly offensive alongside it.
		expect(teamStats.totalOffensivePlays).toBe(1);
	});

	it('reconciles a scoreboard that only these plays can explain', () => {
		// 6 (pick six) + 1 (XP) + 2 (safety) = 9, a scoreline the offence never
		// touched, and the exact case that used to be unrepresentable.
		const { teamStats } = run([
			ev('interception_td', 'd1', 30),
			{ id: 'xp', timestamp: 2, category: 'kicking', action: 'extra_point_made', primaryPlayerId: 's1' } as StatEvent,
			ev('safety', 'd1'),
		]);
		expect(teamStats.totalPoints).toBe(9);
	});
});

describe('alerts', () => {
	const fire = (event: StatEvent) => detectAlerts(event, {}, {}, [], ROSTER, 0).alerts;

	it('calls a pick six by its name', () => {
		expect(fire(ev('interception_td', 'd1', 42))[0].title).toBe('PICK SIX!');
	});

	it('celebrates a scoop and score, a return and a safety', () => {
		expect(fire(ev('fumble_return_td', 'd1', 15))[0].title).toBe('SCOOP AND SCORE!');
		expect(fire(ev('punt_return_td', 's1', 60))[0].title).toBe('RETURN TOUCHDOWN!');
		expect(fire(ev('safety', 'd1'))[0].title).toBe('SAFETY!');
	});

	it('names the return distance when there is one', () => {
		expect(fire(ev('kick_return_td', 's1', 95))[0].subtitle).toContain('95 YDS');
		// A return entered without a distance should not read "— 0 YDS".
		expect(fire(ev('kick_return_td', 's1', 0))[0].subtitle).not.toContain('YDS');
	});
});
