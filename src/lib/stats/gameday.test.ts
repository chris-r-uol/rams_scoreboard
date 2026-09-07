/**
 * The gameday stats: returns, turnovers, coverage, and the situational numbers
 * derived from down and distance.
 *
 * The derived ones are the interesting cases. Nobody records a first down —
 * it falls out of what the scoreboard already said at the snap — so these tests
 * are mostly about the boundaries where "moved the chains" is and is not true.
 */
import { describe, it, expect } from 'vitest';
import { calculateStats } from './calculateStats';
import { possessionMs, formatPossession } from './drives';
import type { Drive, Player, StatEvent } from './types';

const QB: Player = { id: 'q1', playerName: 'Michael Rojas', number: '16', position: 'QB' };
const RB: Player = { id: 'r1', playerName: 'Elliot Jackson', number: '12', position: 'RB' };
const WR: Player = { id: 'w1', playerName: 'Iby Sardar', number: '0', position: 'WR' };
const DB: Player = { id: 'd1', playerName: 'Chris Rushton', number: '29', position: 'DB' };
const ROSTER = [QB, RB, WR, DB];

let n = 0;
function ev(action: string, primaryPlayerId: string, extra: Partial<StatEvent> = {}): StatEvent {
	return { id: `e${n++}`, timestamp: Date.now(), category: 'rushing', action, primaryPlayerId, ...extra } as StatEvent;
}
const run = (events: StatEvent[]) => calculateStats(ROSTER, events);

describe('return yardage', () => {
	it('totals returns, yards and the longest', () => {
		const { playerStats } = run([
			ev('kick_return', 'w1', { yards: 22 }),
			ev('kick_return', 'w1', { yards: 41 }),
			ev('punt_return', 'w1', { yards: 8 }),
		]);
		const st = playerStats.w1.specialTeams;
		expect(st.kickReturns).toBe(2);
		expect(st.kickReturnYards).toBe(63);
		expect(st.longestKickReturn).toBe(41);
		expect(st.puntReturns).toBe(1);
		expect(st.longestPuntReturn).toBe(8);
	});

	it('counts a return touchdown as a return as well', () => {
		// It was still a return; leaving it out would make the average wrong in
		// the direction that flatters nobody.
		const { playerStats } = run([ev('punt_return_td', 'w1', { yards: 60 })]);
		expect(playerStats.w1.specialTeams.puntReturns).toBe(1);
		expect(playerStats.w1.specialTeams.puntReturnYards).toBe(60);
		expect(playerStats.w1.specialTeams.touchdowns).toBe(1);
	});

	it('does not treat a blocked kick as a return', () => {
		// Nobody fielded it, so it belongs in no returner's average.
		const { playerStats } = run([ev('blocked_kick_td', 'd1', { yards: 8 })]);
		expect(playerStats.d1.specialTeams.touchdowns).toBe(1);
		expect(playerStats.d1.specialTeams.kickReturns).toBe(0);
		expect(playerStats.d1.specialTeams.puntReturns).toBe(0);
	});

	it('records interception and fumble return yards', () => {
		const { playerStats } = run([
			ev('interception', 'd1', { yards: 18 }),
			ev('interception_td', 'd1', { yards: 42 }),
			ev('fumble_recovery', 'd1', { yards: 6 }),
		]);
		expect(playerStats.d1.defence.interceptions).toBe(2);
		expect(playerStats.d1.defence.interceptionYards).toBe(60);
		expect(playerStats.d1.defence.fumbleReturnYards).toBe(6);
	});

	it('keeps return yardage out of the offensive totals', () => {
		const { teamStats } = run([ev('kick_return', 'w1', { yards: 95 })]);
		expect(teamStats.totalOffensiveYards).toBe(0);
	});
});

describe('turnovers', () => {
	it('separates a fumble kept from a fumble lost', () => {
		const { teamStats, playerStats } = run([ev('fumble', 'r1'), ev('fumble_lost', 'r1')]);
		// Both are fumbles; only one changed hands.
		expect(playerStats.r1.turnovers.fumbles).toBe(2);
		expect(playerStats.r1.turnovers.fumblesLost).toBe(1);
		expect(teamStats.giveaways).toBe(1);
	});

	it('counts takeaways from interceptions and recoveries', () => {
		const { teamStats } = run([
			ev('interception', 'd1', { yards: 0 }),
			ev('fumble_recovery', 'd1', { yards: 0 }),
		]);
		expect(teamStats.takeaways).toBe(2);
	});

	it('counts a thrown interception as a giveaway', () => {
		const { teamStats } = run([ev('interception_thrown', 'q1', { category: 'passing' })]);
		expect(teamStats.giveaways).toBe(1);
		expect(teamStats.takeaways).toBe(0);
	});
});

describe('coverage and tackles', () => {
	it('splits solo from assisted while keeping a combined total', () => {
		const { playerStats } = run([
			ev('tackle', 'd1', { category: 'defence' }),
			ev('tackle', 'd1', { category: 'defence' }),
			ev('tackle_assist', 'd1', { category: 'defence' }),
		]);
		const d = playerStats.d1.defence;
		expect(d.soloTackles).toBe(2);
		expect(d.assistedTackles).toBe(1);
		// The combined number is what a stat sheet leads with, so it must still
		// be the one everything else already reads.
		expect(d.tackles).toBe(3);
	});

	it('records a pass breakup without inventing a tackle', () => {
		const { playerStats } = run([ev('pass_defended', 'd1', { category: 'defence' })]);
		expect(playerStats.d1.defence.passesDefended).toBe(1);
		expect(playerStats.d1.defence.tackles).toBe(0);
	});
});

