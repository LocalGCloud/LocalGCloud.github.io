// Structure for the governing license text (src/data/legal/public-preview-license.txt).
//
// The text is published byte for byte at /license.txt; /license/ renders the same words
// as HTML. This parser only groups lines: sections become headings, blank-line separated
// blocks become paragraphs, "(a)" items become list items, and indented address lines
// keep their line breaks. It never rewrites wording, so the page and the raw file agree.
// Plain JavaScript so the page and the build checks share it.

const RULE = /^={10,}$/;
const LIST_ITEM = /^ {4}\(([a-z])\)\s+(.*)$/;
const CONTINUATION = /^ {5,}(\S.*)$/;
const INDENTED = /^ {4}(\S.*)$/;

// Join wrapped lines; a line that ends in a hyphen ("layer-") continues the same word.
const joinLines = (lines) =>
	lines.reduce((text, line) => {
		const part = line.trim();
		if (!text) return part;
		return /[A-Za-z]-$/.test(text) ? `${text}${part}` : `${text} ${part}`;
	}, "");

/** @param {string[]} lines one blank-line separated block */
function parseBlock(lines) {
	const blocks = [];
	let lead = [];
	let items = [];
	const flushLead = () => {
		if (lead.length) blocks.push({ type: "paragraph", text: joinLines(lead) });
		lead = [];
	};
	const flushItems = () => {
		if (items.length) blocks.push({ type: "list", items: items.map((item) => ({ label: item.label, text: joinLines(item.lines) })) });
		items = [];
	};
	// A block of only indented lines (the contact address) keeps one line per entry.
	if (lines.every((line) => INDENTED.test(line) && !LIST_ITEM.test(line))) {
		return [{ type: "lines", lines: lines.map((line) => line.trim()) }];
	}
	for (const line of lines) {
		const item = line.match(LIST_ITEM);
		if (item) {
			flushLead();
			items.push({ label: `(${item[1]})`, lines: [item[2]] });
			continue;
		}
		const continuation = line.match(CONTINUATION);
		if (continuation && items.length) {
			items.at(-1).lines.push(continuation[1]);
			continue;
		}
		flushItems();
		lead.push(line);
	}
	flushItems();
	flushLead();
	return blocks;
}

const slug = (heading) =>
	heading
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

/**
 * @param {string} text the governing license text
 * @returns {{ title: string, preamble: Array<object>, sections: Array<{ heading: string, id: string, blocks: Array<object> }> }}
 */
export function parseLicenseDocument(text) {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const title = lines.shift()?.trim() ?? "";
	const preamble = [];
	const sections = [];
	let target = preamble;
	let block = [];
	const flush = () => {
		if (block.length) target.push(...parseBlock(block));
		block = [];
	};
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		// A heading is a single line between two rules.
		if (RULE.test(line) && RULE.test(lines[index + 2] ?? "")) {
			flush();
			const heading = lines[index + 1].trim();
			const section = { heading, id: slug(heading), blocks: [] };
			sections.push(section);
			target = section.blocks;
			index += 2;
			continue;
		}
		if (!line.trim()) flush();
		else block.push(line);
	}
	flush();
	if (!title || !sections.length) throw new Error("License text has no title or sections");
	return { title, preamble, sections };
}

/** Every word of the license, whitespace-normalized, for comparing the page with the file. */
export function licenseWords(text) {
	return text
		.replace(/^={10,}$/gm, "")
		.replace(/([A-Za-z])-\n\s*/g, "$1-")
		.split(/\s+/)
		.filter(Boolean);
}
