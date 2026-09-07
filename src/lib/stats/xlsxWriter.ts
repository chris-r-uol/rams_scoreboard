/**
 * A minimal .xlsx writer.
 *
 * WHY NOT A LIBRARY
 *   The obvious choice is SheetJS, but its npm distribution stopped at 0.18.5
 *   and carries two advisories with no fix available there — both in the parse
 *   path, which this app never uses, yet permanently red in `npm audit` on a
 *   live product. It is also around 400KB, and the OBS overlay is served from
 *   the same bundle, so every browser source would download a spreadsheet
 *   library it can never use.
 *
 *   Reading a spreadsheet is genuinely hard. Writing one is not: an .xlsx is a
 *   ZIP of XML parts, and a workbook of plain strings and numbers needs six
 *   small documents and an archive to hold them.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   No formulas, formatting, merged cells, column widths or dates-as-dates —
 *   every cell is a string or a number. Entries are stored uncompressed, so a
 *   file is a few times larger than SheetJS would produce. For a match's stats
 *   that is tens of kilobytes, which is not worth a deflate implementation.
 */

// ─── XML ──────────────────────────────────────────────────────────────────────

/**
 * Escape text for XML content.
 *
 * Also drops the control characters XML 1.0 cannot represent at all. A roster
 * pasted out of a spreadsheet can carry them, and a single stray 0x1A byte
 * makes the whole workbook unopenable with no useful error.
 */
function xmlText(value: string): string {
	return value
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/** Spreadsheet column name for a zero-based index: 0 → A, 26 → AA. */
export function columnName(index: number): string {
	let name = '';
	let n = index;
	while (n >= 0) {
		name = String.fromCharCode(65 + (n % 26)) + name;
		n = Math.floor(n / 26) - 1;
	}
	return name;
}

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';

export interface Sheet {
	name: string;
	rows: (string | number)[][];
}

/**
 * One worksheet part.
 *
 * Strings are written inline rather than through a shared-strings table. A
 * shared table saves space when values repeat, which in a stats export they
 * mostly do not, and it costs a whole extra part to keep consistent.
 */
function sheetXml(rows: (string | number)[][]): string {
	const body = rows
		.map((row, r) => {
			if (row.length === 0) return `<row r="${r + 1}"/>`;
			const cells = row
				.map((value, c) => {
					const ref = `${columnName(c)}${r + 1}`;
					if (typeof value === 'number' && Number.isFinite(value)) {
						return `<c r="${ref}"><v>${value}</v></c>`;
					}
					const text = xmlText(String(value));
					if (text === '') return `<c r="${ref}"/>`;
					// xml:space is what stops Excel trimming a value the operator
					// deliberately padded, and it costs nothing to always set.
					return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
				})
				.join('');
			return `<row r="${r + 1}">${cells}</row>`;
		})
		.join('');

	return `${XML_DECL}<worksheet xmlns="${NS_MAIN}"><sheetData>${body}</sheetData></worksheet>`;
}

/**
 * Sheet names Excel will accept.
 *
 * The characters below are illegal in a sheet name and the limit is 31; a name
 * that breaks either rule produces a file that will not open, so this clamps
 * rather than trusting the caller.
 */
function safeSheetName(name: string, index: number): string {
	const cleaned = name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31);
	return cleaned || `Sheet${index + 1}`;
}

function buildParts(sheets: Sheet[]): Map<string, string> {
	const parts = new Map<string, string>();

	const overrides = sheets
		.map(
			(_, i) =>
				`<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
		)
		.join('');

	parts.set(
		'[Content_Types].xml',
		`${XML_DECL}<Types xmlns="${NS_CT}">` +
			'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
			'<Default Extension="xml" ContentType="application/xml"/>' +
			'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
			'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
			`${overrides}</Types>`,
	);

	parts.set(
		'_rels/.rels',
		`${XML_DECL}<Relationships xmlns="${NS_PKG_REL}">` +
			`<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
			'</Relationships>',
	);

	parts.set(
		'xl/workbook.xml',
		`${XML_DECL}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>` +
			sheets
				.map(
					(s, i) =>
						`<sheet name="${xmlText(safeSheetName(s.name, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
				)
				.join('') +
			'</sheets></workbook>',
	);

	// The styles part is last, so its relationship id follows the sheets'.
	const stylesId = sheets.length + 1;
	parts.set(
		'xl/_rels/workbook.xml.rels',
		`${XML_DECL}<Relationships xmlns="${NS_PKG_REL}">` +
			sheets
				.map(
					(_, i) =>
						`<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
				)
				.join('') +
			`<Relationship Id="rId${stylesId}" Type="${NS_REL}/styles" Target="styles.xml"/>` +
			'</Relationships>',
	);

	// Nothing is styled, but Excel expects the part to exist and to declare the
	// two fills it treats as built in.
	parts.set(
		'xl/styles.xml',
		`${XML_DECL}<styleSheet xmlns="${NS_MAIN}">` +
			'<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
			'<fills count="2"><fill><patternFill patternType="none"/></fill>' +
			'<fill><patternFill patternType="gray125"/></fill></fills>' +
			'<borders count="1"><border/></borders>' +
			'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
			'<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
			// Named "Normal" style. Without it readers warn that the workbook has
			// no default style and substitute their own.
			'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
			'</styleSheet>',
	);

	sheets.forEach((s, i) => parts.set(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows)));

	return parts;
}

