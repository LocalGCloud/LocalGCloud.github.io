import TurndownService from "turndown";

const site = "https://local.cloud";
const fail = (message) => { throw new Error(`Markdown twins: ${message}`); };
const attribute = (html, pattern) => html.match(pattern)?.[1]?.trim() ?? "";
const decode = (text) => text.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, number, name) => number
	? String.fromCodePoint(Number.parseInt(number.replace(/^x/i, ""), /^x/i.test(number) ? 16 : 10))
	: ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[name.toLowerCase()]);

const classes = (node) => (node.getAttribute?.("class") ?? "").split(/\s+/);
const noiseClasses = ["docs-toolbar", "docs-mobile-nav", "docs-sidebar", "docs-article__header", "docs-article__meta", "doc-feedback", "field-hero__visual--agent", "field-ribbon__agent", "field-atlas__agent-bar", "lc-agent-prompt", "lc-agent-captcha", "agent-terminal"];
// Navigation, page chrome and decoration; callouts (<aside class="callout">) stay.
const isNoise = (node) =>
	node.nodeName === "NAV" ||
	noiseClasses.some((name) => classes(node).includes(name)) ||
	node.getAttribute?.("aria-hidden") === "true" ||
	node.getAttribute?.("role") === "tablist" ||
	node.hasAttribute?.("data-agent-visual") ||
	node.hasAttribute?.("data-agent-only") ||
	// Content that exists only to be revealed by a control, such as a category the default filter hides.
	node.hasAttribute?.("data-markdown-skip");

export function converter(pageUrl) {
	const absolute = (href) => (href.startsWith("#") ? `${pageUrl}${href}` : new URL(href, pageUrl).toString());
	const singleLine = (text) => text.replace(/\s+/g, " ").trim();
	const service = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "_" });
	service.remove(["script", "style", "noscript", "template", "svg", "button", "form", "textarea", "select", "input", "iframe"]);
	service.remove(isNoise);
	service.addRule('viewPresentation', { filter: (node) => node.hasAttribute?.('data-desktop-copy') || node.hasAttribute?.('data-mobile-only'), replacement: () => '' });
	service.addRule("code", {
		filter: "pre",
		replacement: (_, node) => {
			const language = node.getAttribute("data-language") ?? node.querySelector("code")?.getAttribute("class")?.match(/language-(\S+)/)?.[1] ?? "";
			const code = node.textContent.replace(/\n+$/, "");
			const fence = code.includes("```") ? "~~~~" : "```";
			return `\n\n${fence}${language === "plaintext" ? "" : language}\n${code}\n${fence}\n\n`;
		},
	});
	service.addRule("table", {
		filter: "table",
		replacement: (_, node) => {
			// The DOM here (domino) returns array-like lists, not iterables.
			const rows = Array.from(node.querySelectorAll("tr"), (row) =>
				Array.from(row.children, (cell) => singleLine(service.turndown(cell.innerHTML)).replaceAll("|", "\\|")),
			);
			if (!rows.length) return "";
			const width = Math.max(...rows.map((row) => row.length));
			const line = (cells) => `| ${Array.from({ length: width }, (_, index) => cells[index] ?? "").join(" | ")} |`;
			return `\n\n${[line(rows[0]), line(Array(width).fill("---")), ...rows.slice(1).map(line)].join("\n")}\n\n`;
		},
	});
	service.addRule("codeTab", {
		filter: (node) => node.getAttribute?.("role") === "tabpanel",
		replacement: (content, node) => {
			const label = node.ownerDocument.getElementById(node.getAttribute("aria-labelledby") ?? "")?.textContent.trim();
			return label ? `\n\n${label}:\n\n${content}\n\n` : `\n\n${content}\n\n`;
		},
	});
	service.addRule("docCard", {
		filter: (node) => node.nodeName === "A" && classes(node).includes("doc-card"),
		replacement: (_, node) => {
			const title = singleLine(node.querySelector(".doc-card__title")?.textContent ?? "");
			const description = singleLine(node.querySelector(".doc-card__desc")?.textContent ?? "");
			return `\n- [${title}](${absolute(node.getAttribute("href"))})${description ? `: ${description}` : ""}\n`;
		},
	});
	service.addRule("link", {
		filter: (node) => node.nodeName === "A" && node.getAttribute("href"),
		replacement: (content, node) => {
			const href = absolute(node.getAttribute("href"));
			// A card link wraps a heading and a summary; list it as "title: summary".
			const heading = node.querySelector("h1, h2, h3, h4, h5, h6");
			if (heading) {
				const summary = Array.from(node.querySelectorAll("p"), (paragraph) => singleLine(paragraph.textContent)).filter(Boolean).join(" ");
				return `\n- [${singleLine(heading.textContent)}](${href})${summary ? `: ${summary}` : ""}\n`;
			}
			const text = singleLine(content);
			const link = text ? `[${text}](${href})` : "";
			return link && classes(node).includes("field-service") ? `\n- ${link}\n` : link;
		},
	});
	service.addRule("image", {
		filter: "img",
		replacement: (_, node) => {
			const alt = singleLine(node.getAttribute("alt") ?? "");
			return alt ? `![${alt}](${absolute(node.getAttribute("src") ?? "")})` : "";
		},
	});
	service.addRule("calloutTitle", {
		filter: (node) => classes(node).includes("callout__title"),
		replacement: (content) => `\n\n**${singleLine(content)}**\n\n`,
	});
	service.addRule("callout", {
		filter: (node) => node.nodeName === "ASIDE" && classes(node).includes("callout"),
		replacement: (content) => `\n\n${content.trim().split("\n").map((line) => (line ? `> ${line}` : ">")).join("\n")}\n\n`,
	});
	service.addRule("term", { filter: "dt", replacement: (content) => `\n- **${singleLine(content)}:** ` });
	service.addRule("definition", { filter: "dd", replacement: (content) => `${singleLine(content)}\n` });
	return service;
}

