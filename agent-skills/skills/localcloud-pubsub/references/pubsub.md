# Pub/Sub LocalCloud Reference

## Local setup

```bash
localcloud start
eval "$(localcloud env)"
```

Confirm the generated values include `PUBSUB_EMULATOR_HOST` and `GOOGLE_CLOUD_PROJECT=local-gcp-project`.

## Representative Python flow

```python
from google.cloud import pubsub_v1

project = "local-gcp-project"
publisher = pubsub_v1.PublisherClient()
subscriber = pubsub_v1.SubscriberClient()
topic = publisher.topic_path(project, "events-local")
subscription = subscriber.subscription_path(project, "events-local-sub")

publisher.create_topic(request={"name": topic})
subscriber.create_subscription(request={"name": subscription, "topic": topic})
publisher.publish(topic, b'{"event":"created"}', source="local-test").result(timeout=10)
response = subscriber.pull(request={"subscription": subscription, "max_messages": 1})
assert response.received_messages
```

## Boundaries

Pub/Sub state is volatile across restart. Review operation-level evidence for schema, delivery, push, BigQuery, and Cloud Storage subscription behavior. Local success is not production IAM or delivery proof. Use is subject to the proprietary license.
