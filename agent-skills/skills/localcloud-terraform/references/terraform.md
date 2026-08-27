# Terraform LocalCloud reference

## Endpoint-only setup

Configure Terraform mode in the runtime before it starts:

```yaml
# localcloud.yaml
version: 1
host:
  environment:
    LOCALCLOUD_TERRAFORM_MODE: "true"
```

```bash
localcloud start
eval "$(localcloud env --format terraform)"
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/.localcloud/fake-service-account.json"
curl -fsS http://localhost:24080/terraform/readiness?mode=endpoint
```

The CLI can remap the gateway port; use its actual readiness URL. Provider v7 requires valid fake service-account JSON, not `/dev/null`.

## Provider pattern

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = "local-gcp-project"
  region  = "us-central1"
}
```

## Transparent mode

BigQuery and some provider paths ignore custom endpoint variables. Configure transparent routing and Terraform mode before startup:

```yaml
# localcloud.yaml
version: 1
host:
  transparent_network: true
  environment:
    LOCALCLOUD_TERRAFORM_MODE: "true"
tls:
  enabled: true
  port: 24443
```

Transparent mode also requires explicit LocalCloud DNS/HTTP/HTTPS routing, a trusted LocalCloud CA, and:

```bash
curl -fsS http://localhost:24080/terraform/readiness?mode=transparent
```

## Currently supported resources

- `google_project`
- `google_secret_manager_secret`
- `google_secret_manager_secret_version`
- `google_cloud_tasks_queue`
- `google_sql_database_instance`
- `google_sql_database`
- `google_sql_user`

Do not treat other resources as supported without a documented provider-version and routing-mode result.

## Endpoint details

- Storage includes `/storage/v1/`.
- Pub/Sub and Bigtable Terraform endpoints use gateway port `24080`.
- Spanner uses `http://localhost:24086/v1/`; this is REST, not PostgreSQL wire.
- Cloud Tasks uses `/v2/`.
- All generated Terraform endpoints end in `/`.
- BigQuery requires transparent routing despite its generated custom endpoint.

Use isolated state/backend, destroy local resources, and perform production validation separately in a clean environment.
