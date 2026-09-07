import { describe, it, expect } from 'vitest';
import { recalculateDrives, isOffensiveAction } from './drives';
import type { Drive, StatEvent } from './types';

function ev(id: string, yards: number): StatEvent {
	return {
		id,
		timestamp: 1,
		category: 'rushing',
		action: 'rush_attempt',
		primaryPlayerId: 'rb',
		yards
	};
}

function drive(eventIds: string[]): Drive {
	return {
		id: 'd1',
		startTime: 0,
		startYardLine: 25,
		eventIds,
		// Deliberately wrong — these must be recomputed, not trusted.
		plays: 99,
		yardsGained: 999,
		result: 'ongoing'
	};
}

describe('drive derivation', () => {
	it('classifies offensive actions only', () => {
		expect(isOffensiveAction('rush_attempt')).toBe(true);
		expect(isOffensiveAction('passing_td')).toBe(true);
		expect(isOffensiveAction('tackle')).toBe(false);
		expect(isOffensiveAction('penalty_offensive')).toBe(false);
	});

	it('recomputes plays and yards from the events rather than trusting stored counters', () => {
		const events = [ev('a', 6), ev('b', 12)];
		const { currentDrive } = recalculateDrives(drive(['a', 'b']), [], events);
		expect(currentDrive).toMatchObject({ plays: 2, yardsGained: 18 });
	});

	it('drops an undone event from the drive — the undo bug', () => {
		const before = recalculateDrives(drive(['a', 'b']), [], [ev('a', 6), ev('b', 50)]);
		expect(before.currentDrive).toMatchObject({ plays: 2, yardsGained: 56 });

		// The operator undoes the 50-yard run: it leaves `events` but the drive
		// still references it. Previously plays/yards stayed inflated forever.
		const after = recalculateDrives(before.currentDrive, [], [ev('a', 6)]);
		expect(after.currentDrive).toMatchObject({ plays: 1, yardsGained: 6 });
		expect(after.currentDrive?.eventIds).toEqual(['a']);
	});

	it('leaves no orphaned event ids behind', () => {
		const { currentDrive } = recalculateDrives(drive(['a', 'gone']), [], [ev('a', 3)]);
		expect(currentDrive?.eventIds).toEqual(['a']);
	});

	it('handles a drive that loses every event', () => {
		const { currentDrive } = recalculateDrives(drive(['a']), [], []);
		expect(currentDrive).toMatchObject({ plays: 0, yardsGained: 0, eventIds: [] });
	});

	it('recalculates completed drives too, so history stays honest', () => {
		const completed: Drive = { ...drive(['a', 'b']), id: 'done', result: 'punt' };
		const { completedDrives } = recalculateDrives(null, [completed], [ev('a', 4)]);
		expect(completedDrives[0]).toMatchObject({ plays: 1, yardsGained: 4, result: 'punt' });
	});

	it('treats a null current drive as a no-op', () => {
		expect(recalculateDrives(null, [], []).currentDrive).toBeNull();
	});

	it('sums negative yardage correctly', () => {
		const { currentDrive } = recalculateDrives(drive(['a', 'b']), [], [ev('a', 8), ev('b', -3)]);
		expect(currentDrive?.yardsGained).toBe(5);
	});
});
