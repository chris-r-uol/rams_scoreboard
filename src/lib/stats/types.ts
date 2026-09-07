// ─── Type definitions for the football stats tracker ───

export type StatCategory = 'passing' | 'rushing' | 'receiving' | 'defence' | 'kicking' | 'penalty' | 'adjustment';

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
	// Kicking. Field goals carry the attempt distance in `yards`; a miss is
	// recorded too, because a kicker's line is meaningless without the attempts.
	| 'field_goal_made'
	| 'field_goal_missed'
	| 'extra_point_made'
	| 'extra_point_missed'
	| 'punt'
	// Two-point conversions are a run or a pass, not a kick, so they are
	// credited to whoever scored. They live in the kicking entry panel because
	// that is where an operator looks after a touchdown.
	| 'two_point_made'
	| 'two_point_failed'
	// Penalties
	| 'penalty_offensive'
	| 'penalty_defensive'
	// Adjustment
	| 'manual_stat_adjustment';

export type OverlayMode = 'hidden' | 'team_stats' | 'featured_player' | 'leaderboard' | 'last_5_plays' | 'run_pass_chart' | 'drive_summary';

export type LeaderboardCategory = 'passing' | 'rushing' | 'receiving' | 'tackles' | 'sacks' | 'touchdowns' | 'kicking';

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

export interface KickingStats {
	fieldGoalsMade: number;
	fieldGoalsAttempted: number;
	/** Distance of the longest made field goal; 0 when none have been made. */
	longestFieldGoal: number;
	extraPointsMade: number;
	extraPointsAttempted: number;
	punts: number;
	puntYards: number;
}

export interface ConversionStats {
	twoPointMade: number;
	twoPointAttempted: number;
}

export interface PlayerStats {
	playerId: string;
	passing: PassingStats;
	rushing: RushingStats;
	receiving: ReceivingStats;
	defence: DefenceStats;
	kicking: KickingStats;
	conversions: ConversionStats;
	penalties: PenaltyStats;
}

export interface TeamStats {
	passing: PassingStats;
	rushing: RushingStats;
	receiving: ReceivingStats;
	defence: DefenceStats;
	kicking: KickingStats;
	conversions: ConversionStats;
	penalties: PenaltyStats;
	totalOffensiveYards: number;
	totalTouchdowns: number;
	totalOffensivePlays: number;
	/**
	 * Points this team has scored, from what has actually been recorded.
	 *
	 * Touchdowns, field goals, extra points and two-point conversions. It will
	 * not match the scoreboard if points were scored by the defence or on a
	 * return, because the engine has no way to record those yet — so treat a
	 * gap as "something happened that nobody entered", not as an error.
	 */
	totalPoints: number;
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
