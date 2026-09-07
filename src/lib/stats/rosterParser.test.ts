import { describe, it, expect } from 'vitest';
import { parseRosterText } from './rosterParser';

describe('parseRosterText', () => {
	it('parses a comma-separated roster with headers', () => {
		const players = parseRosterText('player_name,number,position\nJack Smith,12,QB\nTom Jones,88,WR');
		expect(players).toHaveLength(2);
		expect(players[0]).toMatchObject({ playerName: 'Jack Smith', number: '12', position: 'QB' });
	});

	it('parses tab-separated text pasted from a spreadsheet', () => {
		const players = parseRosterText('player_name\tnumber\tposition\nJack Smith\t12\tQB');
		expect(players[0]).toMatchObject({ playerName: 'Jack Smith', number: '12', position: 'QB' });
	});

	it('accepts header aliases', () => {
		const players = parseRosterText('name,#,pos\nJack Smith,12,QB');
		expect(players[0]).toMatchObject({ playerName: 'Jack Smith', number: '12', position: 'QB' });
	});

	it('handles columns in any order', () => {
		const players = parseRosterText('position,player_name,number\nQB,Jack Smith,12');
		expect(players[0]).toMatchObject({ playerName: 'Jack Smith', number: '12', position: 'QB' });
	});

	it('ignores extra columns it does not recognise', () => {
		const players = parseRosterText('player_name,number,position,status,notes\nJack Smith,12,QB,Active,Captain');
		expect(players[0]).toMatchObject({ playerName: 'Jack Smith', number: '12', position: 'QB' });
	});

	it('falls back to the first column when there is no header row', () => {
		const players = parseRosterText('Jack Smith,12,QB');
		expect(players[0].playerName).toBe('Jack Smith');
	});

	it('skips blank lines', () => {
		const players = parseRosterText('player_name,number\nJack Smith,12\n\n\nTom Jones,88\n');
		expect(players).toHaveLength(2);
	});

	it('strips wrapping quotes', () => {
		const players = parseRosterText('player_name,number\n"Jack Smith",12');
		expect(players[0].playerName).toBe('Jack Smith');
	});

	it('returns an empty array for empty input', () => {
		expect(parseRosterText('')).toEqual([]);
		expect(parseRosterText('   \n  ')).toEqual([]);
	});

	it('tolerates missing number and position', () => {
		const players = parseRosterText('player_name\nJack Smith');
		expect(players[0]).toMatchObject({ playerName: 'Jack Smith', number: '', position: '' });
	});

	it('gives every player a distinct id so duplicate names stay separate', () => {
		const players = parseRosterText('player_name,number\nJohn Smith,12\nJohn Smith,34');
		expect(players[0].id).not.toBe(players[1].id);
		expect(players).toHaveLength(2);
	});
});
