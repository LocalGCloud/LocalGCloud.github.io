# Pub/Sub LocalCloud Reference

## Local setup

```bash
export PUBSUB_EMULATOR_HOST=localhost:24082
export GOOGLE_CLOUD_PROJECT=local-project
```

## Representative Python flow

```python
from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()
subscriber = pubsub_v1.SubscriberClient()

topic = publisher.topic_path("local-project", "events-local")
subscription = subscriber.subscription_path("local-project", "events-local-sub")

publisher.create_topic(request={"name": topic})
subscriber.create_subscription(request={"name": subscription, "topic": topic})

future = publisher.publish(topic, b'{"event":"created"}', source="local-test")
future.result(timeout=10)

response = subscriber.pull(request={"subscription": subscription, "max_messages": 1})
assert response.received_messages
message = response.received_messages[0]
assert message.message.attributes["source"] == "local-test"
subscriber.acknowledge(request={"subscription": subscription, "ack_ids": [message.ack_id]})
```

## Streaming pull guidance

Use the repo's existing streaming subscriber abstraction when it exists. Keep tests bounded with a timeout and a deterministic message. Stop the subscriber cleanly after the assertion.

## Known gaps to call out

- Schema validation may not match production Pub/Sub unless documented as supported.
- BigQuery, Cloud Storage, or push delivery subscriptions may require real-GCP validation.
- IAM is permissive in LocalCloud; do not treat local success as production authorization proof.
