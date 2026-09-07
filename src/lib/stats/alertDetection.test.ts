import { describe, it, expect } from 'vitest';
import { detectAlerts, reconcileMilestones, milestoneKey } from './alertDetection';
import { calculateStats } from './calculateStats';
import type { Player, StatEvent } from './types';

const RB: Player = { id: 'rb', playerName: 'Marcus Brown', number: '24', position: 'RB' };
const QB: Player = { id: 'qb', playerName: 'Jack Smith', number: '12', position: 'QB' };
const WR: Player = { id: 'wr', playerName: 'Tom Jones', number: '88', position: 'WR' };
const ROSTER = [RB, QB, WR];

let n = 0;
function rush(yards: number): StatEvent {
	return { id: `r${n++}`, timestamp: 1, category: 'rushing', action: 'rush_attempt', primaryPlayerId: 'rb', yards };
}

/** Replay a list of rushes and detect alerts for the final one. */
function detectAfter(previous: number[], final: number, fired: string[] = []) {
	const before = previous.map(rush);
	const finalEvent = rush(final);
	const oldStats = calculateStats(ROSTER, before).playerStats;
	const newStats = calculateStats(ROSTER, [...before, finalEvent]).playerStats;
	return detectAlerts(finalEvent, newStats, oldStats, fired, ROSTER);
}

describe('big play detection', () => {
	it('fires on a 20+ yard run but not a 19-yard one', () => {
		expect(detectAfter([], 20).alerts[0]?.title).toBe('BIG RUN!');
		expect(detectAfter([], 19).alerts).toHaveLength(0);
	});

	it('always fires for a touchdown regardless of yardage', () => {
		const td: StatEvent = { id: 'td', timestamp: 1, category: 'rushing', action: 'rush_td', primaryPlayerId: 'rb', yards: 1 };
		const { alerts } = detectAlerts(td, {}, {}, [], ROSTER);
		expect(alerts[0]?.title).toBe('TOUCHDOWN!');
	});

	it('names both players on a passing touchdown', () => {
		const td: StatEvent = { id: 'td2', timestamp: 1, category: 'passing', action: 'passing_td', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 31 };
		const { alerts } = detectAlerts(td, {}, {}, [], ROSTER);
		expect(alerts[0].subtitle).toContain('Jack Smith');
		expect(alerts[0].subtitle).toContain('Tom Jones');
	});
});

describe('milestone detection', () => {
	it('fires when a player crosses 100 rushing yards', () => {
		const { alerts, newMilestoneKeys } = detectAfter([50, 45], 10);
		expect(alerts.some((a) => a.type === 'milestone')).toBe(true);
		expect(newMilestoneKeys).toContain(milestoneKey('rb', 'rushing.yards', 100));
	});

	it('does not re-fire a milestone that has already been recorded', () => {
		const fired = [milestoneKey('rb', 'rushing.yards', 100)];
		const { alerts } = detectAfter([50, 45], 10, fired);
		expect(alerts.some((a) => a.type === 'milestone')).toBe(false);
	});

	/**
	 * The regression that mattered: the long run that puts a back over 100 is
	 * exactly the play that used to suppress the milestone AND fail to record its
	 * key, so it could never fire again for the rest of the game.
	 */
	it('still fires the milestone when the same play is also a big run', () => {
		const { alerts, newMilestoneKeys } = detectAfter([65], 50);
		expect(alerts.map((a) => a.type)).toEqual(['big_play', 'milestone']);
		expect(newMilestoneKeys).toContain(milestoneKey('rb', 'rushing.yards', 100));
	});

	it('queues the milestone after the big play rather than overlapping it', () => {
		const { alerts } = detectAfter([65], 50);
		expect(alerts[1].expiresAt).toBeGreaterThan(alerts[0].expiresAt);
	});

	it('announces the highest threshold crossed, not the lowest', () => {
		const { alerts } = detectAfter([95], 120); // 95 -> 215 crosses 100/150/200
		const milestone = alerts.find((a) => a.type === 'milestone');
		expect(milestone?.subtitle).toContain('200+');
	});

	it('records milestones for the passer and the receiver when one play crosses both', () => {
		const before: StatEvent[] = [
			{ id: 'c1', timestamp: 1, category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 90 }
		];
		const final: StatEvent = { id: 'c2', timestamp: 2, category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 15 };
		const oldStats = calculateStats(ROSTER, before).playerStats;
		const newStats = calculateStats(ROSTER, [...before, final]).playerStats;
		const { alerts, newMilestoneKeys } = detectAlerts(final, newStats, oldStats, [], ROSTER);

		// Neither may be dropped: milestone detection is edge-triggered, so a
		// crossing that is not recorded here can never fire again.
		expect(newMilestoneKeys).toContain(milestoneKey('qb', 'passing.yards', 100));
		expect(newMilestoneKeys).toContain(milestoneKey('wr', 'receiving.yards', 100));
		expect(alerts.filter((a) => a.type === 'milestone')).toHaveLength(2);
	});

	it('queues simultaneous milestones back to back so neither is hidden', () => {
		const before: StatEvent[] = [
			{ id: 'd1', timestamp: 1, category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 90 }
		];
		const final: StatEvent = { id: 'd2', timestamp: 2, category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 15 };
		const oldStats = calculateStats(ROSTER, before).playerStats;
		const newStats = calculateStats(ROSTER, [...before, final]).playerStats;
		const { alerts } = detectAlerts(final, newStats, oldStats, [], ROSTER);
		for (let i = 1; i < alerts.length; i++) {
			expect(alerts[i].expiresAt).toBeGreaterThan(alerts[i - 1].expiresAt);
		}
	});
});

describe('reconcileMilestones', () => {
	it('keeps a milestone the stats still support', () => {
		const stats = calculateStats(ROSTER, [rush(60), rush(60)]).playerStats;
		const fired = [milestoneKey('rb', 'rushing.yards', 100)];
		expect(reconcileMilestones(fired, stats)).toEqual(fired);
	});

	it('drops a milestone once the play that caused it is undone', () => {
		const stats = calculateStats(ROSTER, [rush(60)]).playerStats;
		const fired = [milestoneKey('rb', 'rushing.yards', 100)];
		expect(reconcileMilestones(fired, stats)).toEqual([]);
	});

	it('lets a milestone fire again after being undone and re-crossed', () => {
		const afterUndo = reconcileMilestones(
			[milestoneKey('rb', 'rushing.yards', 100)],
			calculateStats(ROSTER, [rush(60)]).playerStats
		);
		const { newMilestoneKeys } = detectAfter([60], 50, afterUndo);
		expect(newMilestoneKeys).toContain(milestoneKey('rb', 'rushing.yards', 100));
	});

	it('discards keys in an unrecognised legacy format', () => {
		const stats = calculateStats(ROSTER, [rush(200)]).playerStats;
		expect(reconcileMilestones(['rb-rushing.yards-100'], stats)).toEqual([]);
	});

	it('parses keys correctly even though player ids contain dashes', () => {
		const uuid = '4f1a2b3c-1111-2222-3333-444455556666';
		const player: Player = { id: uuid, playerName: 'X', number: '1', position: 'RB' };
		const stats = calculateStats(
			[player],
			[{ id: 'x', timestamp: 1, category: 'rushing', action: 'rush_attempt', primaryPlayerId: uuid, yards: 150 }]
		).playerStats;
		const key = milestoneKey(uuid, 'rushing.yards', 100);
		expect(reconcileMilestones([key], stats)).toEqual([key]);
	});
});
