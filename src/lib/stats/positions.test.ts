import { describe, it, expect } from 'vitest';
import { matchesGroup, groupsForPosition } from './positions';

describe('position grouping', () => {
	it('ALL matches everything, including a blank position', () => {
		expect(matchesGroup('DE', 'ALL')).toBe(true);
		expect(matchesGroup('', 'ALL')).toBe(true);
	});

	/**
	 * The reported bug: filters matched with startsWith, so a roster of DEs, CBs
	 * and Ss showed "No players found" under DL and DB.
	 */
	it('matches real defensive line positions to DL', () => {
		for (const pos of ['DE', 'DT', 'NT', 'DL']) {
			expect(matchesGroup(pos, 'DL'), pos).toBe(true);
		}
	});

	it('matches real defensive back positions to DB', () => {
		for (const pos of ['CB', 'S', 'FS', 'SS', 'DB']) {
			expect(matchesGroup(pos, 'DB'), pos).toBe(true);
		}
	});

	it('matches real offensive line positions to OL', () => {
		for (const pos of ['OT', 'OG', 'C', 'LT', 'RG', 'OL']) {
			expect(matchesGroup(pos, 'OL'), pos).toBe(true);
		}
	});

	it('matches specialists to ST', () => {
		for (const pos of ['K', 'P', 'LS', 'KR']) {
			expect(matchesGroup(pos, 'ST'), pos).toBe(true);
		}
	});

	it('does not put a defensive end in the defensive backs', () => {
		expect(matchesGroup('DE', 'DB')).toBe(false);
		expect(matchesGroup('CB', 'DL')).toBe(false);
	});

	it('is case insensitive and tolerates whitespace', () => {
		expect(matchesGroup(' cb ', 'DB')).toBe(true);
		expect(matchesGroup('Wr', 'WR')).toBe(true);
	});

	it('handles multi-position players in every group they belong to', () => {
		expect(matchesGroup('WR/KR', 'WR')).toBe(true);
		expect(matchesGroup('WR/KR', 'ST')).toBe(true);
		expect(matchesGroup('DE, OLB', 'DL')).toBe(true);
		expect(matchesGroup('DE, OLB', 'LB')).toBe(true);
	});

	it('understands spelled-out positions', () => {
		expect(matchesGroup('Quarterback', 'QB')).toBe(true);
		expect(matchesGroup('Safety', 'DB')).toBe(true);
	});

	it('returns no groups for an unrecognised position rather than throwing', () => {
		expect(groupsForPosition('WIZARD').size).toBe(0);
		expect(matchesGroup('WIZARD', 'QB')).toBe(false);
	});

	it('treats an empty position as ungrouped', () => {
		expect(groupsForPosition('').size).toBe(0);
	});
});
