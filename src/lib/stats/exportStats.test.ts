/**
 * The export tables.
 *
 * These are the last thing that happens to a game's stats and the first thing
 * anyone looks at afterwards, so what matters is that every number that reached
 * the overlay also reaches the spreadsheet, and that operator-typed text cannot
 * change the shape of the file it lands in.
 */
import { describe, it, expect } from 'vitest';
import {
	buildTeamSummaryRows,
	buildPlayerRows,
	buildEventLogRows,
	toCSV,
	workbookSheets,
} from './exportStats';
import { createEmptyStats } from '../statsStore.js';
import { calculateStats } from './calculateStats';
import type { GameState, Player, StatEvent } from './types';

const ROSTER: Player[] = [
	{ id: 'p1', playerName: 'Jack Smith', number: '12', position: 'QB' },
	{ id: 'p2', playerName: 'Marcus Brown', number: '24', position: 'RB' },
];

function game(events: StatEvent[], roster: Player[] = ROSTER): GameState {
	const base = createEmptyStats();
	const { playerStats, teamStats } = calculateStats(roster, events);
	return { ...base, roster, events, playerStats, teamStats, gameDate: '2026-09-07' } as GameState;
}

function rush(id: string, yards: number, playerId = 'p2'): StatEvent {
	return {
		id,
		timestamp: Date.UTC(2026, 8, 7, 14, 30),
		category: 'rushing',
		action: 'rush_attempt',
		primaryPlayerId: playerId,
		yards,
		quarter: 'Q2',
		gameClock: '08:41',
	} as StatEvent;
}

describe('team summary', () => {
	it('reports the totals the overlay showed', () => {
		const rows = buildTeamSummaryRows(game([rush('e1', 7), rush('e2', 13)]));
		const find = (label: string) => rows.find((r) => r[0] === label)?.[1];

		expect(find('Rush Attempts')).toBe(2);
		expect(find('Rushing Yards')).toBe(20);
		expect(find('Yards per Carry')).toBe('10.0');
		expect(find('Total Offensive Yards')).toBe(20);
	});

	it('does not divide by zero on a game with nothing in it', () => {
		const rows = buildTeamSummaryRows(game([]));
		const find = (label: string) => rows.find((r) => r[0] === label)?.[1];

		expect(find('Completion %')).toBe('0.0%');
		expect(find('Yards per Carry')).toBe('0.0');
	});
});

describe('player table', () => {
	it('gives every rostered player a row, played or not', () => {
		const rows = buildPlayerRows(game([rush('e1', 7)]));
		// Header plus both players: a back who never touched the ball still
		// belongs in a team's stat sheet as a line of zeroes.
		expect(rows).toHaveLength(3);
		expect(rows[1][1]).toBe('Jack Smith');
		expect(rows[2][1]).toBe('Marcus Brown');
	});

	it('keeps every row the same width as the header', () => {
		const rows = buildPlayerRows(game([rush('e1', 7)]));
		const width = rows[0].length;
		// A short row shifts every later column, silently mislabelling the data.
		for (const row of rows) expect(row).toHaveLength(width);
	});
});

describe('event log', () => {
	it('names players and carries the game situation', () => {
		const rows = buildEventLogRows(game([rush('e1', 7)]));
		const row = rows[1];

		expect(row).toContain('#24 Marcus Brown');
		expect(row).toContain('Q2');
		expect(row).toContain('08:41');
		expect(row).toContain(7);
	});

	it('falls back to the id for a player no longer on the roster', () => {
		// Penalties use the sentinel 'team', and a roster can be replaced
		// mid-game — neither should produce a blank row.
		const rows = buildEventLogRows(
			game([{ ...rush('e1', 5), primaryPlayerId: 'team' } as StatEvent]),
		);
		expect(rows[1]).toContain('team');
	});
});

describe('CSV', () => {
	it('quotes a value containing a comma or a quote', () => {
		const csv = toCSV([['Smith, Jack', 'he said "go"']]);
		expect(csv).toBe('"Smith, Jack","he said ""go"""');
	});

	it('defuses a value a spreadsheet would run as a formula', () => {
		// Player names come from a pasted roster. Excel and Sheets execute a cell
		// starting =, +, - or @, so these are prefixed rather than run.
		expect(toCSV([['=1+1']])).toBe('"\'=1+1"');
		expect(toCSV([['@SUM(A1)']])).toBe('"\'@SUM(A1)"');
		expect(toCSV([['+41']])).toBe('"\'+41"');
		// A negative number is still a number, not a formula.
		expect(toCSV([[-41]])).toBe('"-41"');
	});

	it('puts one row per line', () => {
		expect(toCSV([['a'], ['b']]).split('\n')).toHaveLength(2);
	});
});

describe('workbook', () => {
	it('is the same three tables, in order', () => {
		const sheets = workbookSheets(game([rush('e1', 7)]));
		expect(sheets.map((s) => s.name)).toEqual(['Team Summary', 'Player Stats', 'Event Log']);
		// Same builders as the CSVs, so the two can never disagree.
		expect(sheets[2].rows).toEqual(buildEventLogRows(game([rush('e1', 7)])));
	});
});
