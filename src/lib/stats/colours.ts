export const COLOR_PRESETS: { name: string; value: string }[] = [
	{ name: 'Red', value: '#CC0000' },
	{ name: 'Navy', value: '#001F5B' },
	{ name: 'Royal Blue', value: '#004C97' },
	{ name: 'Cyan', value: '#0099CC' },
	{ name: 'Orange', value: '#FF6600' },
	{ name: 'Dark Green', value: '#006400' },
	{ name: 'Purple', value: '#4B0082' },
	{ name: 'Silver', value: '#A0A0A0' },
	{ name: 'White', value: '#FFFFFF' },
	{ name: 'Maroon', value: '#800000' },
	{ name: 'Teal', value: '#008080' },
	{ name: 'Pewter', value: '#6E7B8B' },
	{ name: 'Black', value: '#111111' },
	{ name: 'Gold', value: '#C8A84B' }
];

/** Parse #rgb or #rrggbb into 0-255 components. Returns null if unparseable. */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
	const cleaned = hex.trim().replace(/^#/, '');
	const full =
		cleaned.length === 3
			? cleaned
					.split('')
					.map((c) => c + c)
					.join('')
			: cleaned;
	if (!/^[0-9a-f]{6}$/i.test(full)) return null;
	return {
		r: parseInt(full.slice(0, 2), 16),
		g: parseInt(full.slice(2, 4), 16),
		b: parseInt(full.slice(4, 6), 16)
	};
}

/** WCAG relative luminance. */
function relativeLuminance(hex: string): number {
	const rgb = parseHex(hex);
	if (!rgb) return 0;
	const channel = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white).
 * Used to warn when team branding would produce an unreadable overlay — the
 * overlay is the one surface nobody can fix mid-broadcast.
 */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const [light, dark] = la > lb ? [la, lb] : [lb, la];
	return (light + 0.05) / (dark + 0.05);
}

/** Return black or white — whichever is more readable on the given background. */
export function contrastColor(hex: string): string {
	return contrastRatio('#FFFFFF', hex) >= contrastRatio('#000000', hex) ? '#FFFFFF' : '#000000';
}

/** Convert an image File to a base64 data URL */
export async function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}
