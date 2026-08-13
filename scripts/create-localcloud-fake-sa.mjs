#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [keyPath, outputPath] = process.argv.slice(2);
if (!keyPath || !outputPath) {
  console.error('Usage: node scripts/create-localcloud-fake-sa.mjs <private-key.pem> <output.json>');
  process.exit(2);
}

let privateKey;
try {
  privateKey = await readFile(resolve(keyPath), 'utf8');
} catch (error) {
  throw new Error(`Could not read fake private key at ${keyPath}`, { cause: error });
}

const credential = {
  type: 'service_account',
  project_id: 'local-gcp-project',
  private_key_id: 'localcloud-fake-key',
  private_key: privateKey,
  client_email: 'developer@localcloud.iam.gserviceaccount.com',
  client_id: '123456',
  auth_uri: 'http://localhost:24080/oauth2/auth',
  token_uri: 'http://localhost:24080/oauth2/token',
  auth_provider_x509_cert_url: 'http://localhost:24080/oauth2/v1/certs',
  client_x509_cert_url: 'http://localhost:24080/robot/v1/metadata/x509/developer%40localcloud.iam.gserviceaccount.com',
};

await writeFile(resolve(outputPath), `${JSON.stringify(credential, null, 2)}\n`, { mode: 0o600 });
