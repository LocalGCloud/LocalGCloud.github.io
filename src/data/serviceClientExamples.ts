export interface ServiceCodeExample {
  title: string;
  label: string;
  description: string;
  summary: string;
  code: string;
  environment?: string;
  filename?: string;
  setup?: string;
  run?: string;
  href?: string;
  output?: string;
}

const javaSetup = (artifact: string, version: string) => `cat > pom.xml <<'XML'
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId><artifactId>local-example</artifactId><version>1</version>
  <dependencies><dependency>
    <groupId>com.google.cloud</groupId><artifactId>google-cloud-${artifact}</artifactId><version>${version}</version>
  </dependency></dependencies>
</project>
XML
mvn -q dependency:build-classpath -Dmdep.outputFile=classpath.txt`;

const javaSdkExamples: Record<string, ServiceCodeExample> = {
  cloudtasks: {
    title: 'List local task queues', label: 'Java',
    summary: 'List the queues that hold deferred work; Cloud Tasks controls how requests reach your background handlers.',
    description: 'Use the Cloud Tasks SDK over the local gRPC endpoint with a plaintext channel and no credentials. Requires JDK 17+ and Maven.',
    setup: javaSetup('tasks', '2.99.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java',
    code: `import com.google.api.gax.core.NoCredentialsProvider;
import com.google.api.gax.grpc.GrpcTransportChannel;
import com.google.api.gax.rpc.FixedTransportChannelProvider;
import com.google.cloud.tasks.v2.*;
import io.grpc.ManagedChannelBuilder;
import java.util.Objects;

public class Hello {
  public static void main(String[] args) throws Exception {
    var host = Objects.requireNonNull(System.getenv("CLOUD_TASKS_EMULATOR_HOST"));
    var project = Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT"));
    var channel = ManagedChannelBuilder.forTarget(host).usePlaintext().build();
    var settings = CloudTasksSettings.newBuilder()
        .setTransportChannelProvider(FixedTransportChannelProvider.create(GrpcTransportChannel.create(channel)))
        .setCredentialsProvider(NoCredentialsProvider.create()).build();
    try (var client = CloudTasksClient.create(settings)) {
      for (var queue : client.listQueues("projects/" + project + "/locations/us-central1").iterateAll()) {
        System.out.println(queue.getName());
      }
    } finally {
      channel.shutdownNow();
    }
  }
}`,
  },
  cloudrun: {
    title: 'List local container services', label: 'Java',
    summary: 'List deployed container services; Cloud Run turns an application image into an HTTP endpoint.',
    description: 'Use the Cloud Run SDK over the local gRPC endpoint with a plaintext channel and no credentials. Requires JDK 17+ and Maven.',
    setup: javaSetup('run', '0.99.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java',
    code: `import com.google.api.gax.core.NoCredentialsProvider;
import com.google.api.gax.grpc.GrpcTransportChannel;
import com.google.api.gax.rpc.FixedTransportChannelProvider;
import com.google.cloud.run.v2.*;
import io.grpc.ManagedChannelBuilder;
import java.util.Objects;

public class Hello {
  public static void main(String[] args) throws Exception {
    var host = Objects.requireNonNull(System.getenv("CLOUD_RUN_EMULATOR_HOST"));
    var project = Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT"));
    var channel = ManagedChannelBuilder.forTarget(host).usePlaintext().build();
    var settings = ServicesSettings.newBuilder()
        .setTransportChannelProvider(FixedTransportChannelProvider.create(GrpcTransportChannel.create(channel)))
        .setCredentialsProvider(NoCredentialsProvider.create()).build();
    try (var client = ServicesClient.create(settings)) {
      for (var service : client.listServices("projects/" + project + "/locations/us-central1").iterateAll()) {
        System.out.println(service.getName());
      }
    } finally {
      channel.shutdownNow();
    }
  }
}`,
  },
  gcs: {
    title: 'Upload and download an object', label: 'Java',
    summary: 'Upload and read back a text object; Cloud Storage gives application files a durable bucket-and-object interface.',
    description: 'Use the Storage SDK with the generated HTTP endpoint and local anonymous credentials. Requires JDK 17+ and Maven.',
    setup: javaSetup('storage', '2.75.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java', output: 'Hello from LocalCloud!',
    code: `import com.google.cloud.NoCredentials;
import com.google.cloud.storage.*;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;

public class Hello {
  public static void main(String[] args) {
    var endpoint = Objects.requireNonNull(System.getenv("STORAGE_EMULATOR_HOST"));
    var storage = StorageOptions.newBuilder()
        .setProjectId(Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT")))
        .setHost(endpoint).setCredentials(NoCredentials.getInstance()).build().getService();
    var bucket = storage.create(BucketInfo.of("example-" + UUID.randomUUID()));
    var object = BlobId.of(bucket.getName(), "hello.txt");
    try {
      storage.create(BlobInfo.newBuilder(object).build(),
          "Hello from LocalCloud!".getBytes(StandardCharsets.UTF_8));
      System.out.println(new String(storage.readAllBytes(object), StandardCharsets.UTF_8));
    } finally {
      storage.delete(object);
      storage.delete(bucket.getName());
    }
  }
}`,
  },
  pubsub: {
    title: 'Create a topic and publish a message', label: 'Java',
    summary: 'Publish a message to a new topic; Pub/Sub lets producers send events independently of their consumers.',
    description: 'Java needs an explicit plaintext channel and no-credentials provider. Requires JDK 17+ and Maven.',
    setup: javaSetup('pubsub', '1.157.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java',
    code: `import com.google.api.gax.core.NoCredentialsProvider;
import com.google.api.gax.grpc.GrpcTransportChannel;
import com.google.api.gax.rpc.FixedTransportChannelProvider;
import com.google.cloud.pubsub.v1.*;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.*;
import io.grpc.ManagedChannelBuilder;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

public class Hello {
  public static void main(String[] args) throws Exception {
    var host = Objects.requireNonNull(System.getenv("PUBSUB_EMULATOR_HOST"));
    var project = Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT"));
    var channel = ManagedChannelBuilder.forTarget(host).usePlaintext().build();
    var transport = FixedTransportChannelProvider.create(GrpcTransportChannel.create(channel));
    var credentials = NoCredentialsProvider.create();
    var settings = TopicAdminSettings.newBuilder()
        .setTransportChannelProvider(transport).setCredentialsProvider(credentials).build();
    try (var topics = TopicAdminClient.create(settings)) {
      var topic = TopicName.of(project, "example-" + UUID.randomUUID());
      topics.createTopic(topic);
      try {
        var publisher = Publisher.newBuilder(topic)
            .setChannelProvider(transport).setCredentialsProvider(credentials).build();
        try {
          var message = PubsubMessage.newBuilder()
              .setData(ByteString.copyFromUtf8("Hello from LocalCloud!")).build();
          System.out.println(publisher.publish(message).get(30, TimeUnit.SECONDS));
        } finally {
          publisher.shutdown();
          publisher.awaitTermination(30, TimeUnit.SECONDS);
        }
      } finally {
        topics.deleteTopic(topic);
      }
    } finally {
      channel.shutdownNow();
    }
  }
}`,
  },
  firestore: {
    title: 'Write and read a document', label: 'Java',
    summary: 'Write and retrieve a document; Firestore stores flexible application records in collections.',
    description: 'The Firestore client reads FIRESTORE_EMULATOR_HOST. Firestore must be enabled in your running instance. Requires JDK 17+ and Maven.',
    setup: javaSetup('firestore', '3.49.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java', output: 'Hello from LocalCloud!',
    code: `import com.google.cloud.firestore.FirestoreOptions;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public class Hello {
  public static void main(String[] args) throws Exception {
    var host = Objects.requireNonNull(System.getenv("FIRESTORE_EMULATOR_HOST"));
    var options = FirestoreOptions.newBuilder()
        .setProjectId(Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT")))
        .setEmulatorHost(host).build();
    try (var database = options.getService()) {
      var document = database.collection("examples").document(UUID.randomUUID().toString());
      try {
        document.set(Map.of("message", "Hello from LocalCloud!")).get();
        System.out.println(document.get().get().getString("message"));
      } finally {
        document.delete().get();
      }
    }
  }
}`,
  },
  bigtable: {
    title: 'List local Bigtable instances', label: 'Java',
    summary: 'List database instances; Bigtable organizes large datasets for fast row-key lookups and range scans.',
    description: 'The Bigtable Java client detects BIGTABLE_EMULATOR_HOST automatically. Requires JDK 17+ and Maven.',
    setup: javaSetup('bigtable', '2.85.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java',
    code: `import com.google.cloud.bigtable.admin.v2.BigtableInstanceAdminClient;
import com.google.cloud.bigtable.admin.v2.BigtableInstanceAdminSettings;
import java.util.Objects;

public class Hello {
  public static void main(String[] args) throws Exception {
    Objects.requireNonNull(System.getenv("BIGTABLE_EMULATOR_HOST"));
    var settings = BigtableInstanceAdminSettings.newBuilder()
        .setProjectId(Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT"))).build();
    try (var client = BigtableInstanceAdminClient.create(settings)) {
      for (var instance : client.listInstances()) {
        System.out.println(instance.getId());
      }
    }
  }
}`,
  },
  spanner: {
    title: 'List local Spanner instances', label: 'Java',
    summary: 'List database instances; Spanner groups relational databases that provide SQL queries and consistent transactions.',
    description: 'Configure the generated emulator endpoint on the Spanner client. Requires JDK 17+ and Maven.',
    setup: javaSetup('spanner', '6.124.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java',
    code: `import com.google.cloud.spanner.SpannerOptions;
import java.util.Objects;

public class Hello {
  public static void main(String[] args) {
    var options = SpannerOptions.newBuilder()
        .setProjectId(Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT")))
        .setEmulatorHost(Objects.requireNonNull(System.getenv("SPANNER_EMULATOR_HOST"))).build();
    try (var spanner = options.getService()) {
      for (var instance : spanner.getInstanceAdminClient().listInstances().iterateAll()) {
        System.out.println(instance.getId().getInstance());
      }
    }
  }
}`,
  },
  bigquery: {
    title: 'Run a GoogleSQL query', label: 'Java',
    summary: 'Run a SQL query and read its result; BigQuery lets analytical code transform and summarize datasets.',
    description: 'BigQuery needs an explicit HTTP endpoint and local anonymous credentials. Requires JDK 17+ and Maven.',
    setup: javaSetup('bigquery', '2.73.0'), filename: 'Hello.java',
    run: 'java --class-path "$(cat classpath.txt)" Hello.java', output: 'Hello from LocalCloud!',
    code: `import com.google.cloud.NoCredentials;
import com.google.cloud.bigquery.*;
import java.util.Objects;

public class Hello {
  public static void main(String[] args) throws Exception {
    var client = BigQueryOptions.newBuilder()
        .setProjectId(Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT")))
        .setHost(Objects.requireNonNull(System.getenv("BIGQUERY_EMULATOR_HOST")))
        .setCredentials(NoCredentials.getInstance()).build().getService();
    var query = QueryJobConfiguration.newBuilder("SELECT 'Hello from LocalCloud!' AS message")
        .setUseLegacySql(false).build();
    var job = client.create(JobInfo.of(query)).waitFor();
    for (var row : job.getQueryResults().iterateAll()) {
      System.out.println(row.get("message").getStringValue());
    }
  }
}`,
  },
};

// Gateway REST examples use its generated HTTP address, not a dedicated gRPC port.
const gatewayExamples: Record<string, { title: string; summary: string; path: string; api?: string; command?: string; body?: string }> = {
  secretmanager: { title: 'List secrets', summary: 'List stored secrets; Secret Manager separates versioned credentials and configuration from application code.', path: '/v1/projects/PROJECT/secrets', api: 'secretmanager', command: 'gcloud secrets list' },
  cloudscheduler: { title: 'List scheduled jobs', summary: 'List scheduled jobs; Cloud Scheduler triggers recurring application work on a cron schedule.', path: '/v1/projects/PROJECT/locations/us-central1/jobs', api: 'cloudscheduler', command: 'gcloud scheduler jobs list --location=us-central1' },
  cloudfunctions: { title: 'List registered functions', summary: 'List registered handlers; Cloud Functions connects small functions to HTTP requests and events.', path: '/v1/projects/PROJECT/locations/us-central1/functions' },
  alloydb: { title: 'List database clusters', summary: 'List database clusters; AlloyDB gives PostgreSQL applications a managed relational database model.', path: '/v1/projects/PROJECT/locations/us-central1/clusters', api: 'alloydb', command: 'gcloud alloydb clusters list --region=us-central1' },
  dataproc: { title: 'List submitted jobs', summary: 'List submitted jobs; Dataproc runs Spark and Hadoop transformations over your datasets.', path: '/v1/projects/PROJECT/regions/us-central1/jobs', api: 'dataproc', command: 'gcloud dataproc jobs list --region=us-central1' },
  cloudiam: { title: 'List service accounts', summary: 'List service accounts; IAM identifies application principals so you can manage their permissions.', path: '/v1/projects/PROJECT/serviceAccounts', api: 'iam', command: 'gcloud iam service-accounts list' },
  cloudresourcemanager: { title: 'List local projects', summary: 'List projects; Resource Manager provides the project boundaries used to organize application resources.', path: '/v1/projects', api: 'cloudresourcemanager', command: 'gcloud projects list' },
  serviceusage: { title: 'List API enablement metadata', summary: 'Read API enablement metadata; Service Usage supports the preflight checks used by provisioning tools.', path: '/v1/projects/PROJECT/services', api: 'serviceusage', command: 'gcloud services list --enabled' },
  cloudbilling: { title: 'List billing accounts', summary: 'List billing accounts; Cloud Billing supplies the account metadata used by project setup workflows.', path: '/v1/billingAccounts', api: 'cloudbilling', command: 'gcloud billing accounts list' },
  logging: { title: 'Read structured log entries', summary: 'Read structured log entries; Cloud Logging helps trace application requests and diagnose failures.', path: '/v2/entries:list', api: 'logging', command: 'gcloud logging read \'severity>=DEFAULT\' --limit=10', body: '{"resourceNames":["projects/PROJECT"],"pageSize":10}' },
  monitoring: { title: 'List custom metric descriptors', summary: 'List custom metric definitions; Cloud Monitoring describes the measurements used to track application health.', path: '/v3/projects/PROJECT/metricDescriptors?filter=metric.type%3Dstarts_with%28%22custom.googleapis.com%22%29' },
  gke: { title: 'List Kubernetes clusters', summary: 'List Kubernetes clusters; GKE provides the cluster context where you deploy and inspect container workloads.', path: '/v1/projects/PROJECT/locations/us-central1/clusters', api: 'container', command: 'gcloud container clusters list --region=us-central1' },
  memorystore: { title: 'List Redis instance metadata', summary: 'List cache instances; Memorystore provides Redis-compatible storage for fast, temporary application data.', path: '/v1/projects/PROJECT/locations/us-central1/instances', api: 'redis', command: 'gcloud redis instances list --region=us-central1' },
  workflows: { title: 'List deployed workflows', summary: 'List workflow definitions; Workflows coordinates API calls with sequencing, branching, and retries.', path: '/v1/projects/PROJECT/locations/us-central1/workflows', api: 'workflows', command: 'gcloud workflows list --location=us-central1' },
  kms: { title: 'List key rings', summary: 'List key rings; Cloud KMS organizes the cryptographic keys used to encrypt data and sign messages.', path: '/v1/projects/PROJECT/locations/us-central1/keyRings', api: 'cloudkms', command: 'gcloud kms keyrings list --location=us-central1' },
  cloudsql: { title: 'List SQL instances', summary: 'List SQL instances; Cloud SQL provides relational databases for application queries, migrations, and transactions.', path: '/sql/v1beta4/projects/PROJECT/instances', api: 'sql', command: 'gcloud sql instances list' },
};

const gcloudEnvironment = (api: string, endpoint = '${SERVICE_USAGE_EMULATOR_HOST%/}/') =>
  `: "\${${api === 'storage' ? 'STORAGE_EMULATOR_HOST' : 'SERVICE_USAGE_EMULATOR_HOST'}:?Export the LocalCloud environment first}"
export CLOUDSDK_CORE_PROJECT="\${GOOGLE_CLOUD_PROJECT:?Export the LocalCloud environment first}"
export CLOUDSDK_AUTH_DISABLE_CREDENTIALS=true
export CLOUDSDK_API_ENDPOINT_OVERRIDES_${api.toUpperCase()}="${endpoint}"`;

export function getServiceClientExamples(serviceId: string): ServiceCodeExample[] {
  const examples: ServiceCodeExample[] = [];
  if (javaSdkExamples[serviceId]) examples.push(javaSdkExamples[serviceId]);
  const gateway = gatewayExamples[serviceId];
  if (gateway) {
    const path = gateway.path.replace('PROJECT', '" + project + "');
    const body = gateway.body && JSON.stringify(gateway.body).replace('PROJECT', '" + project + "');
    examples.push({
      title: gateway.title, summary: gateway.summary, label: 'Java · REST', filename: 'Hello.java', run: 'java Hello.java',
      description: 'Call the Google Cloud REST API with the JDK HTTP client. Requires JDK 17+. Results reflect resources already created in your local project.',
      code: `import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Objects;

public class Hello {
  public static void main(String[] args) throws Exception {
    var project = Objects.requireNonNull(System.getenv("GOOGLE_CLOUD_PROJECT"));
    var endpoint = Objects.requireNonNull(System.getenv("SERVICE_USAGE_EMULATOR_HOST"));
    var url = URI.create(endpoint.replaceAll("/+$", "") + "${path}");
    var request = HttpRequest.newBuilder(url).timeout(Duration.ofSeconds(30))${body ? `
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(${body}))` : '.GET()'}.build();
    var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    var response = client.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() >= 400) {
      throw new IllegalStateException(response.statusCode() + ": " + response.body());
    }
    System.out.println(response.body());
  }
}`,
    });
    if (gateway.command && gateway.api) {
      examples.push({ title: gateway.title, summary: gateway.summary, label: 'gcloud CLI',
        description: 'Use the Google Cloud CLI against the local gateway in its default open IAM mode. Run these exports in a terminal dedicated to local development.',
        environment: gcloudEnvironment(gateway.api), code: gateway.command,
      });
    } else {
      examples.push({ title: gateway.title, summary: gateway.summary, label: 'HTTP', description: 'Query the REST API with curl.',
        code: `curl --fail-with-body "\${SERVICE_USAGE_EMULATOR_HOST%/}${gateway.path.replace('PROJECT', '${GOOGLE_CLOUD_PROJECT}')}"`,
      });
    }
  }
  if (serviceId === 'gcs') examples.push({
    title: 'List local storage buckets', label: 'gcloud CLI',
    summary: 'List available buckets; Cloud Storage groups uploads, datasets, and build artifacts into named object containers.',
    description: 'The Google Cloud CLI uses a separate endpoint override. These settings target the default open IAM mode.',
    environment: gcloudEnvironment('storage', '${STORAGE_EMULATOR_HOST%/}/'),
    code: 'gcloud storage buckets list',
  });
  if (serviceId === 'pubsub') examples.push({
    title: 'Publish and pull a message', label: 'gcloud CLI',
    summary: 'Publish, pull, and acknowledge a message; Pub/Sub decouples event producers from background consumers.',
    description: 'gcloud uses the gateway REST endpoint, while SDKs use PUBSUB_EMULATOR_HOST.',
    environment: gcloudEnvironment('pubsub'),
    code: `(
set -e
TOPIC="example-$(date +%s)-$$"
SUBSCRIPTION="$TOPIC-sub"
gcloud pubsub topics create "$TOPIC"
trap 'gcloud pubsub topics delete "$TOPIC" --quiet' EXIT
gcloud pubsub subscriptions create "$SUBSCRIPTION" --topic="$TOPIC"
trap 'gcloud pubsub subscriptions delete "$SUBSCRIPTION" --quiet; gcloud pubsub topics delete "$TOPIC" --quiet' EXIT
gcloud pubsub topics publish "$TOPIC" --message="Hello from LocalCloud!"
gcloud pubsub subscriptions pull "$SUBSCRIPTION" --auto-ack --limit=1
)`,
  });
  if (serviceId === 'spanner') examples.push({
    title: 'List local Spanner instances', label: 'gcloud CLI',
    summary: 'List database instances; Spanner groups the SQL databases used by transactional application workflows.',
    description: 'Use the gateway REST endpoint for gcloud; the SDK uses SPANNER_EMULATOR_HOST.',
    environment: gcloudEnvironment('spanner'), code: 'gcloud spanner instances list',
  });
  if (serviceId === 'bigtable') examples.push({
    title: 'Browse local Bigtable instances', label: 'cbt CLI',
    summary: 'Browse database instances; Bigtable stores wide-column data for fast key-based reads and scans.',
    description: 'Use the native Bigtable CLI with BIGTABLE_EMULATOR_HOST. Requires cbt from the Google Cloud CLI tools.',
    environment: ': "${BIGTABLE_EMULATOR_HOST:?Export the LocalCloud environment first}"',
    code: 'cbt -project="${GOOGLE_CLOUD_PROJECT:?Export the LocalCloud environment first}" listinstances',
  });
  if (serviceId === 'bigquery') examples.push({
    title: 'Run a GoogleSQL query over HTTP', label: 'HTTP',
    summary: 'Submit a SQL query over HTTP; BigQuery returns tabular results for analytics and data transformations.',
    description: 'Send a query directly to the BigQuery REST API with curl.',
    code: `curl --fail-with-body "\${BIGQUERY_EMULATOR_HOST%/}/bigquery/v2/projects/\${GOOGLE_CLOUD_PROJECT}/queries" \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"SELECT 1 AS value","useLegacySql":false}'`,
  });
  if (serviceId === 'sheets') examples.push({
    title: 'Read a spreadsheet range', label: 'HTTP',
    summary: 'Read a seeded spreadsheet range; Sheets lets an application consume human-maintained lookup tables.',
    description: 'Use the ID and A1 range from a seeded spreadsheet. Google Sheets exposes read-only fixture values locally.',
    environment: 'export SPREADSHEET_ID="your-seeded-spreadsheet-id"\nexport A1_RANGE="Sheet1!A1:B3"',
    code: 'curl --fail-with-body --get "${SHEETS_EMULATOR_HOST%/}/v4/spreadsheets/${SPREADSHEET_ID}/values/${A1_RANGE}"',
  });
  if (serviceId === 'memorystore') examples.unshift({
    title: 'Set and read a cache value', label: 'redis-cli',
    summary: 'Set and retrieve a short-lived key; Memorystore speeds up repeated reads through a Redis-compatible cache.',
    description: 'Use a native Redis client against the generated Valkey endpoint.',
    environment: ': "${REDIS_HOST:?Export the LocalCloud environment first}"\nexport REDISCLI_HOST="${REDIS_HOST%:*}"\nexport REDISCLI_PORT="${REDIS_HOST##*:}"',
    code: `KEY="example-$(date +%s)-$$"
redis-cli -h "$REDISCLI_HOST" -p "$REDISCLI_PORT" SET "$KEY" "Hello from LocalCloud!" EX 60
redis-cli -h "$REDISCLI_HOST" -p "$REDISCLI_PORT" GET "$KEY"
redis-cli -h "$REDISCLI_HOST" -p "$REDISCLI_PORT" DEL "$KEY"`,
  });
  return examples;
}