describe('targets', () => {
	function pass(action: string, receiver?: string, yards = 0): StatEvent {
		return ev(action, 'q1', { category: 'passing', secondaryPlayerId: receiver, yards });
	}

	it('counts a completion and an incomplete pass alike', () => {
		const { playerStats } = run([
			pass('pass_completion', 'w1', 12),
			pass('pass_attempt_incomplete', 'w1'),
			pass('passing_td', 'w1', 20),
		]);
		expect(playerStats.w1.receiving.targets).toBe(3);
		expect(playerStats.w1.receiving.receptions).toBe(2);
	});

	it('leaves targets alone when the incompletion names nobody', () => {
		// A throwaway has no intended receiver, and guessing one would put a
		// catch rate on a player who was never involved.
		const { teamStats } = run([pass('pass_attempt_incomplete')]);
		expect(teamStats.passing.attempts).toBe(1);
		expect(teamStats.receiving.targets).toBe(0);
	});
});

describe('first downs and conversions', () => {
	function snap(action: string, down: number, distance: number, yards: number): StatEvent {
		return ev(action, action.startsWith('rush') ? 'r1' : 'q1', {
			category: action.startsWith('rush') ? 'rushing' : 'passing',
			down,
			distance,
			yards,
			...(action.startsWith('pass') ? { secondaryPlayerId: 'w1' } : {}),
		});
	}

	it('moves the chains on exactly enough', () => {
		// The boundary is the whole rule: 10 on 1st & 10 is a first down, 9 is not.
		expect(run([snap('rush_attempt', 1, 10, 10)]).teamStats.firstDowns.total).toBe(1);
		expect(run([snap('rush_attempt', 1, 10, 9)]).teamStats.firstDowns.total).toBe(0);
	});

	it('splits first downs by how they were gained', () => {
		const { teamStats } = run([
			snap('rush_attempt', 1, 10, 12),
			snap('pass_completion', 2, 8, 15),
		]);
		expect(teamStats.firstDowns.rushing).toBe(1);
		expect(teamStats.firstDowns.passing).toBe(1);
		expect(teamStats.firstDowns.total).toBe(2);
	});

	it('treats a touchdown as moving the chains however short', () => {
		expect(run([snap('rush_td', 3, 8, 1)]).teamStats.firstDowns.total).toBe(1);
	});

	it('gives nothing for an interception, however far it travelled', () => {
		// The pass may have been caught 30 yards downfield by the wrong team.
		const { teamStats } = run([snap('interception_thrown', 3, 5, 30)]);
		expect(teamStats.firstDowns.total).toBe(0);
		expect(teamStats.thirdDowns.conversions).toBe(0);
		expect(teamStats.thirdDowns.attempts).toBe(1);
	});

	it('counts third and fourth down attempts separately', () => {
		const { teamStats } = run([
			snap('rush_attempt', 3, 2, 5),
			snap('pass_completion', 3, 12, 4),
			snap('rush_attempt', 4, 1, 2),
			snap('rush_attempt', 4, 6, 1),
		]);
		expect(teamStats.thirdDowns).toEqual({ attempts: 2, conversions: 1 });
		expect(teamStats.fourthDowns).toEqual({ attempts: 2, conversions: 1 });
	});

	it('ignores plays with no down stamped on them', () => {
		// Events entered before down and distance were carried, or on a sport
		// that has no downs at all, must not be counted as failed conversions.
		const { teamStats } = run([ev('rush_attempt', 'r1', { yards: 40 })]);
		expect(teamStats.firstDowns.total).toBe(0);
		expect(teamStats.thirdDowns.attempts).toBe(0);
	});

	it('ignores anything that is not a snap by this offence', () => {
		const { teamStats } = run([
			ev('tackle', 'd1', { category: 'defence', down: 3, distance: 5 }),
			ev('kick_return', 'w1', { category: 'special_teams', down: 3, distance: 5, yards: 40 }),
		]);
		expect(teamStats.thirdDowns.attempts).toBe(0);
		expect(teamStats.firstDowns.total).toBe(0);
	});
});

describe('time of possession', () => {
	const drive = (startTime: number, endTime?: number): Drive => ({
		id: `d${startTime}`, startTime, endTime, eventIds: [], yardsGained: 0, plays: 0, result: 'punt',
	});

	it('adds up completed drives', () => {
		expect(possessionMs(null, [drive(0, 90_000), drive(200_000, 245_000)])).toBe(135_000);
	});

	it('counts a drive still running, up to now', () => {
		expect(possessionMs(drive(1_000), [], 61_000)).toBe(60_000);
	});

	it('gives nothing for a drive that was never closed', () => {
		// A cancelled drive has no end time. Counting it to now would grow the
		// possession total forever after the game finished.
		expect(possessionMs(null, [drive(0)])).toBe(0);
	});

	it('formats as minutes and seconds', () => {
		expect(formatPossession(135_000)).toBe('2:15');
		expect(formatPossession(605_000)).toBe('10:05');
		expect(formatPossession(0)).toBe('0:00');
	});
});
