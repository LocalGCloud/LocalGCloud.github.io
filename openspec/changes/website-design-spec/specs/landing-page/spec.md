## ADDED Requirements

### Requirement: Hero section with value proposition
The landing page SHALL display a hero section as the first visible content. The hero SHALL include: a headline communicating "Google Cloud Platform — in a box", a subheadline explaining that LocalCloud runs 15 GCP services locally in a single Docker container, a primary CTA button ("Get Started") linking to the quickstart docs, and a secondary CTA ("View on GitHub") linking to the repository. The hero SHALL use gradient text treatment on the headline (indigo-to-violet gradient).

#### Scenario: First-time visitor sees hero
- **WHEN** a user navigates to the root URL
- **THEN** the hero section is visible above the fold with headline, subheadline, and both CTA buttons

#### Scenario: Hero CTA navigation
- **WHEN** a user clicks the "Get Started" button
- **THEN** the user is navigated to the /docs/ getting started page

### Requirement: Quickstart code snippet
The landing page SHALL display a quickstart section showing the single `docker run` command needed to start LocalCloud. The snippet SHALL be presented in a styled terminal/code block with a copy-to-clipboard button. Below the docker command, it SHALL show the `eval $(localcloud env)` command and a sample SDK call.

#### Scenario: Copy quickstart command
- **WHEN** a user clicks the copy button on the docker run snippet
- **THEN** the full command is copied to the clipboard and visual feedback confirms the copy

### Requirement: Service grid overview
The landing page SHALL display a grid of all 15 emulated GCP services. Each service card SHALL show the service name, an icon or badge, its protocol (gRPC/REST/RESP2), and its port number. Cards for services with full emulation (external emulators) SHALL be visually distinguished from facade services.

#### Scenario: All services visible
- **WHEN** a user scrolls to the service grid section
- **THEN** all 15 GCP services are displayed in a responsive grid layout

#### Scenario: Service card links to detail
- **WHEN** a user clicks on a service card (e.g., BigQuery)
- **THEN** the user is navigated to /services/bigquery

### Requirement: Feature highlights section
The landing page SHALL include a feature highlights section with at least 4 key selling points: zero code changes (env var only), single Docker container, offline development (no cloud credentials), and cost savings. Each feature SHALL have an icon, title, and 1-2 sentence description. Features SHALL be displayed in glassmorphism cards with subtle backdrop blur.

#### Scenario: Features are scannable
- **WHEN** a user views the feature highlights section
- **THEN** all feature cards are visible with icons, titles, and descriptions in a grid layout

### Requirement: Comparison positioning
The landing page SHALL include a brief comparison section positioning LocalCloud as "LocalStack for Google Cloud" with a side-by-side or table showing: LocalStack → AWS, LocalCloud → GCP. This section SHALL communicate that teams using GCP now have an equivalent local development experience.

#### Scenario: Comparison is clear
- **WHEN** a user views the comparison section
- **THEN** the LocalStack/AWS vs LocalCloud/GCP positioning is immediately understandable

### Requirement: Navigation header
The site SHALL have a fixed navigation header with: logo/wordmark (left), navigation links (Features, Services, Docs, GitHub), and a mobile hamburger menu. The header SHALL use a frosted glass effect (backdrop-blur) with a dark semi-transparent background.

#### Scenario: Desktop navigation
- **WHEN** a user views the site on a viewport wider than 768px
- **THEN** all navigation links are visible in the header bar

#### Scenario: Mobile navigation
- **WHEN** a user views the site on a viewport narrower than 768px
- **THEN** navigation links are hidden behind a hamburger menu icon that toggles a mobile menu

### Requirement: Footer
The landing page SHALL include a footer with: project links (Docs, GitHub, License), the Proprietary — free for personal/evaluation use license text, and author attribution. The footer SHALL span the full width of the page.

#### Scenario: Footer links work
- **WHEN** a user clicks "GitHub" in the footer
- **THEN** the user is navigated to the LocalCloud GitHub repository