// ─── ZIP ──────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[i] = c >>> 0;
	}
	return table;
})();

export function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

/** Grow-as-needed little-endian byte writer. */
class ByteWriter {
	private buf = new Uint8Array(1024);
	private len = 0;

	private ensure(extra: number) {
		if (this.len + extra <= this.buf.length) return;
		let size = this.buf.length * 2;
		while (size < this.len + extra) size *= 2;
		const next = new Uint8Array(size);
		next.set(this.buf.subarray(0, this.len));
		this.buf = next;
	}

	u16(value: number) {
		this.ensure(2);
		this.buf[this.len++] = value & 0xff;
		this.buf[this.len++] = (value >>> 8) & 0xff;
	}

	u32(value: number) {
		this.ensure(4);
		this.buf[this.len++] = value & 0xff;
		this.buf[this.len++] = (value >>> 8) & 0xff;
		this.buf[this.len++] = (value >>> 16) & 0xff;
		this.buf[this.len++] = (value >>> 24) & 0xff;
	}

	bytes(data: Uint8Array) {
		this.ensure(data.length);
		this.buf.set(data, this.len);
		this.len += data.length;
	}

	get offset() {
		return this.len;
	}

	result(): Uint8Array {
		return this.buf.slice(0, this.len);
	}
}

/**
 * Pack named text parts into a ZIP archive.
 *
 * Entries are stored, not deflated: the method field says so, and a reader that
 * follows the spec treats compressed and uncompressed sizes as equal. Writing
 * the CRC in the local header (rather than deferring it to a data descriptor)
 * keeps the archive readable by the strictest unzippers, Excel included.
 */
export function zipParts(parts: Map<string, string>): Uint8Array {
	const encoder = new TextEncoder();
	const out = new ByteWriter();
	const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = [];

	for (const [name, text] of parts) {
		const nameBytes = encoder.encode(name);
		const data = encoder.encode(text);
		const crc = crc32(data);
		const offset = out.offset;

		out.u32(0x04034b50); // local file header
		out.u16(20); // version needed
		out.u16(0); // flags
		out.u16(0); // method: stored
		out.u16(0); // mod time — a fixed timestamp keeps output reproducible
		out.u16(0x21); // mod date: 1980-01-01, the ZIP epoch
		out.u32(crc);
		out.u32(data.length);
		out.u32(data.length);
		out.u16(nameBytes.length);
		out.u16(0); // extra length
		out.bytes(nameBytes);
		out.bytes(data);

		central.push({ name: nameBytes, crc, size: data.length, offset });
	}

	const centralStart = out.offset;
	for (const entry of central) {
		out.u32(0x02014b50); // central directory header
		out.u16(20); // version made by
		out.u16(20); // version needed
		out.u16(0); // flags
		out.u16(0); // method: stored
		out.u16(0);
		out.u16(0x21);
		out.u32(entry.crc);
		out.u32(entry.size);
		out.u32(entry.size);
		out.u16(entry.name.length);
		out.u16(0); // extra
		out.u16(0); // comment
		out.u16(0); // disk number
		out.u16(0); // internal attributes
		out.u32(0); // external attributes
		out.u32(entry.offset);
		out.bytes(entry.name);
	}
	const centralSize = out.offset - centralStart;

	out.u32(0x06054b50); // end of central directory
	out.u16(0); // this disk
	out.u16(0); // disk with central directory
	out.u16(central.length);
	out.u16(central.length);
	out.u32(centralSize);
	out.u32(centralStart);
	out.u16(0); // comment length

	return out.result();
}

/** Build a complete .xlsx as bytes. */
export function buildXlsx(sheets: Sheet[]): Uint8Array {
	return zipParts(buildParts(sheets));
}
