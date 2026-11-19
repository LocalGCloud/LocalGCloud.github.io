import { comparisonSummary } from "./alternatives.ts";
import { docsContract } from "./docs-contract.ts";
import { freeUseAnswer } from "./faqContent.ts";
import { productFacts } from "./productFacts.ts";
import { latestCliRelease } from "./trust.ts";

// Pre-install questions answered on the homepage, with FAQPage JSON-LD built from the same
// entries. Every answer restates a fact the linked page documents; keep them in step.
// (src/data/faqContent.ts holds the separate /docs/faq/ entries.)

export interface HomepageFaqEntry {
	id: string;
	question: string;
	answer: string;
	links: Array<{ label: string; href: string }>;
	// The comparison question also renders the compact alternatives table.
	showsComparison?: boolean;
}

const telemetryVariable = `${docsContract.privacy.runtimeTelemetry.disableVariable}=false`;
// "Supported hosts: macOS 13+ and Linux with glibc 2.35+ (Ubuntu 22.04 equivalent)." from the release notes.
const supportedHosts = latestCliRelease.summary.match(/Supported hosts: ([^.]+(?:\.\d+[^.]*)*)\./)?.[1];
if (!supportedHosts) throw new Error("src/data/releases.json: the latest CLI release names no supported hosts");

export const homepageFaq: HomepageFaqEntry[] = [
	{
		id: "compare",
		question: "How does LocalCloud compare with LocalStack and Google's own emulators?",
		answer: comparisonSummary.join(" "),
		links: [
			{ label: "Compare emulator features", href: "/compare/emulators/" },
			{ label: "LocalStack for Google Cloud", href: "/localstack-for-google-cloud/" },
		],
		showsComparison: true,
	},
	{
		id: "cost",
		question: "Is LocalCloud free?",
		answer: freeUseAnswer,
		links: [
			{ label: "Pricing", href: productFacts.pricingPath },
			{ label: "License", href: productFacts.licensePath },
		],
	},
	{
		id: "requirements",
		question: "What do I need to run it?",
		answer: `Docker. The CLI runs on ${supportedHosts}, and any Docker host can run the ${productFacts.dockerImageRepository} image directly. The CLI gives the container ${docsContract.product.memory.replace(/g$/i, " GB")} of memory by default; the quick start runs it on localhost-only ports.`,
		links: [
			{ label: "Install the CLI", href: "/docs/#install-the-cli" },
			{ label: "Manual Docker path", href: "/docs/#manual-docker-path" },
		],
	},
	{
		id: "data",
		question: "Does my data leave my machine?",
		answer: `Your service data stays in a Docker volume on your machine. The runtime sends pseudonymous usage and diagnostic reports; set ${telemetryVariable} in the container's environment to stop them. Tools and jobs you connect can still send data elsewhere.`,
		links: [{ label: "Privacy", href: "/docs/privacy/" }],
	},
	{
		id: "agents",
		question: "Can AI coding agents use LocalCloud?",
		answer: 'Yes. Give your coding agent local endpoints for BigQuery, Pub/Sub, Cloud Storage, and more. Calls to those endpoints need no Google Cloud credentials or billing project. Use our agent guide or add the AGENTS.md template to your repository.',
		links: [
			{ label: "Agent guide", href: "/ai/" },
			{ label: "AGENTS.md template", href: "/ai/agent-template.md" },
		],
	},
];

export const homepageFaqSchema = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	mainEntity: homepageFaq.map((entry) => ({
		"@type": "Question",
		name: entry.question,
		acceptedAnswer: { "@type": "Answer", text: entry.answer },
	})),
};
