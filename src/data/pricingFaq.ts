import { productFacts } from "./productFacts.ts";
import { proTierLabel, services } from "./services.ts";

// Pro-tier services that run locally, in catalog order, from the documentation contract.
export const proTierServiceNames = services
	.filter((service) => service.minTier === "pro" && service.marketingStatus === "supported" && service.catalogState === "available")
	.map((service) => service.name);

const listNames = (names: string[]) =>
	names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;

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
		id: "pro-tier",
		question: "Are Pro-tier services free?",
		answer: `Yes. ${listNames(proTierServiceNames)} are Pro-tier services, and they are free during the public preview: preview releases run them with no payment method or license key. Service pages and docs mark them "${proTierLabel}".`,
		source: { label: "Service catalog", href: "/services/" },
	},
	{
		id: "preview-end",
		question: "What happens when the public preview ends?",
		answer: "LocalCloud Inc. may end or extend the public preview, and may offer later releases under different terms. Those terms apply only when you accept them or obtain a release under them. The license doesn't set a notice period; instead, every preview release you already have stays licensed under its terms after the preview ends.",
		source: { label: "License, Sections 2.3 and 8.4", href: `${productFacts.licensePath}#8-term-and-termination` },
	},
	{
		id: "preview-terms",
		question: "Do preview releases keep their terms?",
		answer: "Yes. Each release you obtain under the Public Preview License stays licensed under it, even if the preview ends or a later version ships under different terms. LocalCloud Inc. will not retroactively replace the agreement for a release you already have; the license can still end if its terms are breached.",
		source: { label: "License, Section 2.3", href: `${productFacts.licensePath}#2-grant-of-license` },
	},
	{
		id: "open-source",
		question: "Do open-source projects stay free?",
		answer: "Yes. Under the Free for open-source projects policy, contributors and maintainers can use LocalCloud free of charge for development, testing, and their project's ongoing internal CI. The policy is ongoing and continues after the public preview ends.",
		source: { label: "Licensing summary", href: `${productFacts.licensingPath}#free-for-open-source-projects` },
	},
];
