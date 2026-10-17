import { availableServiceCount } from './services';
import { docsContract } from './docs-contract';
import { agenticFacts } from './agenticFacts';

// The browser overview and /ai/overview.md share this content and these examples.
export const agentOverview = {
  title: 'localcloud is cloud for agents.',
  description: 'LocalCloud runs Google Cloud-compatible services locally for development, integration tests, and CI. Connect your existing SDKs through local endpoints, or use the LocalCloud MCP server. No Google Cloud account or credentials are required for local workflows.',
  facts: [
    { label: 'runtime', value: 'one Docker container' },
    { label: 'services', value: `${availableServiceCount} local service APIs` },
    { label: 'connect', value: 'Google Cloud SDKs / stdio MCP' },
    { label: 'scope', value: 'development / tests / CI' },
  ],
  context: 'Inspect the repository and its existing agent instructions. Identify the Google Cloud services, client libraries, and tests it uses, then choose the matching service guides before changing application logic.',
  prerequisites: `Requires Docker running and the latest LocalCloud CLI. Install the CLI once with ${agenticFacts.cliQuickStart.install}, or follow the setup guide. Skip installation when localcloud --version already works. If the installer prints a source command, run it before continuing.`,
  routes: [
    { title: 'Choose services', href: 'services/', description: 'Find service purposes, exact IDs, startup requirements, and client examples.' },
    { title: 'Integrate a repository', href: 'docs/', description: 'Configure SDKs, MCP, Terraform, CI, and test fixtures.' },
    { title: 'Connect through MCP', href: 'docs/mcp/', description: 'Use the LocalCloud CLI as a stdio MCP server in a coding client.' },
  ],
  scope: 'Use LocalCloud for development, tests, and CI. If Docker or LocalCloud is unavailable, report the blocker instead of switching to real Google Cloud. Validate production endpoints, authentication, IAM, quotas, and regional behavior against Google Cloud before release.',
  references: [
    { title: 'Agent instructions', href: 'ai/agents.md' },
    { title: 'Service connection reference', href: 'ai/services.md' },
    { title: 'Capabilities and boundaries', href: 'ai/compatibility.md' },
    { title: 'Documentation index', href: 'llms.txt' },
    { title: 'License', href: 'license/' },
  ],
};

export interface AgentModeExample {
  id: 'config' | 'setup' | 'python';
  title: string;
  description: string;
  result: string;
  label: string;
  language: string;
  code: string;
  setup?: string;
  run?: string;
}

export const agentModeExamples: readonly AgentModeExample[] = [
  { id: 'config', title: 'Select the project and services', label: 'localcloud.yaml', language: 'yaml',
    description: 'For a new example directory, save this as localcloud.yaml before starting. In an existing repository, merge the relevant settings into its configuration. This example selects BigQuery, Cloud Storage, and Pub/Sub; adapt the exact service IDs to your project.',
    result: 'The configuration includes every service your application needs. Firestore, GKE, and Cloud Run are opt-in.',
    code: `version: 1
context:
  project: ${docsContract.product.defaultProject}
services:
  enabled:
    - bigquery
    - gcs
    - pubsub` },
  { id: 'setup', title: 'Start or reuse the local runtime', label: 'setup.sh', language: 'bash',
    description: 'Run from the configured directory. Start waits for readiness and can reuse the matching runtime. Export its actual mapped endpoints in the same shell or test runner that launches your SDK; do not assume the default ports are available.',
    result: 'Startup succeeds and the SDK environment points to the selected local runtime. Inspect localcloud status --verbose if startup or endpoint discovery fails.',
    // The start command waits for readiness; omit the default-port probe and browser launch.
    code: agenticFacts.cliQuickStart.steps.filter(line => line !== agenticFacts.cliQuickStart.readiness && line !== 'localcloud console').join('\n') },
  { id: 'python', title: 'Verify a local SDK call', label: 'assert_query.py', language: 'python',
    description: 'Python · BigQuery. Install the client in an isolated environment, save this file, then execute a constant query through the generated local endpoint. This verifies SDK routing without creating persistent resources.',
    setup: 'python3 -m venv .venv\nsource .venv/bin/activate\npython -m pip install google-cloud-bigquery',
    run: 'python assert_query.py', result: 'The assertion passes, the command prints ok=1, and no test resources need cleanup.',
    code: `# First export endpoints: eval "$(localcloud env)"
import os
from google.auth.credentials import AnonymousCredentials
from google.cloud import bigquery

with bigquery.Client(
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    credentials=AnonymousCredentials(),
    client_options={"api_endpoint": os.environ["BIGQUERY_EMULATOR_HOST"]},
) as client:
    rows = list(client.query("SELECT 1 AS ok").result(timeout=30))
    assert rows[0].ok == 1
    print("ok=1")` },
];

const site = 'https://local.cloud/';
const link = (item: { title: string; href: string }) => `[${item.title}](${site}${item.href})`;
const fence = (code: string, language: string) => `\`\`\`${language}\n${code}\n\`\`\``;
export const agentOverviewMarkdown = `# ${agentOverview.title}

${agentOverview.description}

${agentOverview.facts.map(item => `- **${item.label}**: ${item.value}`).join('\n')}

Source: ${site}?audience=agents

## Choose your next step
${agentOverview.routes.map(item => `- ${link(item)}: ${item.description}`).join('\n')}

## Start with repository context
${agentOverview.context}

Read ${site}ai/agents.md. Merge relevant guidance from ${site}ai/agent-template.md into existing repository instructions; preserve the project's own rules.

## Prerequisites
${agentOverview.prerequisites}

Setup guide: ${site}docs/#install-the-cli

${agentModeExamples.map(example => `## ${example.title}\n\n${example.description}\n\n${example.setup ? `### SDK dependencies\n\n${fence(example.setup, 'bash')}\n\n` : ''}### ${example.label}\n\n${fence(example.code, example.language)}\n\n${example.run ? `### Run the example\n\n${fence(example.run, 'bash')}\n\n` : ''}Expected result: ${example.result}`).join('\n\n')}

## Scope and references
${agentOverview.scope}

${agentOverview.references.map(item => `- ${link(item)}`).join('\n')}
`;
