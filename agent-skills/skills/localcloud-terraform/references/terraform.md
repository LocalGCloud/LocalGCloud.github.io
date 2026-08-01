# Terraform LocalCloud Reference

## Endpoint setup

```bash
eval $(curl -s 'http://localhost:24080/_localcloud/env?format=terraform')
```

This configures `GOOGLE_*_CUSTOM_ENDPOINT` variables for LocalCloud services and sets `GOOGLE_APPLICATION_CREDENTIALS=/dev/null` for local auth bypass.

## Provider pattern

Keep the standard provider:

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

provider "google" {
  project = "local-project"
  region  = "us-central1"
}
```

## Resources documented as good local candidates

- `google_storage_bucket`
- `google_storage_bucket_object`
- `google_pubsub_topic`
- `google_pubsub_subscription`
- `google_bigquery_dataset`
- `google_bigquery_table`
- `google_spanner_instance`
- `google_spanner_database`

## Resources to flag before use

- `google_secret_manager_secret`, `google_secret_manager_secret_version`, and `google_cloud_tasks_queue` may be partial.
- `google_project`, `google_project_iam_*`, `google_service_account`, `google_dns_*`, `google_sql_*`, and networking resources are not local validation targets unless docs change.

## Acceptance criteria

- Existing Terraform provider stays `hashicorp/google`.
- No real service-account key is introduced.
- LocalCloud endpoint variables are scoped to local validation jobs.
- Destroy or reset guidance is included for resources created by tests.