// Apply a text transform outside fenced code blocks only.
export const outsideCode = (markdown, transform) =>
	markdown
		.split(/(^```[\s\S]*?^```$|^~~~~[\s\S]*?^~~~~$)/m)
		.map((part, index) => (index % 2 ? part : transform(part)))
		.join("");
// Turndown pads list markers to four columns ("-   item"), and block wrappers around
// cards and definition terms leave blank lines between list items; tighten both.
const tidy = (markdown) =>
	outsideCode(markdown.replace(/[ \t]+$/gm, ""), (text) =>
		text
			.replace(/^(\s*)(-|\d+\.) {2,}/gm, "$1$2 ")
			.replace(/\n{3,}/g, "\n\n")
			.replace(/^(- [^\n]+)\n\n(?=- )/gm, "$1\n")
			.replace(/^(- [^\n]+)\n\n(?=- )/gm, "$1\n"),
	)
		.replace(/\n{3,}/g, "\n\n")
		.trim();

export function renderMarkdownTwin(html, page) {
	const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? fail(`${page.file} has no <main>`);
	const canonical = attribute(html, /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/) || `${site}${page.route}`;
	const title = decode(attribute(html, /<title>([^<]*)<\/title>/));
	const description = decode(attribute(html, /<meta\b[^>]*name="description"[^>]*content="([^"]*)"/));
	const declared = attribute(html, /<link\b[^>]*type="text\/markdown"[^>]*href="([^"]+)"/);
	if (declared !== page.twin) fail(`${page.file} declares Markdown twin "${declared}", expected ${page.twin}`);

	const body = tidy(converter(canonical).turndown(main));
	const heading = body.match(/^# .+$/m)?.[0];
	const rest = heading ? tidy(body.replace(heading, "")) : body;
	const intro = [description && `> ${description}`, `> Source: ${canonical}`].filter(Boolean).join("\n>\n");
	return `${heading ?? `# ${title}`}\n\n${intro}\n\n${rest}\n`;
}
