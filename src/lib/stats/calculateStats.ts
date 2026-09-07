import type { Player, StatEvent, PlayerStats, TeamStats } from './types';
import { emptyPlayerStats, emptyTeamStats } from './emptyStats';

export function calculateStats(
	roster: Player[],
	events: StatEvent[]
): { playerStats: Record<string, PlayerStats>; teamStats: TeamStats } {
	// 1. Initialise stats for every rostered player
	const playerStats: Record<string, PlayerStats> = {};
	for (const player of roster) {
		playerStats[player.id] = emptyPlayerStats(player.id);
	}

	// 2. Process every event
	for (const event of events) {
		// Ensure stats objects exist for players not (yet) on the roster
		if (!playerStats[event.primaryPlayerId]) {
			playerStats[event.primaryPlayerId] = emptyPlayerStats(event.primaryPlayerId);
		}
		if (event.secondaryPlayerId && !playerStats[event.secondaryPlayerId]) {
			playerStats[event.secondaryPlayerId] = emptyPlayerStats(event.secondaryPlayerId);
		}

		const primary = playerStats[event.primaryPlayerId];
		const secondary = event.secondaryPlayerId
			? playerStats[event.secondaryPlayerId]
			: null;
		const yards = event.yards ?? 0;

		switch (event.action) {
			// ── Passing ────────────────────────────────────────────────────────
			case 'pass_attempt_incomplete':
				primary.passing.attempts += 1;
				break;

			case 'pass_completion':
				primary.passing.attempts += 1;
				primary.passing.completions += 1;
				primary.passing.yards += yards;
				if (secondary) {
					secondary.receiving.receptions += 1;
					secondary.receiving.yards += yards;
				}
				break;

			case 'passing_td':
				primary.passing.attempts += 1;
				primary.passing.completions += 1;
				primary.passing.yards += yards;
				primary.passing.touchdowns += 1;
				if (secondary) {
					secondary.receiving.receptions += 1;
					secondary.receiving.yards += yards;
					secondary.receiving.touchdowns += 1;
				}
				break;

			case 'interception_thrown':
				primary.passing.attempts += 1;
				primary.passing.interceptions += 1;
				break;

			// ── Rushing ────────────────────────────────────────────────────────
			case 'rush_attempt':
				primary.rushing.attempts += 1;
				primary.rushing.yards += yards;
				break;

			case 'rush_td':
				primary.rushing.attempts += 1;
				primary.rushing.yards += yards;
				primary.rushing.touchdowns += 1;
				break;

			// ── Defence ────────────────────────────────────────────────────────
			case 'tackle':
				primary.defence.tackles += 1;
				break;

			case 'tackle_for_loss':
				primary.defence.tackles += 1;
				primary.defence.tacklesForLoss += 1;
				break;

			case 'sack':
				primary.defence.tackles += 1;
				primary.defence.sacks += 1;
				primary.defence.sackYards += Math.abs(yards);
				break;

			case 'interception':
				primary.defence.interceptions += 1;
				break;

			case 'forced_fumble':
				primary.defence.forcedFumbles += 1;
				break;

			// ── Penalties ─────────────────────────────────────────────────────────
			case 'penalty_offensive':
				primary.penalties.offensiveCount += 1;
				primary.penalties.offensiveYards += Math.abs(yards);
				break;

			case 'penalty_defensive':
				primary.penalties.defensiveCount += 1;
				primary.penalties.defensiveYards += Math.abs(yards);
				break;

			// ── Kicking ────────────────────────────────────────────────────────
			// `yards` is the attempt distance, not a gain, so none of these feed
			// the offensive yardage totals.
			case 'field_goal_made':
				primary.kicking.fieldGoalsAttempted += 1;
				primary.kicking.fieldGoalsMade += 1;
				primary.kicking.longestFieldGoal = Math.max(primary.kicking.longestFieldGoal, yards);
				break;

			case 'field_goal_missed':
				primary.kicking.fieldGoalsAttempted += 1;
				break;

			case 'extra_point_made':
				primary.kicking.extraPointsAttempted += 1;
				primary.kicking.extraPointsMade += 1;
				break;

			case 'extra_point_missed':
				primary.kicking.extraPointsAttempted += 1;
				break;

			case 'punt':
				primary.kicking.punts += 1;
				primary.kicking.puntYards += yards;
				break;

			// Credited to whoever carried or caught it, not to a kicker.
			case 'two_point_made':
				primary.conversions.twoPointAttempted += 1;
				primary.conversions.twoPointMade += 1;
				break;

			case 'two_point_failed':
				primary.conversions.twoPointAttempted += 1;
				break;

			// ── Manual adjustment ──────────────────────────────────────────────
			// statKey is a dotted path like "rushing.yards"; `yards` carries the
			// signed delta. Recorded as a real event so corrections stay visible
			// in the log and export rather than being a hidden mutation.
			case 'manual_stat_adjustment': {
				if (!event.statKey) break;
				const [cat, stat] = event.statKey.split('.');
				if (!cat || !stat) break;
				const catObj = (primary as unknown as Record<string, Record<string, number>>)[cat];
				if (catObj && typeof catObj[stat] === 'number') {
					catObj[stat] += yards;
				}
				break;
			}
		}
	}

	// 3. Aggregate team stats
	const teamStats = emptyTeamStats();
	for (const ps of Object.values(playerStats)) {
		teamStats.passing.attempts += ps.passing.attempts;
		teamStats.passing.completions += ps.passing.completions;
		teamStats.passing.yards += ps.passing.yards;
		teamStats.passing.touchdowns += ps.passing.touchdowns;
		teamStats.passing.interceptions += ps.passing.interceptions;

		teamStats.rushing.attempts += ps.rushing.attempts;
		teamStats.rushing.yards += ps.rushing.yards;
		teamStats.rushing.touchdowns += ps.rushing.touchdowns;

		teamStats.receiving.receptions += ps.receiving.receptions;
		teamStats.receiving.yards += ps.receiving.yards;
		teamStats.receiving.touchdowns += ps.receiving.touchdowns;

		teamStats.defence.tackles += ps.defence.tackles;
		teamStats.defence.tacklesForLoss += ps.defence.tacklesForLoss;
		teamStats.defence.sacks += ps.defence.sacks;
		teamStats.defence.sackYards += ps.defence.sackYards;
		teamStats.defence.interceptions += ps.defence.interceptions;
		teamStats.defence.forcedFumbles += ps.defence.forcedFumbles;

		teamStats.kicking.fieldGoalsMade += ps.kicking.fieldGoalsMade;
		teamStats.kicking.fieldGoalsAttempted += ps.kicking.fieldGoalsAttempted;
		teamStats.kicking.longestFieldGoal = Math.max(
			teamStats.kicking.longestFieldGoal,
			ps.kicking.longestFieldGoal
		);
		teamStats.kicking.extraPointsMade += ps.kicking.extraPointsMade;
		teamStats.kicking.extraPointsAttempted += ps.kicking.extraPointsAttempted;
		teamStats.kicking.punts += ps.kicking.punts;
		teamStats.kicking.puntYards += ps.kicking.puntYards;

		teamStats.conversions.twoPointMade += ps.conversions.twoPointMade;
		teamStats.conversions.twoPointAttempted += ps.conversions.twoPointAttempted;

		teamStats.penalties.offensiveCount += ps.penalties.offensiveCount;
		teamStats.penalties.offensiveYards += ps.penalties.offensiveYards;
		teamStats.penalties.defensiveCount += ps.penalties.defensiveCount;
		teamStats.penalties.defensiveYards += ps.penalties.defensiveYards;
	}

	teamStats.totalOffensiveYards = teamStats.passing.yards + teamStats.rushing.yards;
	teamStats.totalTouchdowns =
		teamStats.passing.touchdowns + teamStats.rushing.touchdowns;
	teamStats.totalOffensivePlays = teamStats.passing.attempts + teamStats.rushing.attempts;

	// What has actually been recorded adds up to. A defensive or return score
	// has no action to record it against, so this can legitimately sit below the
	// scoreboard — see TeamStats.totalPoints.
	teamStats.totalPoints =
		teamStats.totalTouchdowns * 6 +
		teamStats.kicking.fieldGoalsMade * 3 +
		teamStats.kicking.extraPointsMade +
		teamStats.conversions.twoPointMade * 2;

	return { playerStats, teamStats };
}
