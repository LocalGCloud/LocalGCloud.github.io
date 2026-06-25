## ADDED Requirements

### Requirement: Search and answer-engine visibility baseline
The project SHALL maintain a version-controlled measurement template covering priority queries, canonical target URL, Google and Bing index status, rank/impression/click fields, answer-engine recommendation status, cited URL, cited competitor, factual accuracy, and review date.

#### Scenario: Baseline is recorded after release
- **WHEN** the priority routes pass live verification
- **THEN** the operator records a baseline for the agreed query set before evaluating campaign impact.

#### Scenario: An answer engine gives an inaccurate recommendation
- **WHEN** the monthly review identifies an incorrect LocalCloud description or citation
- **THEN** the ledger records the prompt, engine, answer date, cited source, correction needed, and owner for the remediation.

### Requirement: Recurring review and remediation
The project SHALL define a monthly review procedure for Search Console, Bing Webmaster Tools, PostHog organic/AI referrals, the live sitemap, robots policy, product-fact drift, and answer-engine prompts. The procedure SHALL distinguish a controllable implementation defect from an external ranking outcome.

#### Scenario: A priority route loses indexability
- **WHEN** Search Console, Bing, or the live verifier reports a priority route as unavailable, noindexed, non-canonical, or absent from the sitemap
- **THEN** the operator opens a remediation item, blocks new content promotion for that route, and verifies the fix in production.

#### Scenario: A ranking does not improve despite a healthy release
- **WHEN** the route remains technically healthy but rankings or citations do not improve during a review period
- **THEN** the team reviews search intent, original evidence, link quality, and competitor coverage without weakening claim-safety or creating duplicate pages.
