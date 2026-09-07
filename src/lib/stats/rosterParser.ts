import type { Player } from './types';

/**
 * Parse a CSV string or tab-separated text (pasted from spreadsheet) into Player objects.
 * Supports header row detection. Required column: player_name.
 * Optional columns: number, position, team, side_of_ball, status, notes.
 */
export function parseRosterText(raw: string): Player[] {
	const lines = raw
		.trim()
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0);

	if (lines.length === 0) return [];

	// Detect delimiter: tab or comma
	const delimiter = lines[0].includes('\t') ? '\t' : ',';

	const parseRow = (line: string): string[] =>
		line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

	const headers = parseRow(lines[0]).map((h) => h.toLowerCase());

	const col = (row: string[], name: string): string => {
		const idx = headers.indexOf(name);
		return idx >= 0 ? (row[idx] ?? '').trim() : '';
	};

	const players: Player[] = [];
	const startIdx = isHeaderRow(headers) ? 1 : 0;

	for (let i = startIdx; i < lines.length; i++) {
		const row = parseRow(lines[i]);
		if (row.every((c) => c === '')) continue;

		const playerName = col(row, 'player_name') || col(row, 'name') || col(row, 'player') || row[0];
		if (!playerName) continue;

		players.push({
			id: crypto.randomUUID(),
			playerName,
			number: col(row, 'number') || col(row, '#') || col(row, 'num') || '',
			position: col(row, 'position') || col(row, 'pos') || ''
		});
	}

	return players;
}

function isHeaderRow(headers: string[]): boolean {
	const known = ['player_name', 'name', 'player', 'number', '#', 'num', 'position', 'pos', 'team'];
	return headers.some((h) => known.includes(h));
}
