/**
 * Zero-valued stat records.
 *
 * Ported from the standalone stats project. Kept separate from the scoreboard's
 * own default state: these describe a player's or team's statistics, which are
 * always derived by replaying the event log rather than accumulated in place.
 */
import type { PlayerStats, TeamStats } from './types';

export function emptyPlayerStats(playerId: string): PlayerStats {
	return {
		playerId,
		passing: { attempts: 0, completions: 0, yards: 0, touchdowns: 0, interceptions: 0 },
		rushing: { attempts: 0, yards: 0, touchdowns: 0 },
		receiving: { receptions: 0, yards: 0, touchdowns: 0 },
		defence: { tackles: 0, tacklesForLoss: 0, sacks: 0, sackYards: 0, interceptions: 0, forcedFumbles: 0, touchdowns: 0, safeties: 0 },
		specialTeams: { touchdowns: 0 },
		kicking: { fieldGoalsMade: 0, fieldGoalsAttempted: 0, longestFieldGoal: 0, extraPointsMade: 0, extraPointsAttempted: 0, punts: 0, puntYards: 0 },
		conversions: { twoPointMade: 0, twoPointAttempted: 0 },
		penalties: { offensiveCount: 0, offensiveYards: 0, defensiveCount: 0, defensiveYards: 0 }
	};
}

export function emptyTeamStats(): TeamStats {
	return {
		passing: { attempts: 0, completions: 0, yards: 0, touchdowns: 0, interceptions: 0 },
		rushing: { attempts: 0, yards: 0, touchdowns: 0 },
		receiving: { receptions: 0, yards: 0, touchdowns: 0 },
		defence: { tackles: 0, tacklesForLoss: 0, sacks: 0, sackYards: 0, interceptions: 0, forcedFumbles: 0, touchdowns: 0, safeties: 0 },
		specialTeams: { touchdowns: 0 },
		kicking: { fieldGoalsMade: 0, fieldGoalsAttempted: 0, longestFieldGoal: 0, extraPointsMade: 0, extraPointsAttempted: 0, punts: 0, puntYards: 0 },
		conversions: { twoPointMade: 0, twoPointAttempted: 0 },
		penalties: { offensiveCount: 0, offensiveYards: 0, defensiveCount: 0, defensiveYards: 0 },
		totalOffensiveYards: 0,
		totalTouchdowns: 0,
		totalOffensivePlays: 0,
		totalPoints: 0
	};
}
