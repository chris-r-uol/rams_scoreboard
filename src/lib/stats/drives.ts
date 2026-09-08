import type { Drive, StatEvent } from './types';

/**
 * Actions that count as an offensive play for drive purposes.
 * Defensive stats and penalties are deliberately excluded — a drive's play
 * count should match the offence's snap count.
 */
export const OFFENSIVE_ACTIONS: readonly string[] = [
	'pass_attempt_incomplete',
	'pass_completion',
	'passing_td',
	'interception_thrown',
	'rush_attempt',
	'rush_td'
];

export function isOffensiveAction(action: string): boolean {
	return OFFENSIVE_ACTIONS.includes(action);
}

/**
 * Recompute a drive's totals from the events it still points at.
 *
 * Event IDs that no longer exist (undone or deleted) are dropped, so plays and
 * yards always match reality. This is what makes undo correct for drives.
 */
export function recalculateDrive(drive: Drive, eventsById: Map<string, StatEvent>): Drive {
	const liveIds = drive.eventIds.filter((id) => eventsById.has(id));
	let yardsGained = 0;
	for (const id of liveIds) {
		yardsGained += eventsById.get(id)!.yards ?? 0;
	}
	return { ...drive, eventIds: liveIds, plays: liveIds.length, yardsGained };
}

export function recalculateDrives(
	currentDrive: Drive | null,
	completedDrives: Drive[],
	events: StatEvent[]
): { currentDrive: Drive | null; completedDrives: Drive[] } {
	const eventsById = new Map(events.map((e) => [e.id, e]));
	return {
		currentDrive: currentDrive ? recalculateDrive(currentDrive, eventsById) : null,
		completedDrives: completedDrives.map((d) => recalculateDrive(d, eventsById))
	};
}

/**
 * Time of possession, from the drives themselves.
 *
 * Wall-clock elapsed between opening a drive and closing it, which for a
 * live-operated game is the time the offence was actually on the field. It
 * needs no extra entry at all, but it does depend on drives being opened and
 * closed as they happen — a drive left open at half time will read long.
 *
 * @param now used for a drive still in progress
 */
export function possessionMs(
	currentDrive: Drive | null,
	completedDrives: Drive[],
	now: number = Date.now()
): number {
	let total = 0;
	for (const d of completedDrives) {
		total += Math.max(0, (d.endTime ?? d.startTime) - d.startTime);
	}
	if (currentDrive) total += Math.max(0, now - currentDrive.startTime);
	return total;
}

/** Time of possession as mm:ss. */
export function formatPossession(ms: number): string {
	const total = Math.floor(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}
