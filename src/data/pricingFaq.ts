import { freeUsePolicy, productFacts } from "./productFacts.ts";
import { includedServicesAnswer, includedServicesQuestion } from "./faqContent.ts";

export interface PricingFaqEntry {
	id: string;
	question: string;
	answer: string;
	source: { label: string; href: string };
}

// Each answer states only what the license (src/data/legal/public-preview-license.txt) and the
// licensing summary (src/pages/docs/licensing.mdx) say.
export const pricingFaq: PricingFaqEntry[] = [
	{
		// Keep the old fragment working for links to this answer.
		id: "pro-tier",
		question: includedServicesQuestion,
		answer: includedServicesAnswer,
		source: { label: "Service catalog", href: "/services/" },
	},
	{
		id: "preview-end",
		question: "What happens when the public preview ends?",
		answer: `${freeUsePolicy.continuity} Other organizational use may be offered under different terms. The license supplied with each release governs that release; releases you already have keep their preview terms.`,
		source: { label: "License, Sections 2.3 and 8.4", href: `${productFacts.licensePath}#8-term-and-termination` },
	},
	{
		id: "preview-terms",
		question: "Do preview releases keep their terms?",
		answer: "Yes. Each release you obtain under the Public Preview License stays licensed under it, even if the preview ends or a later version ships under different terms. LocalCloud Inc. will not retroactively replace the agreement for a release you already have; the license can still end if its terms are breached.",
		source: { label: "License, Section 2.3", href: `${productFacts.licensePath}#2-grant-of-license` },
	},
	{
		id: "individual-developers",
		question: "Can individual developers use LocalCloud for private or work projects?",
		answer: freeUsePolicy.eligibility,
		source: { label: "Free-use eligibility", href: `${productFacts.licensingPath}#free-for-open-source-projects` },
	},
	{
		id: "open-source",
		question: "Do open-source projects stay free?",
		answer: "Yes. Contributors and maintainers can use LocalCloud for project development, testing, and ongoing CI without LocalCloud fees. Company-sponsored open-source projects are included. CI runner and local compute costs still apply.",
		source: { label: "Licensing summary", href: `${productFacts.licensingPath}#free-for-open-source-projects` },
	},
];
