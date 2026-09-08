import type { Player, StatEvent, PlayerStats, TeamStats } from './types';
import { emptyPlayerStats, emptyTeamStats } from './emptyStats';

/** Plays run by this team's offence, the only ones a down applies to. */
const SNAP_ACTIONS = new Set([
	'pass_attempt_incomplete',
	'pass_completion',
	'passing_td',
	'interception_thrown',
	'rush_attempt',
	'rush_td'
]);

const PASS_ACTIONS = new Set([
	'pass_attempt_incomplete',
	'pass_completion',
	'passing_td',
	'interception_thrown'
]);

/**
 * Move the chains, from what the scoreboard said at the snap.
 *
 * Every offensive play carries the down and distance it was run on, so a play
 * that gained at least what it needed moved the chains and one on third down
 * either converted or did not. Nobody has to record any of it separately.
 *
 * Two things it cannot see, both of which make it read low rather than high: a
 * penalty that awards a first down, and a sack of this team's own quarterback,
 * which in a one-team log is never recorded at all.
 */
function applyDownAndDistance(teamStats: TeamStats, events: StatEvent[]): void {
	for (const event of events) {
		if (!SNAP_ACTIONS.has(event.action)) continue;
		if (typeof event.down !== 'number' || typeof event.distance !== 'number') continue;

		const isPass = PASS_ACTIONS.has(event.action);
		const scored = event.action === 'passing_td' || event.action === 'rush_td';
		// A turnover moves nothing, however far it travelled first.
		const turnover = event.action === 'interception_thrown';
		const moved = !turnover && (scored || (event.yards ?? 0) >= event.distance);

		if (moved) {
			teamStats.firstDowns.total += 1;
			if (isPass) teamStats.firstDowns.passing += 1;
			else teamStats.firstDowns.rushing += 1;
		}

		if (event.down === 3) {
			teamStats.thirdDowns.attempts += 1;
			if (moved) teamStats.thirdDowns.conversions += 1;
		} else if (event.down === 4) {
			teamStats.fourthDowns.attempts += 1;
			if (moved) teamStats.fourthDowns.conversions += 1;
		}
	}
}

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
				// A target only when the operator named who it was for. Catch rate
				// is worth having and costs nothing when it is left blank.
				if (secondary) secondary.receiving.targets += 1;
				break;

			case 'pass_completion':
				primary.passing.attempts += 1;
				primary.passing.completions += 1;
				primary.passing.yards += yards;
				if (secondary) {
					secondary.receiving.targets += 1;
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
					secondary.receiving.targets += 1;
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
				primary.defence.soloTackles += 1;
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
				primary.defence.interceptionYards += yards;
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

			// ── Tackles, coverage and loose balls ──────────────────────────────
			case 'tackle_assist':
				primary.defence.tackles += 1;
				primary.defence.assistedTackles += 1;
				break;

			case 'pass_defended':
				primary.defence.passesDefended += 1;
				break;

			case 'fumble_recovery':
				primary.defence.fumbleRecoveries += 1;
				primary.defence.fumbleReturnYards += yards;
				break;

			// ── Ball security ──────────────────────────────────────────────────
			// A fumble the offence fell on is still a fumble; only a lost one is
			// a turnover, which is why they are separate actions rather than one
			// with a flag nobody would remember to set.
			case 'fumble':
				primary.turnovers.fumbles += 1;
				break;

			case 'fumble_lost':
				primary.turnovers.fumbles += 1;
				primary.turnovers.fumblesLost += 1;
				break;

			// ── Returns that did not score ─────────────────────────────────────
			case 'kick_return':
				primary.specialTeams.kickReturns += 1;
				primary.specialTeams.kickReturnYards += yards;
				primary.specialTeams.longestKickReturn = Math.max(primary.specialTeams.longestKickReturn, yards);
				break;

			case 'punt_return':
				primary.specialTeams.puntReturns += 1;
				primary.specialTeams.puntReturnYards += yards;
				primary.specialTeams.longestPuntReturn = Math.max(primary.specialTeams.longestPuntReturn, yards);
				break;

			// ── Defensive and special-teams scores ─────────────────────────────
			// `yards` on these is a return distance, so none of them feed the
			// offensive totals — the offence was not on the field.
			case 'interception_td':
				// A pick-six is an interception too, so it counts as both rather
				// than making the operator enter the same play twice.
				primary.defence.interceptions += 1;
				primary.defence.interceptionYards += yards;
				primary.defence.touchdowns += 1;
				break;

			case 'fumble_return_td':
				primary.defence.fumbleReturnYards += yards;
				primary.defence.touchdowns += 1;
				break;

			case 'safety':
				primary.defence.safeties += 1;
				break;

			case 'kick_return_td':
				primary.specialTeams.touchdowns += 1;
				primary.specialTeams.kickReturns += 1;
				primary.specialTeams.kickReturnYards += yards;
				primary.specialTeams.longestKickReturn = Math.max(primary.specialTeams.longestKickReturn, yards);
				break;

			case 'punt_return_td':
				primary.specialTeams.touchdowns += 1;
				primary.specialTeams.puntReturns += 1;
				primary.specialTeams.puntReturnYards += yards;
				primary.specialTeams.longestPuntReturn = Math.max(primary.specialTeams.longestPuntReturn, yards);
				break;

			// A blocked kick taken in is a score but not a return of anything the
			// returner fielded, so it is deliberately not a kick or punt return.
			case 'blocked_kick_td':
				primary.specialTeams.touchdowns += 1;
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

		teamStats.receiving.targets += ps.receiving.targets;
		teamStats.receiving.receptions += ps.receiving.receptions;
		teamStats.receiving.yards += ps.receiving.yards;
		teamStats.receiving.touchdowns += ps.receiving.touchdowns;

		teamStats.defence.tackles += ps.defence.tackles;
		teamStats.defence.soloTackles += ps.defence.soloTackles;
		teamStats.defence.assistedTackles += ps.defence.assistedTackles;
		teamStats.defence.tacklesForLoss += ps.defence.tacklesForLoss;
		teamStats.defence.passesDefended += ps.defence.passesDefended;
		teamStats.defence.fumbleRecoveries += ps.defence.fumbleRecoveries;
		teamStats.defence.interceptionYards += ps.defence.interceptionYards;
		teamStats.defence.fumbleReturnYards += ps.defence.fumbleReturnYards;
		teamStats.defence.sacks += ps.defence.sacks;
		teamStats.defence.sackYards += ps.defence.sackYards;
		teamStats.defence.interceptions += ps.defence.interceptions;
		teamStats.defence.forcedFumbles += ps.defence.forcedFumbles;
		teamStats.defence.touchdowns += ps.defence.touchdowns;
		teamStats.defence.safeties += ps.defence.safeties;

		teamStats.specialTeams.touchdowns += ps.specialTeams.touchdowns;
		teamStats.specialTeams.kickReturns += ps.specialTeams.kickReturns;
		teamStats.specialTeams.kickReturnYards += ps.specialTeams.kickReturnYards;
		teamStats.specialTeams.longestKickReturn = Math.max(
			teamStats.specialTeams.longestKickReturn,
			ps.specialTeams.longestKickReturn
		);
		teamStats.specialTeams.puntReturns += ps.specialTeams.puntReturns;
		teamStats.specialTeams.puntReturnYards += ps.specialTeams.puntReturnYards;
		teamStats.specialTeams.longestPuntReturn = Math.max(
			teamStats.specialTeams.longestPuntReturn,
			ps.specialTeams.longestPuntReturn
		);

		teamStats.turnovers.fumbles += ps.turnovers.fumbles;
		teamStats.turnovers.fumblesLost += ps.turnovers.fumblesLost;

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
	teamStats.takeaways = teamStats.defence.interceptions + teamStats.defence.fumbleRecoveries;
	teamStats.giveaways = teamStats.passing.interceptions + teamStats.turnovers.fumblesLost;

	applyDownAndDistance(teamStats, events);

	// Every phase. The two totals either side of this stay offence-only — see
	// TeamStats.totalTouchdowns for why they differ.
	teamStats.totalTouchdowns =
		teamStats.passing.touchdowns +
		teamStats.rushing.touchdowns +
		teamStats.defence.touchdowns +
		teamStats.specialTeams.touchdowns;
	teamStats.totalOffensivePlays = teamStats.passing.attempts + teamStats.rushing.attempts;

	// What has actually been recorded adds up to. A defensive or return score
	// has no action to record it against, so this can legitimately sit below the
	// scoreboard — see TeamStats.totalPoints.
	teamStats.totalPoints =
		teamStats.totalTouchdowns * 6 +
		teamStats.kicking.fieldGoalsMade * 3 +
		teamStats.kicking.extraPointsMade +
		teamStats.conversions.twoPointMade * 2 +
		teamStats.defence.safeties * 2;

	return { playerStats, teamStats };
}
