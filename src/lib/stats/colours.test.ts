import { describe, it, expect } from 'vitest';
import { contrastRatio, contrastColor, parseHex } from './colours';

describe('parseHex', () => {
	it('parses 6-digit and 3-digit hex', () => {
		expect(parseHex('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
		expect(parseHex('#f00')).toEqual({ r: 255, g: 0, b: 0 });
	});

	it('tolerates a missing hash and surrounding whitespace', () => {
		expect(parseHex(' 000000 ')).toEqual({ r: 0, g: 0, b: 0 });
	});

	it('returns null for malformed input rather than NaN components', () => {
		expect(parseHex('#xyzxyz')).toBeNull();
		expect(parseHex('')).toBeNull();
	});
});

describe('contrastRatio', () => {
	it('is 21:1 for black on white', () => {
		expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
	});

	it('is 1:1 for a colour against itself', () => {
		expect(contrastRatio('#1a3a5c', '#1a3a5c')).toBeCloseTo(1, 5);
	});

	it('is symmetric', () => {
		expect(contrastRatio('#CC0000', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#CC0000'), 5);
	});

	it('flags the readability problem the setup screen warns about', () => {
		// Gold text on a gold-ish background — legal to configure, unreadable on air.
		expect(contrastRatio('#C8A84B', '#C8A84B')).toBeLessThan(4.5);
		// The default navy/white pairing is comfortably readable.
		expect(contrastRatio('#FFFFFF', '#1a3a5c')).toBeGreaterThan(4.5);
	});
});

describe('contrastColor', () => {
	it('picks white on dark backgrounds and black on light ones', () => {
		expect(contrastColor('#001F5B')).toBe('#FFFFFF');
		expect(contrastColor('#FFFFFF')).toBe('#000000');
		expect(contrastColor('#C8A84B')).toBe('#000000');
	});

	it('always returns a colour that beats 4.5:1 against its background', () => {
		for (const bg of ['#CC0000', '#001F5B', '#0099CC', '#FF6600', '#A0A0A0', '#111111']) {
			expect(contrastRatio(contrastColor(bg), bg), bg).toBeGreaterThan(4.5);
		}
	});
});
