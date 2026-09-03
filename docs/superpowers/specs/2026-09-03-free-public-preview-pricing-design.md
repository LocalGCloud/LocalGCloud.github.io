# Free Public Preview Pricing Design

**Date:** 2026-09-03
**Status:** Approved

## Goal

Replace the Community/commercial pricing split with one clear public-preview offer: LocalCloud is free for individuals and organizations, including for-profit companies, for non-production development and evaluation workflows.

## Page contract

The existing `/pricing/` route and Pricing navigation item remain. The Workbench visual language remains, but the two-plan comparison is replaced by one full-width preview card.

Required copy:

- Kicker: `Public preview`
- Heading: `Free to use during public preview`
- Audience: individuals, teams, nonprofits, and companies
- Permitted workflow summary: local development, testing, CI, evaluation, and internal pilots
- Access statement: `No payment method or license key required.`
- Actions: `Get started` and `View license`

The page does not show a date, numeric price, commercial tier, contact action, or future-pricing message.

## License contract

The governing license remains proprietary and names **LocalCloud Inc.** as the copyright holder and licensor. It grants every person and organization, including for-profit companies, royalty-free rights to use each preview release for:

- local and internal development;
- testing and quality assurance;
- ongoing internal CI and automation;
- evaluation, proofs of concept, and internal pilots; and
- personal, academic, research, and nonprofit workflows within the same non-production boundary.

Customer-facing production use, resale, hosted or managed service use, redistribution, sublicensing, and other existing proprietary-license restrictions remain excluded. Each version released under the Public Preview License keeps its granted preview rights even if later releases use different terms. Rights can still terminate for breach.

## Runtime contract

Published preview images must start without a license key while retaining production build identity. Build metadata records the public-preview mode explicitly so future paid licensing can be restored deliberately rather than through an implicit development build.

## Consistency and validation

The pricing page, licensing reference, FAQ, agent-facing content, SEO descriptions, distributed LLM documentation, product-fact snapshot, build metadata, and policy validators must state the same boundary. Existing compatibility and real-GCP production-validation warnings remain.
