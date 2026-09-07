/**
 * Roster positions are free text ("DE", "CB", "WR/KR", "Free Safety"), but the
 * controller filters by unit. Matching on `startsWith(group)` used to hide every
 * player whose position was not spelled exactly like the group button — a
 * roster of DEs, CBs and Ss had *no* players under DL or DB.
 */

export const POSITION_GROUPS = [
	'ALL',
	'QB',
	'RB',
	'WR',
	'TE',
	'OL',
	'DL',
	'LB',
	'DB',
	'ST'
] as const;

export type PositionGroup = (typeof POSITION_GROUPS)[number];

const GROUP_MEMBERS: Record<Exclude<PositionGroup, 'ALL'>, string[]> = {
	QB: ['QB', 'quarterback'],
	RB: ['RB', 'HB', 'FB', 'TB', 'running back', 'halfback', 'fullback', 'tailback'],
	WR: ['WR', 'SE', 'FL', 'SLOT', 'wide receiver', 'receiver', 'split end', 'flanker'],
	TE: ['TE', 'tight end'],
	OL: ['OL', 'OT', 'OG', 'OC', 'C', 'G', 'T', 'LT', 'RT', 'LG', 'RG', 'tackle', 'guard', 'centre', 'center', 'offensive line'],
	DL: ['DL', 'DE', 'DT', 'NT', 'NG', 'defensive end', 'defensive tackle', 'nose tackle', 'defensive line'],
	LB: ['LB', 'ILB', 'OLB', 'MLB', 'WLB', 'SLB', 'EDGE', 'linebacker'],
	DB: ['DB', 'CB', 'S', 'FS', 'SS', 'SAF', 'NB', 'corner', 'cornerback', 'safety', 'defensive back'],
	ST: ['ST', 'K', 'P', 'LS', 'KR', 'PR', 'H', 'kicker', 'punter', 'long snapper', 'returner', 'special teams']
};

/** Pre-built lookup so matching is a Set hit rather than a scan per player. */
const EXACT_LOOKUP: Map<string, Set<Exclude<PositionGroup, 'ALL'>>> = (() => {
	const map = new Map<string, Set<Exclude<PositionGroup, 'ALL'>>>();
	for (const [group, members] of Object.entries(GROUP_MEMBERS)) {
		for (const member of members) {
			const key = member.toUpperCase();
			if (!map.has(key)) map.set(key, new Set());
			map.get(key)!.add(group as Exclude<PositionGroup, 'ALL'>);
		}
	}
	return map;
})();

/**
 * Split a position field into its individual positions.
 * Handles "WR/KR", "DE, OLB", "RB-KR" and plain "QB".
 */
function tokenise(position: string): string[] {
	return position
		.toUpperCase()
		.split(/[/,;|&-]|\s+or\s+/i)
		.map((t) => t.trim())
		.filter(Boolean);
}

/** Every group a position belongs to. A "WR/KR" is both a WR and a ST player. */
export function groupsForPosition(position: string): Set<Exclude<PositionGroup, 'ALL'>> {
	const groups = new Set<Exclude<PositionGroup, 'ALL'>>();
	for (const token of tokenise(position)) {
		const exact = EXACT_LOOKUP.get(token);
		if (exact) {
			for (const g of exact) groups.add(g);
		}
	}
	return groups;
}

export function matchesGroup(position: string, group: PositionGroup): boolean {
	if (group === 'ALL') return true;
	return groupsForPosition(position).has(group);
}
