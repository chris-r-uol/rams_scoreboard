import { describe, it, expect } from 'vitest';
import { calculateStats } from './calculateStats';
import type { Player, StatEvent } from './types';

const QB: Player = { id: 'qb', playerName: 'Jack Smith', number: '12', position: 'QB' };
const WR: Player = { id: 'wr', playerName: 'Tom Jones', number: '88', position: 'WR' };
const RB: Player = { id: 'rb', playerName: 'Marcus Brown', number: '24', position: 'RB' };
const DE: Player = { id: 'de', playerName: 'Sam Taylor', number: '91', position: 'DE' };
const ROSTER = [QB, WR, RB, DE];

let n = 0;
function ev(partial: Partial<StatEvent> & Pick<StatEvent, 'category' | 'action' | 'primaryPlayerId'>): StatEvent {
	return { id: `e${n++}`, timestamp: 1000 + n, ...partial } as StatEvent;
}

describe('calculateStats', () => {
	it('gives every rostered player a zeroed line even with no events', () => {
		const { playerStats, teamStats } = calculateStats(ROSTER, []);
		expect(Object.keys(playerStats)).toHaveLength(4);
		expect(playerStats.qb.passing.attempts).toBe(0);
		expect(teamStats.totalOffensiveYards).toBe(0);
	});

	it('credits passer and receiver from one completion', () => {
		const { playerStats } = calculateStats(ROSTER, [
			ev({ category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 17 })
		]);
		expect(playerStats.qb.passing).toMatchObject({ attempts: 1, completions: 1, yards: 17 });
		expect(playerStats.wr.receiving).toMatchObject({ receptions: 1, yards: 17 });
	});

	it('counts a passing TD as an attempt, completion and score for both players', () => {
		const { playerStats, teamStats } = calculateStats(ROSTER, [
			ev({ category: 'passing', action: 'passing_td', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 31 })
		]);
		expect(playerStats.qb.passing).toMatchObject({ attempts: 1, completions: 1, yards: 31, touchdowns: 1 });
		expect(playerStats.wr.receiving).toMatchObject({ receptions: 1, yards: 31, touchdowns: 1 });
		expect(teamStats.totalTouchdowns).toBe(1);
	});

	it('counts an incompletion as an attempt but not a completion', () => {
		const { playerStats } = calculateStats(ROSTER, [
			ev({ category: 'passing', action: 'pass_attempt_incomplete', primaryPlayerId: 'qb' })
		]);
		expect(playerStats.qb.passing).toMatchObject({ attempts: 1, completions: 0, yards: 0 });
	});

	it('handles negative rushing yards', () => {
		const { playerStats } = calculateStats(ROSTER, [
			ev({ category: 'rushing', action: 'rush_attempt', primaryPlayerId: 'rb', yards: 8 }),
			ev({ category: 'rushing', action: 'rush_attempt', primaryPlayerId: 'rb', yards: -3 })
		]);
		expect(playerStats.rb.rushing).toMatchObject({ attempts: 2, yards: 5 });
	});

	it('records a sack as a tackle and stores sack yards as a positive magnitude', () => {
		const { playerStats } = calculateStats(ROSTER, [
			ev({ category: 'defence', action: 'sack', primaryPlayerId: 'de', yards: -8 })
		]);
		expect(playerStats.de.defence).toMatchObject({ tackles: 1, sacks: 1, sackYards: 8 });
	});

	it('counts a tackle for loss as a tackle too', () => {
		const { playerStats } = calculateStats(ROSTER, [
			ev({ category: 'defence', action: 'tackle_for_loss', primaryPlayerId: 'de', yards: -3 })
		]);
		expect(playerStats.de.defence).toMatchObject({ tackles: 1, tacklesForLoss: 1 });
	});

	it("aggregates team totals without double-counting the receiver's yards", () => {
		const { teamStats } = calculateStats(ROSTER, [
			ev({ category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 20 }),
			ev({ category: 'rushing', action: 'rush_attempt', primaryPlayerId: 'rb', yards: 10 })
		]);
		expect(teamStats.passing.yards).toBe(20);
		expect(teamStats.receiving.yards).toBe(20);
		// Total offence is pass + rush; receiving is the same yardage seen twice.
		expect(teamStats.totalOffensiveYards).toBe(30);
		expect(teamStats.totalOffensivePlays).toBe(2);
	});

	it('tracks a team penalty against the "team" sentinel without inventing a player', () => {
		const { playerStats, teamStats } = calculateStats(ROSTER, [
			ev({ category: 'penalty', action: 'penalty_offensive', primaryPlayerId: 'team', yards: 5 })
		]);
		expect(teamStats.penalties).toMatchObject({ offensiveCount: 1, offensiveYards: 5 });
		expect(ROSTER.some((p) => p.id === 'team')).toBe(false);
		expect(playerStats.team.penalties.offensiveCount).toBe(1);
	});

	it('stores penalty yardage as a magnitude regardless of the sign entered', () => {
		const { teamStats } = calculateStats(ROSTER, [
			ev({ category: 'penalty', action: 'penalty_defensive', primaryPlayerId: 'de', yards: -15 })
		]);
		expect(teamStats.penalties.defensiveYards).toBe(15);
	});

	it('applies a manual adjustment along its dotted stat path', () => {
		const { playerStats } = calculateStats(ROSTER, [
			ev({ category: 'rushing', action: 'rush_attempt', primaryPlayerId: 'rb', yards: 20 }),
			ev({ category: 'adjustment', action: 'manual_stat_adjustment', primaryPlayerId: 'rb', statKey: 'rushing.yards', yards: -5 })
		]);
		expect(playerStats.rb.rushing.yards).toBe(15);
	});

	it('ignores an adjustment with an unknown stat path instead of throwing', () => {
		expect(() =>
			calculateStats(ROSTER, [
				ev({ category: 'adjustment', action: 'manual_stat_adjustment', primaryPlayerId: 'rb', statKey: 'nope.nope', yards: 5 })
			])
		).not.toThrow();
	});

	it('still counts stats for a player who has since been removed from the roster', () => {
		const { playerStats } = calculateStats([], [
			ev({ category: 'rushing', action: 'rush_attempt', primaryPlayerId: 'ghost', yards: 4 })
		]);
		expect(playerStats.ghost.rushing.yards).toBe(4);
	});

	it('is a pure replay — recalculating from the same events gives the same answer', () => {
		const events = [
			ev({ category: 'passing', action: 'pass_completion', primaryPlayerId: 'qb', secondaryPlayerId: 'wr', yards: 12 }),
			ev({ category: 'rushing', action: 'rush_td', primaryPlayerId: 'rb', yards: 3 })
		];
		expect(calculateStats(ROSTER, events)).toEqual(calculateStats(ROSTER, events));
	});
});
