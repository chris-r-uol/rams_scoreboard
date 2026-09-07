import { ALERT_DURATION_MS, type AlertState, type Player, type PlayerStats, type StatEvent } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function label(p: Player | undefined): string {
	return p ? `#${p.number} ${p.playerName}` : 'Unknown';
}

export function nestedNum(stats: PlayerStats | undefined, path: string): number {
	if (!stats) return 0;
	const parts = path.split('.');
	let obj: unknown = stats;
	for (const p of parts) {
		if (typeof obj !== 'object' || obj === null) return 0;
		obj = (obj as Record<string, unknown>)[p];
	}
	return typeof obj === 'number' ? obj : 0;
}

// ─── Milestone configuration ─────────────────────────────────────────────────
// Shared by detection and reconciliation so the two can never drift apart.

export interface MilestoneCheck {
	/** 'primary' = the player who made the play, 'secondary' = the receiver. */
	subject: 'primary' | 'secondary';
	path: string;
	thresholds: number[];
	suffix: string;
}

export const MILESTONE_CHECKS: MilestoneCheck[] = [
	{ subject: 'primary', path: 'passing.yards', thresholds: [100, 200, 300], suffix: 'PASSING YARDS' },
	{ subject: 'primary', path: 'rushing.yards', thresholds: [100, 150, 200], suffix: 'RUSHING YARDS' },
	{ subject: 'secondary', path: 'receiving.yards', thresholds: [100, 150, 200], suffix: 'RECEIVING YARDS' }
];

/**
 * Player IDs are UUIDs and contain '-', so '|' is used as the field separator
 * to keep keys parseable by `reconcileMilestones`.
 */
export function milestoneKey(playerId: string, path: string, threshold: number): string {
	return `${playerId}|${path}|${threshold}`;
}

function parseMilestoneKey(key: string): { playerId: string; path: string; threshold: number } | null {
	const parts = key.split('|');
	if (parts.length !== 3) return null;
	const threshold = Number(parts[2]);
	if (!Number.isFinite(threshold)) return null;
	return { playerId: parts[0], path: parts[1], threshold };
}

/**
 * Drop milestones that the stats no longer support.
 *
 * Without this, undoing the play that crossed 100 rushing yards would leave the
 * milestone marked as fired forever, so it could never fire again when the
 * player re-crossed. Keys in an unrecognised (pre-'|') format are dropped.
 */
export function reconcileMilestones(
	firedMilestones: string[],
	playerStats: Record<string, PlayerStats>
): string[] {
	return firedMilestones.filter((key) => {
		const parsed = parseMilestoneKey(key);
		if (!parsed) return false;
		return nestedNum(playerStats[parsed.playerId], parsed.path) >= parsed.threshold;
	});
}

function makeAlert(
	type: AlertState['type'],
	title: string,
	subtitle: string,
	player: Player | undefined,
	startAt: number,
	sourceEventId: string,
	yards?: number
): AlertState {
	return {
		id: crypto.randomUUID(),
		type,
		title,
		subtitle,
		playerName: player?.playerName ?? '',
		playerNumber: player?.number ?? '',
		yards,
		expiresAt: startAt + ALERT_DURATION_MS,
		sourceEventId
	};
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface AlertDetectionResult {
	alerts: AlertState[];
	newMilestoneKeys: string[];
}

/**
 * Detect alerts triggered by a single event.
 *
 * Returns 0..2 alerts: a big play and/or a milestone. Milestones are detected
 * independently of big plays and queued behind them, because the long run that
 * puts a back over 100 yards is exactly the play that used to suppress — and
 * permanently lose — the milestone.
 *
 * @param queueTailExpiry expiry of the last alert already queued, so new alerts
 *   are scheduled after it instead of overlapping.
 */
export function detectAlerts(
	event: StatEvent,
	newPlayerStats: Record<string, PlayerStats>,
	oldPlayerStats: Record<string, PlayerStats>,
	firedMilestones: string[],
	roster: Player[],
	queueTailExpiry = 0
): AlertDetectionResult {
	const yards = event.yards ?? 0;
	const primary = roster.find((p) => p.id === event.primaryPlayerId);
	const secondary = event.secondaryPlayerId
		? roster.find((p) => p.id === event.secondaryPlayerId)
		: undefined;

	const alerts: AlertState[] = [];
	let nextStart = Math.max(Date.now(), queueTailExpiry);
	const push = (
		type: AlertState['type'],
		title: string,
		subtitle: string,
		player: Player | undefined,
		y?: number
	) => {
		const alert = makeAlert(type, title, subtitle, player, nextStart, event.id, y);
		alerts.push(alert);
		nextStart = alert.expiresAt;
	};

	// ── 1. Big play alerts ────────────────────────────────────────────────────

	switch (event.action) {
		case 'passing_td':
			push(
				'big_play',
				'TOUCHDOWN!',
				secondary ? `${label(primary)} → ${label(secondary)}` : label(primary),
				secondary ?? primary,
				yards
			);
			break;

		case 'rush_td':
			push('big_play', 'TOUCHDOWN!', `${label(primary)} — RUSHING`, primary, yards);
			break;

		case 'interception':
			push('big_play', 'INTERCEPTION!', label(primary), primary);
			break;

		case 'sack':
			push('big_play', 'SACK!', `${label(primary)} — ${Math.abs(yards)} YDS`, primary, yards);
			break;

		case 'rush_attempt':
			if (yards >= 20) {
				push('big_play', 'BIG RUN!', `${label(primary)} — ${yards} YDS`, primary, yards);
			}
			break;

		case 'pass_completion':
			if (yards >= 20) {
				push(
					'big_play',
					'BIG PLAY!',
					secondary
						? `${label(primary)} → ${label(secondary)} — ${yards} YDS`
						: `${label(primary)} — ${yards} YDS`,
					secondary ?? primary,
					yards
				);
			}
			break;
	}

	// ── 2. Milestone alerts (always checked, queued after any big play) ───────

	const newMilestoneKeys: string[] = [];

	// Every check is evaluated. A completion can put the passer over 100 passing
	// yards *and* the receiver over 100 receiving yards; stopping at the first
	// match announced one and silently swallowed the other, which — being
	// edge-triggered — then never fired for the rest of the game.
	for (const check of MILESTONE_CHECKS) {
		const pid = check.subject === 'primary' ? event.primaryPlayerId : event.secondaryPlayerId;
		if (!pid) continue;

		const player = roster.find((p) => p.id === pid);
		if (!player) continue;

		const oldVal = nestedNum(oldPlayerStats[pid], check.path);
		const newVal = nestedNum(newPlayerStats[pid], check.path);

		// Highest threshold first, so a single huge play announces "200" not "100".
		for (const threshold of [...check.thresholds].sort((a, b) => b - a)) {
			const key = milestoneKey(pid, check.path, threshold);
			if (firedMilestones.includes(key) || newMilestoneKeys.includes(key)) continue;

			if (oldVal < threshold && newVal >= threshold) {
				newMilestoneKeys.push(key);
				push('milestone', 'MILESTONE!', `${threshold}+ ${check.suffix}`, player);
				break; // one milestone per stat line, not per event
			}
		}
	}

	return { alerts, newMilestoneKeys };
}
