## 1. Project Setup & Infrastructure

- [x] 1.1 Remove VitePress scaffold (docs/.vitepress, docs/index.md, docs/guide/) and update package.json
- [x] 1.2 Initialize Astro 4+ project with TypeScript, MDX, and sitemap integrations
- [x] 1.3 Install and configure Tailwind CSS v4 with Astro integration
- [x] 1.4 Set up project structure: src/layouts/, src/components/, src/pages/, src/content/, src/data/, src/styles/
- [x] 1.5 Configure astro.config.mjs with base path, site URL, and integrations
- [x] 1.6 Update .github/workflows/deploy.yml for Astro build and GitHub Pages deployment

## 2. Design System Foundation

- [x] 2.1 Create CSS custom properties file with color tokens (dark/light themes), typography scale, spacing system, and animation primitives
- [x] 2.2 Configure Tailwind theme extension to reference CSS custom property tokens
- [x] 2.3 Set up font loading: Inter (variable), JetBrains Mono with font-display swap and preload
- [x] 2.4 Create base layout component (BaseLayout.astro) with HTML head, meta defaults, font links, and dark theme class
- [x] 2.5 Implement theme toggle (dark/light) with localStorage persistence and prefers-color-scheme detection

## 3. Core Components

- [x] 3.1 Build Button component (primary/gradient, secondary/outline, ghost variants)
- [x] 3.2 Build Card component with glassmorphism styling (backdrop-blur, semi-transparent bg, subtle border)
- [x] 3.3 Build CodeBlock component with syntax highlighting (shiki), copy-to-clipboard, language label, and optional line numbers
- [x] 3.4 Build multi-tab CodeTabs component for showing code in multiple languages
- [x] 3.5 Build Badge component for service status, protocol type, and emulation type indicators
- [x] 3.6 Build ServiceCard component (name, icon, protocol, port, emulation type)

## 4. Navigation & Layout

- [x] 4.1 Build site header with logo/wordmark, nav links (Features, Services, Docs, GitHub), and frosted glass backdrop-blur styling
- [x] 4.2 Implement mobile hamburger menu with animated toggle and slide-out nav
- [x] 4.3 Build footer component with project links, Proprietary license text, and author attribution
- [x] 4.4 Create marketing page layout (full-width sections, 1280px content max-width)
- [x] 4.5 Create documentation page layout with sidebar navigation (960px content max-width)

## 5. Landing Page

- [x] 5.1 Build hero section with gradient text headline, subheadline, primary CTA (Get Started), secondary CTA (GitHub), and fade-in animation
- [x] 5.2 Build quickstart section with styled terminal showing docker run command, eval env command, and sample API call with copy buttons
- [x] 5.3 Build service grid section displaying all 15 services in responsive card grid
- [x] 5.4 Build feature highlights section with 4+ glassmorphism cards (zero code changes, single container, offline dev, cost savings)
- [x] 5.5 Build comparison section positioning LocalCloud vs LocalStack (GCP vs AWS)
- [x] 5.6 Wire up scroll-reveal animations with IntersectionObserver and prefers-reduced-motion support

## 6. Services Data & Catalog

- [x] 6.1 Create services.yaml data file with all 15 services (name, slug, port, protocol, type, enabled, supported features, unsupported features, env_var, description)
- [x] 6.2 Define Astro content collection schema for services data with build-time validation
- [x] 6.3 Build /services catalog page with filterable grid (filter by emulation type and protocol)
- [x] 6.4 Build /services/[slug] dynamic pages with connection info, support matrix table, quickstart snippet, and GCP docs links

## 7. Documentation Content

- [x] 7.1 Create docs content collection with MDX frontmatter schema (title, description, order, section)
- [x] 7.2 Build documentation sidebar component with collapsible sections, active page highlighting, and mobile collapse
- [x] 7.3 Write Getting Started guide (/docs/) — prerequisites, installation, starting, env setup, first API call
- [x] 7.4 Write CLI Reference page (/docs/cli) — all commands with syntax, flags, defaults, examples
- [x] 7.5 Write Configuration page (/docs/configuration) — all environment variables with types, defaults, descriptions
- [x] 7.6 Write Seed Data page (/docs/seed-data) — YAML format, per-service seed structure, complete example
- [x] 7.7 Write SDK Examples page (/docs/sdk-examples) — Python, Node.js, Go, Java snippets for GCS, Pub/Sub, BigQuery
- [x] 7.8 Write Architecture page (/docs/architecture) — container internals diagram, gateway, emulators, facades, ports
- [x] 7.9 Write FAQ page (/docs/faq) — common questions about compatibility, performance, limitations

## 8. SEO & Performance

- [x] 8.1 Add SEO component with page-specific title, meta description, OG tags, Twitter cards, and canonical URLs
- [ ] 8.2 Create OG image for landing page (LocalCloud logo + tagline)
- [x] 8.3 Optimize asset loading: font subsetting, image optimization, critical CSS inlining
- [ ] 8.4 Run Lighthouse audit and fix any issues to achieve 95+ across all categories

## 9. Responsive & Polish

- [ ] 9.1 Test and fix all pages across breakpoints: mobile (375px), tablet (768px), desktop (1280px), wide (1920px)
- [ ] 9.2 Verify no horizontal scrolling at any viewport width
- [ ] 9.3 Test keyboard navigation and focus states across all interactive elements
- [ ] 9.4 Final visual QA pass — spacing consistency, color token usage, animation smoothness

## 10. Content Realignment

- [x] 10.1 Reframe homepage messaging around major Google Cloud services, the support line, and sub-1-minute boot messaging instead of exact service-count marketing
- [x] 10.2 Rework the homepage Service Atlas and `/services` catalog around Google Cloud-style product categories
- [x] 10.3 Keep implementation provenance off the main marketing/catalog surfaces and move it to per-service detail pages
- [x] 10.4 Align docs copy with upstream LocalCloud positioning while keeping `jaysen2apache/localcloud` as the referenced image path
- [x] 10.5 Run a consistency sweep for outdated wording, boot-time claims, and leftover implementation-bucket language
