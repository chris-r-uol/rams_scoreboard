/**
 * Session-scoped controller UI state that must survive component unmounts.
 *
 * Switching stat tabs destroys the panel (and with it the PlayerSearch), which
 * used to wipe the operator's recently-used players every time they went from
 * Defence back to Passing. Keeping it at module scope means it outlives the
 * component. Deliberately NOT part of GameState — it is per-operator scratch,
 * not game data, so it never gets persisted, broadcast or exported.
 */

const MAX_RECENTS = 6;

const recents = $state<Record<string, string[]>>({});

export function getRecents(key: string): string[] {
	return recents[key] ?? [];
}

export function pushRecent(key: string, playerId: string): void {
	const current = recents[key] ?? [];
	recents[key] = [playerId, ...current.filter((id) => id !== playerId)].slice(0, MAX_RECENTS);
}

export function clearRecents(): void {
	for (const key of Object.keys(recents)) delete recents[key];
}
