// ─── Type definitions for the football stats tracker ───

export type StatCategory = 'passing' | 'rushing' | 'receiving' | 'defence' | 'penalty' | 'adjustment';

export type StatAction =
	// Passing
	| 'pass_attempt_incomplete'
	| 'pass_completion'
	| 'passing_td'
	| 'interception_thrown'
	// Rushing
	| 'rush_attempt'
	| 'rush_td'
	// Defence
	| 'tackle'
	| 'tackle_for_loss'
	| 'sack'
	| 'interception'
	| 'forced_fumble'
	// Penalties
	| 'penalty_offensive'
	| 'penalty_defensive'
	// Adjustment
	| 'manual_stat_adjustment';

export type OverlayMode = 'hidden' | 'team_stats' | 'featured_player' | 'leaderboard' | 'last_5_plays' | 'run_pass_chart' | 'drive_summary';

export type LeaderboardCategory = 'passing' | 'rushing' | 'receiving' | 'tackles' | 'sacks' | 'touchdowns';

export interface TeamConfig {
	name: string;
	abbreviation: string;
	primaryColor: string;
	secondaryColor: string;
	textColor: string;
	logoDataUrl?: string;
}

export interface Player {
	id: string;
	playerName: string;
	number: string;
	position: string;
}

export interface StatEvent {
	id: string;
	timestamp: number;
	quarter?: string;
	gameClock?: string;
	category: StatCategory;
	action: StatAction;
	primaryPlayerId: string;
	secondaryPlayerId?: string;
	yards?: number;
	points?: number;
	notes?: string;
	// For manual adjustments
	statKey?: string;
}

export interface PassingStats {
	attempts: number;
	completions: number;
	yards: number;
	touchdowns: number;
	interceptions: number;
}

export interface RushingStats {
	attempts: number;
	yards: number;
	touchdowns: number;
}

export interface ReceivingStats {
	receptions: number;
	yards: number;
	touchdowns: number;
}

export interface DefenceStats {
	tackles: number;
	tacklesForLoss: number;
	sacks: number;
	sackYards: number;
	interceptions: number;
	forcedFumbles: number;
}

export interface PenaltyStats {
	offensiveCount: number;
	offensiveYards: number;
	defensiveCount: number;
	defensiveYards: number;
}

export interface PlayerStats {
	playerId: string;
	passing: PassingStats;
	rushing: RushingStats;
	receiving: ReceivingStats;
	defence: DefenceStats;
	penalties: PenaltyStats;
}

export interface TeamStats {
	passing: PassingStats;
	rushing: RushingStats;
	receiving: ReceivingStats;
	defence: DefenceStats;
	penalties: PenaltyStats;
	totalOffensiveYards: number;
	totalTouchdowns: number;
	totalOffensivePlays: number;
}

export interface GameState {
	gameId: string;
	gameDate: string;
	venue?: string;
	team: TeamConfig;
	roster: Player[];
	events: StatEvent[];
	playerStats: Record<string, PlayerStats>;
	teamStats: TeamStats;
	overlayMode: OverlayMode;
	leaderboardCategory: LeaderboardCategory;
	selectedOverlayPlayers: string[];
	/**
	 * Pending alerts, oldest first, with non-overlapping `expiresAt` windows.
	 * A queue rather than a single slot so a milestone crossed on the same play
	 * as a big play still gets its moment on screen.
	 */
	alertQueue: AlertState[];
	firedMilestones: string[];
	currentDrive: Drive | null;
	completedDrives: Drive[];
	/** Wall-clock of the last local edit. Only comparable within one machine. */
	lastUpdated: number;
	/**
	 * Server-assigned monotonic counter. Unlike `lastUpdated` this is immune to
	 * clock skew between devices, so it is the ordering used for HTTP sync.
	 */
	seq: number;
}

export interface BroadcastMessage {
	type: 'STATE_UPDATE';
	version: number;
	state: GameState;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const ALERT_DURATION_MS = 10000;

export interface AlertState {
	id: string;
	type: 'big_play' | 'milestone';
	title: string;
	subtitle: string;
	playerName: string;
	playerNumber: string;
	yards?: number;
	/** Absolute time this alert stops being shown. */
	expiresAt: number;
	/** Event that produced it, so undoing the event can retract the alert. */
	sourceEventId?: string;
}

// ─── Drives ──────────────────────────────────────────────────────────────────

export type DriveResult =
	| 'touchdown' | 'punt' | 'field_goal' | 'turnover'
	| 'turnover_on_downs' | 'end_of_period' | 'safety' | 'ongoing';

/**
 * `eventIds` is the source of truth. `plays` and `yardsGained` are DERIVED from
 * it on every commit (see `recalculateDrives`), the same way playerStats and
 * teamStats are derived from `events` — so deleting or undoing an event keeps
 * the drive honest instead of leaving the counters inflated.
 */
export interface Drive {
	id: string;
	startTime: number;
	startYardLine?: number;
	eventIds: string[];
	yardsGained: number;
	plays: number;
	result: DriveResult;
	endTime?: number;
}
