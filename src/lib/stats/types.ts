// ─── Type definitions for the football stats tracker ───

export type StatCategory = 'passing' | 'rushing' | 'receiving' | 'defence' | 'kicking' | 'special_teams' | 'penalty' | 'adjustment';

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
	| 'tackle_assist'
	| 'tackle_for_loss'
	| 'pass_defended'
	| 'fumble_recovery'
	| 'sack'
	| 'interception'
	| 'forced_fumble'
	// Defensive scores. A pick-six is an interception as well as a touchdown,
	// so `interception_td` counts as both rather than needing two entries.
	| 'interception_td'
	| 'fumble_return_td'
	| 'safety'
	// Special teams scores. `yards` carries the return distance where it is
	// known; there is no full returns record yet, so it is for the log and the
	// on-air card rather than a per-player average.
	| 'kick_return_td'
	| 'punt_return_td'
	| 'blocked_kick_td'
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
	/**
	 * Down and distance as the scoreboard read them when this play was entered.
	 *
	 * Stamped automatically, like quarter and clock — see gameContext.js. It is
	 * what makes first downs and third-down conversions derivable without asking
	 * the operator to record them a second time.
	 */
	down?: number;
	distance?: number;
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
	/** Passes thrown this player's way, caught or not. */
	targets: number;
	receptions: number;
	yards: number;
	touchdowns: number;
}

export interface DefenceStats {
	/** Solo plus assisted — the combined number a stat sheet leads with. */
	tackles: number;
	soloTackles: number;
	assistedTackles: number;
	tacklesForLoss: number;
	passesDefended: number;
	fumbleRecoveries: number;
	interceptionYards: number;
	fumbleReturnYards: number;
	sacks: number;
	sackYards: number;
	interceptions: number;
	forcedFumbles: number;
	/** Interceptions and fumbles returned for a score. */
	touchdowns: number;
	safeties: number;
}

export interface SpecialTeamsStats {
	/** Kick, punt and blocked-kick returns taken all the way. */
	touchdowns: number;
	kickReturns: number;
	kickReturnYards: number;
	longestKickReturn: number;
	puntReturns: number;
	puntReturnYards: number;
	longestPuntReturn: number;
}

export interface TurnoverStats {
	/** Every fumble, whoever ended up with the ball. */
	fumbles: number;
	fumblesLost: number;
}

export interface DownStats {
	attempts: number;
	conversions: number;
}

export interface FirstDownStats {
	total: number;
	rushing: number;
	passing: number;
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
	specialTeams: SpecialTeamsStats;
	kicking: KickingStats;
	conversions: ConversionStats;
	turnovers: TurnoverStats;
	penalties: PenaltyStats;
}

export interface TeamStats {
	passing: PassingStats;
	rushing: RushingStats;
	receiving: ReceivingStats;
	defence: DefenceStats;
	specialTeams: SpecialTeamsStats;
	kicking: KickingStats;
	conversions: ConversionStats;
	turnovers: TurnoverStats;
	penalties: PenaltyStats;
	/**
	 * Derived from the down and distance stamped on each play.
	 *
	 * A play that gained at least what it needed moved the chains. Penalties
	 * that award a first down are not counted, because no play recorded one —
	 * so this can read low against an official sheet, never high.
	 */
	firstDowns: FirstDownStats;
	thirdDowns: DownStats;
	fourthDowns: DownStats;
	/** Interceptions and fumbles this team recovered. */
	takeaways: number;
	/** Interceptions thrown and fumbles lost. */
	giveaways: number;
	totalOffensiveYards: number;
	/**
	 * Every touchdown, in any phase — offence, defence and special teams.
	 *
	 * Not the same shape as the two totals either side of it, which stay
	 * strictly offensive: a defensive score is not an offensive play and must
	 * not inflate yards or play count. A touchdown is a touchdown, though, and
	 * a panel reading "Total TDs" that quietly omitted the pick-six would be
	 * wrong in the way nobody checks.
	 */
	totalTouchdowns: number;
	totalOffensivePlays: number;
	/**
	 * Points this team has scored, from what has actually been recorded.
	 *
	 * Touchdowns in every phase, field goals, extra points, two-point
	 * conversions and safeties. A gap against the scoreboard now means a play
	 * nobody entered, rather than something the engine cannot represent.
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
