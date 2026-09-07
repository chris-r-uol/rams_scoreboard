/**
 * The kicking game.
 *
 * The point of recording it is that a box score should add up to the
 * scoreboard, so most of what matters here is that attempts are counted
 * alongside makes and that distances never leak into offensive yardage.
 */
import { describe, it, expect } from 'vitest';
import { calculateStats } from './calculateStats';
import { detectAlerts } from './alertDetection';
import type { Player, StatEvent } from './types';

const KICKER: Player = { id: 'k1', playerName: 'Alex Kerr', number: '5', position: 'K' };
const BACK: Player = { id: 'r1', playerName: 'Elliot Jackson', number: '12', position: 'RB' };
const ROSTER = [KICKER, BACK];

let n = 0;
function ev(action: string, playerId: string, yards?: number): StatEvent {
	return {
		id: `e${n++}`,
		timestamp: Date.now(),
		category: action.startsWith('two_point') ? 'kicking' : 'kicking',
		action,
		primaryPlayerId: playerId,
		...(yards === undefined ? {} : { yards }),
	} as StatEvent;
}

const run = (events: StatEvent[]) => calculateStats(ROSTER, events);

describe('field goals', () => {
	it('counts a miss as an attempt', () => {
		const { playerStats } = run([
			ev('field_goal_made', 'k1', 38),
			ev('field_goal_missed', 'k1', 47),
		]);
		const k = playerStats.k1.kicking;
		// A kicker's line is meaningless without the attempts — 1/2 is the story,
		// not "1 field goal".
		expect(k.fieldGoalsMade).toBe(1);
		expect(k.fieldGoalsAttempted).toBe(2);
	});

	it('tracks the longest made kick, not the longest attempted', () => {
		const { playerStats } = run([
			ev('field_goal_made', 'k1', 38),
			ev('field_goal_missed', 'k1', 52),
			ev('field_goal_made', 'k1', 44),
		]);
		expect(playerStats.k1.kicking.longestFieldGoal).toBe(44);
	});

	it('leaves the longest at zero when nothing has been made', () => {
		const { playerStats } = run([ev('field_goal_missed', 'k1', 52)]);
		expect(playerStats.k1.kicking.longestFieldGoal).toBe(0);
	});

	it('keeps the attempt distance out of offensive yardage', () => {
		// `yards` on a kick is how far it was, not ground gained. Feeding it into
		// the offence would credit a 45-yard field goal as 45 yards of offence.
		const { teamStats } = run([ev('field_goal_made', 'k1', 45), ev('punt', 'k1', 52)]);
		expect(teamStats.totalOffensiveYards).toBe(0);
		expect(teamStats.totalOffensivePlays).toBe(0);
	});
});

describe('extra points and conversions', () => {
	it('counts extra point attempts and makes', () => {
		const { playerStats } = run([
			ev('extra_point_made', 'k1'),
			ev('extra_point_made', 'k1'),
			ev('extra_point_missed', 'k1'),
		]);
		expect(playerStats.k1.kicking.extraPointsMade).toBe(2);
		expect(playerStats.k1.kicking.extraPointsAttempted).toBe(3);
	});

	it('credits a two-point conversion to the player, not a kicker', () => {
		const { playerStats } = run([ev('two_point_made', 'r1'), ev('two_point_failed', 'r1')]);
		// It is a run or a pass, so it belongs to whoever took it in.
		expect(playerStats.r1.conversions.twoPointMade).toBe(1);
		expect(playerStats.r1.conversions.twoPointAttempted).toBe(2);
		expect(playerStats.k1.conversions.twoPointAttempted).toBe(0);
	});
});

describe('punting', () => {
	it('totals punts and yards', () => {
		const { teamStats } = run([ev('punt', 'k1', 41), ev('punt', 'k1', 35)]);
		expect(teamStats.kicking.punts).toBe(2);
		expect(teamStats.kicking.puntYards).toBe(76);
	});
});

describe('points', () => {
	it('adds up everything that scores', () => {
		const events: StatEvent[] = [
			{ id: 'td1', timestamp: 1, category: 'rushing', action: 'rush_td', primaryPlayerId: 'r1', yards: 4 } as StatEvent,
			{ id: 'td2', timestamp: 2, category: 'rushing', action: 'rush_td', primaryPlayerId: 'r1', yards: 9 } as StatEvent,
			ev('extra_point_made', 'k1'),
			ev('two_point_made', 'r1'),
			ev('field_goal_made', 'k1', 33),
		];
		// 12 from two touchdowns, 1 extra point, 2 for the conversion, 3 for the
		// field goal. This is the number that has to reconcile to the scoreboard.
		expect(run(events).teamStats.totalPoints).toBe(18);
	});

	it('does not count what was missed', () => {
		const { teamStats } = run([
			ev('field_goal_missed', 'k1', 40),
			ev('extra_point_missed', 'k1'),
			ev('two_point_failed', 'r1'),
		]);
		expect(teamStats.totalPoints).toBe(0);
	});

	it('is zero for a game with nothing recorded', () => {
		expect(run([]).teamStats.totalPoints).toBe(0);
	});
});

describe('team aggregation', () => {
	it('takes the longest kick across the whole squad', () => {
		const second: Player = { id: 'k2', playerName: 'Sam Boot', number: '6', position: 'K' };
		const { teamStats } = calculateStats([KICKER, second], [
			ev('field_goal_made', 'k1', 31),
			ev('field_goal_made', 'k2', 49),
		]);
		// A max, not a sum — the obvious way to get this wrong.
		expect(teamStats.kicking.longestFieldGoal).toBe(49);
		expect(teamStats.kicking.fieldGoalsMade).toBe(2);
	});
});

describe('alerts', () => {
	const fire = (event: StatEvent) => detectAlerts(event, {}, {}, [], ROSTER, 0).alerts;

	it('celebrates a made field goal and names the distance', () => {
		const [alert] = fire(ev('field_goal_made', 'k1', 38));
		expect(alert.title).toBe('FIELD GOAL!');
		expect(alert.subtitle).toContain('38 YARDS');
	});

	it('makes more of a long one', () => {
		expect(fire(ev('field_goal_made', 'k1', 47))[0].title).toBe('BIG FIELD GOAL!');
	});

	it('says nothing about a miss or a routine extra point', () => {
		// The overlay is on air. A card for every point-after would be noise, and
		// a card for a miss would be cruel.
		expect(fire(ev('field_goal_missed', 'k1', 40))).toHaveLength(0);
		expect(fire(ev('extra_point_made', 'k1'))).toHaveLength(0);
	});

	it('celebrates a two-point conversion', () => {
		expect(fire(ev('two_point_made', 'r1'))[0].title).toBe('TWO-POINT CONVERSION!');
	});
});
