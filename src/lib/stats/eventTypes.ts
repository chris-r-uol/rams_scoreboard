import type { StatAction, StatCategory } from './types';

export interface ActionMeta {
	action: StatAction;
	label: string;
	category: StatCategory;
	requiresReceiver: boolean;
	requiresYards: boolean;
	/** Applied when the operator records this action with yardage left at 0. */
	defaultYards?: number;
	/** Tailwind classes for the controller button. */
	tone: string;
	/** Bound to Enter (primary) and Shift+Enter (touchdown) in the controller. */
	role?: 'primary' | 'touchdown';
}

export const STAT_ACTIONS: ActionMeta[] = [
	// Passing
	{ action: 'pass_attempt_incomplete', label: 'Incomplete Pass', category: 'passing', requiresReceiver: false, requiresYards: false, tone: 'bg-gray-700 hover:bg-gray-600' },
	{ action: 'pass_completion', label: 'Complete Pass', category: 'passing', requiresReceiver: true, requiresYards: true, tone: 'bg-blue-700 hover:bg-blue-600', role: 'primary' },
	{ action: 'passing_td', label: 'Passing TD 🏈', category: 'passing', requiresReceiver: true, requiresYards: true, tone: 'bg-green-700 hover:bg-green-600', role: 'touchdown' },
	{ action: 'interception_thrown', label: 'Interception', category: 'passing', requiresReceiver: false, requiresYards: false, tone: 'bg-red-700 hover:bg-red-600' },
	// Rushing
	{ action: 'rush_attempt', label: 'Rush', category: 'rushing', requiresReceiver: false, requiresYards: true, tone: 'bg-gray-700 hover:bg-gray-600', role: 'primary' },
	{ action: 'rush_td', label: 'Rush TD 🏈', category: 'rushing', requiresReceiver: false, requiresYards: true, tone: 'bg-green-700 hover:bg-green-600', role: 'touchdown' },
	// Defence
	{ action: 'tackle', label: 'Tackle', category: 'defence', requiresReceiver: false, requiresYards: false, tone: 'bg-gray-700 hover:bg-gray-600', role: 'primary' },
	{ action: 'tackle_for_loss', label: 'TFL', category: 'defence', requiresReceiver: false, requiresYards: true, defaultYards: -1, tone: 'bg-orange-700 hover:bg-orange-600' },
	{ action: 'sack', label: 'Sack', category: 'defence', requiresReceiver: false, requiresYards: true, defaultYards: -7, tone: 'bg-red-700 hover:bg-red-600' },
	{ action: 'interception', label: 'INT', category: 'defence', requiresReceiver: false, requiresYards: false, tone: 'bg-purple-700 hover:bg-purple-600' },
	{ action: 'forced_fumble', label: 'FF', category: 'defence', requiresReceiver: false, requiresYards: false, tone: 'bg-yellow-700 hover:bg-yellow-600' },
	// Kicking. Distances go in `yards`; a 38-yard field goal is a 38, not a gain.
	{ action: 'field_goal_made', label: 'FG Good 🏈', category: 'kicking', requiresReceiver: false, requiresYards: true, defaultYards: 30, tone: 'bg-green-700 hover:bg-green-600', role: 'primary' },
	{ action: 'field_goal_missed', label: 'FG Missed', category: 'kicking', requiresReceiver: false, requiresYards: true, defaultYards: 30, tone: 'bg-gray-700 hover:bg-gray-600' },
	{ action: 'extra_point_made', label: 'XP Good', category: 'kicking', requiresReceiver: false, requiresYards: false, tone: 'bg-green-800 hover:bg-green-700' },
	{ action: 'extra_point_missed', label: 'XP Missed', category: 'kicking', requiresReceiver: false, requiresYards: false, tone: 'bg-gray-700 hover:bg-gray-600' },
	{ action: 'two_point_made', label: '2PT Good', category: 'kicking', requiresReceiver: false, requiresYards: false, tone: 'bg-green-700 hover:bg-green-600' },
	{ action: 'two_point_failed', label: '2PT Failed', category: 'kicking', requiresReceiver: false, requiresYards: false, tone: 'bg-gray-700 hover:bg-gray-600' },
	{ action: 'punt', label: 'Punt', category: 'kicking', requiresReceiver: false, requiresYards: true, defaultYards: 35, tone: 'bg-blue-700 hover:bg-blue-600' },
	// Penalties
	{ action: 'penalty_offensive', label: 'Offensive Penalty', category: 'penalty', requiresReceiver: false, requiresYards: true, tone: 'bg-orange-700 hover:bg-orange-600', role: 'primary' },
	{ action: 'penalty_defensive', label: 'Defensive Penalty', category: 'penalty', requiresReceiver: false, requiresYards: true, tone: 'bg-blue-700 hover:bg-blue-600' }
];

const BY_ACTION = new Map(STAT_ACTIONS.map((a) => [a.action, a]));

export function getActionMeta(action: StatAction): ActionMeta | undefined {
	return BY_ACTION.get(action);
}

export function actionsFor(category: StatCategory): ActionMeta[] {
	return STAT_ACTIONS.filter((a) => a.category === category);
}

/** Human label for an action, falling back to a de-underscored version. */
export function formatAction(action: StatAction | string): string {
	const meta = BY_ACTION.get(action as StatAction);
	if (meta) return meta.label.replace(/\s*🏈$/, '');
	return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve the yardage to record. An operator who hits Sack without touching the
 * yardage pad means "the usual sack", not "zero yards".
 */
export function resolveYards(action: StatAction, entered: number): number | undefined {
	const meta = BY_ACTION.get(action);
	if (!meta?.requiresYards) return undefined;
	if (entered === 0 && meta.defaultYards !== undefined) return meta.defaultYards;
	return entered;
}
