import { docsContract } from './docs-contract';
import { agenticFacts } from './agenticFacts';

// These use the same endpoint and configuration contract as the SDK guide.
export const agentModeExamples = [
  { id: 'setup', label: 'setup.sh', language: 'bash', code: agenticFacts.cliQuickStart.script },
  { id: 'python', label: 'assert_query.py', language: 'python', code: `# First export endpoints: eval "$(localcloud env)"
import os
from google.auth.credentials import AnonymousCredentials
from google.cloud import bigquery

with bigquery.Client(
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    credentials=AnonymousCredentials(),
    client_options={"api_endpoint": os.environ["BIGQUERY_EMULATOR_HOST"]},
) as client:
    rows = list(client.query("SELECT 1 AS ok").result(timeout=30))
    assert rows[0].ok == 1` },
  { id: 'config', label: 'localcloud.yaml', language: 'yaml', code: `version: 1
context:
  project: ${docsContract.product.defaultProject}
services:
  enabled:
    - bigquery
    - gcs
    - pubsub

# Start from this directory:
# localcloud start --local-only` },
] as const;
