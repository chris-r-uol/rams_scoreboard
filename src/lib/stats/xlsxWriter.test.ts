/**
 * The .xlsx writer.
 *
 * A workbook that opens is the only success condition that matters, and none of
 * these assertions can prove that on their own — so the archive itself is also
 * written out and checked with a real unzipper as part of verifying this work.
 * What is testable here is everything that would silently corrupt it: the CRCs,
 * the offsets, the escaping and the column names.
 */
import { describe, it, expect } from 'vitest';
import { buildXlsx, columnName, crc32, zipParts } from './xlsxWriter';

/** Read little-endian integers, the way an unzipper would. */
function u32(bytes: Uint8Array, at: number): number {
	return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}
function u16(bytes: Uint8Array, at: number): number {
	return bytes[at] | (bytes[at + 1] << 8);
}

describe('columnName', () => {
	it('numbers columns the way a spreadsheet does', () => {
		expect(columnName(0)).toBe('A');
		expect(columnName(25)).toBe('Z');
		// The wrap is the part that goes wrong: after Z comes AA, not BA. The
		// player sheet is 28 columns wide, so every export crosses this boundary.
		expect(columnName(26)).toBe('AA');
		expect(columnName(27)).toBe('AB');
		expect(columnName(51)).toBe('AZ');
		expect(columnName(52)).toBe('BA');
		expect(columnName(701)).toBe('ZZ');
		expect(columnName(702)).toBe('AAA');
	});
});

describe('crc32', () => {
	it('matches the standard check value', () => {
		// "123456789" → 0xCBF43926 is the published CRC-32 check value. A wrong
		// CRC gives an archive that opens only on lenient readers.
		expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
	});

	it('is zero for no bytes', () => {
		expect(crc32(new Uint8Array(0))).toBe(0);
	});
});

describe('zip structure', () => {
	const parts = new Map([
		['a.xml', '<a/>'],
		['dir/b.xml', '<b>hello</b>'],
	]);
	const zip = zipParts(parts);

	it('starts with a local file header and ends with a central directory', () => {
		expect(u32(zip, 0)).toBe(0x04034b50);
		expect(u32(zip, zip.length - 22)).toBe(0x06054b50);
	});

	it('records every entry once in the central directory', () => {
		const eocd = zip.length - 22;
		expect(u16(zip, eocd + 8)).toBe(2);
		expect(u16(zip, eocd + 10)).toBe(2);
	});

	it('points the central directory at the right place', () => {
		const eocd = zip.length - 22;
		const size = u32(zip, eocd + 12);
		const offset = u32(zip, eocd + 16);
		// Get either wrong and the file looks fine until something reads it.
		expect(offset + size).toBe(eocd);
		expect(u32(zip, offset)).toBe(0x02014b50);
	});

	it('stores rather than compresses, with sizes that agree', () => {
		expect(u16(zip, 8)).toBe(0); // method 0 = stored
		const size = u32(zip, 18);
		expect(u32(zip, 22)).toBe(size);
		expect(size).toBe(4); // '<a/>'
	});

	it('writes the same bytes every time', () => {
		// Timestamps are fixed deliberately: two exports of the same game should
		// be byte-identical, so a difference means the stats changed.
		expect(Array.from(zipParts(parts))).toEqual(Array.from(zip));
	});
});

describe('workbook contents', () => {
	const text = new TextDecoder().decode(
		buildXlsx([{ name: 'Only', rows: [['a & b', 3], [], ['<tag>']] }]),
	);

	it('includes every part a reader looks for', () => {
		for (const part of [
			'[Content_Types].xml',
			'_rels/.rels',
			'xl/workbook.xml',
			'xl/_rels/workbook.xml.rels',
			'xl/styles.xml',
			'xl/worksheets/sheet1.xml',
		]) {
			expect(text).toContain(part);
		}
	});

	it('escapes text and leaves numbers bare', () => {
		expect(text).toContain('a &amp; b');
		expect(text).toContain('&lt;tag&gt;');
		// A number written as an inline string sorts and sums as text in Excel,
		// which is the difference between a usable export and a useless one.
		expect(text).toContain('<c r="B1"><v>3</v></c>');
	});

	it('keeps a blank row as a row', () => {
		// Dropping it would shift every later row up by one, and the team summary
		// uses blank rows as section breaks throughout.
		expect(text).toContain('<row r="2"/>');
		expect(text).toContain('<row r="3">');
	});

	it('does not let a control character through', () => {
		// A single stray 0x1A out of a pasted roster makes the whole workbook
		// unopenable, with no error that points at the cause.
		const dirty = new TextDecoder().decode(
			buildXlsx([{ name: 'S', rows: [[`ok${String.fromCharCode(26)}bad`]] }]),
		);
		expect(dirty).toContain('okbad');
	});

	it('clamps a sheet name Excel would refuse', () => {
		const odd = new TextDecoder().decode(
			buildXlsx([{ name: 'A/B:C*D?E[F]G that runs well past thirty-one', rows: [['x']] }]),
		);
		const name = /<sheet name="([^"]*)"/.exec(odd)?.[1] ?? '';
		expect(name.length).toBeLessThanOrEqual(31);
		expect(name).not.toMatch(/[[\]:*?/\\]/);
	});
});
