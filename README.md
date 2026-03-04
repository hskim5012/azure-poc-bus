# Azure Service Bus Event-Driven Job Chaining POC

A proof of concept for sequential job processing using Azure Service Bus with an **event-driven pub/sub architecture**.

Workflow stages run in order:

**WorkflowStarted → ClaimLoadingCompleted → ClaimAuditCompleted → B1MoveCompleted → B2MoveCompleted**

It also includes Kubernetes manifests with **KEDA** autoscaling support.

## Architecture Overview

This implementation uses:

- **1 topic**: `workflow-events-topic`
- **4 subscriptions** (one per stage):
  - `claim-loading-sub`
  - `claim-audit-sub`
  - `b1-move-sub`
  - `b2-move-sub`
- **4 workers** listening to subscriptions
- **SQL filters** on each subscription using `eventType` application property

### How It Works

```
[User or Cron Trigger]
    ↓ publish WorkflowStarted
[workflow-events-topic]
    ↓ routed by SQL filter to claim-loading-sub
[ClaimLoadingHandler]
    ↓ publish ClaimLoadingCompleted
[workflow-events-topic]
    ↓ routed to claim-audit-sub
[ClaimAuditHandler]
    ↓ publish ClaimAuditCompleted
[workflow-events-topic]
    ↓ routed to b1-move-sub
[B1MoveHandler]
    ↓ publish B1MoveCompleted
[workflow-events-topic]
    ↓ routed to b2-move-sub
[B2MoveHandler]
    ↓
[Workflow Complete]
```

## Prerequisites

1. **Azure Service Bus Namespace (Standard or Premium)**
   - Topics/subscriptions are required (not available on Basic tier).
   - Get your connection string from Azure Portal:
     **Service Bus Namespace → Shared access policies → RootManageSharedAccessKey**
2. **Node.js** (v18+)
3. **npm**

## Setup Instructions

### 1) Install Dependencies

```bash
npm install
```

### 2) Configure Environment Variables

Create `.env` (or copy from your example if present) and set:

```env
AZURE_SERVICEBUS_CONNECTION_STRING=Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=...
LOG_LEVEL=info
AZURE_SB_TOPIC_NAME=workflow-events-topic
AZURE_SB_SUB_CLAIM_LOADING=claim-loading-sub
AZURE_SB_SUB_CLAIM_AUDIT=claim-audit-sub
AZURE_SB_SUB_B1_MOVE=b1-move-sub
AZURE_SB_SUB_B2_MOVE=b2-move-sub
```

### 3) Create Topic + Subscriptions + Filter Rules

```bash
npm run setup-infrastructure
```

This script:

- Creates the topic if missing
- Creates the 4 subscriptions if missing
- Removes the default `$Default` rule
- Adds SQL filter rules based on `eventType`

### 4) Build

```bash
npm run build
```

## Running the POC

### Interactive Mode

```bash
npm run dev
```

Menu options:

1. Start all workers (subscription listeners)
2. Trigger new workflow (`WorkflowStarted`)

### Non-Interactive Modes

- Worker process (container/K8s friendly):

  ```bash
  npm run build && npm run start:worker
  ```

- Trigger once (cron/scheduler friendly):

  ```bash
  npm run build && npm run start:trigger
  ```

## Expected Worker Logs (Example)

```text
✓ Worker started for subscription: claim-loading-sub
✓ Worker started for subscription: claim-audit-sub
✓ Worker started for subscription: b1-move-sub
✓ Worker started for subscription: b2-move-sub

[claim-loading-sub] Received WorkflowStarted for workflow: abc-123
[Orchestrator] Publishing completion event: ClaimLoadingCompleted

[claim-audit-sub] Received ClaimLoadingCompleted for workflow: abc-123
[Orchestrator] Publishing completion event: ClaimAuditCompleted

[b1-move-sub] Received ClaimAuditCompleted for workflow: abc-123
[Orchestrator] Publishing completion event: B1MoveCompleted

[b2-move-sub] Received B1MoveCompleted for workflow: abc-123
[Orchestrator] ✓ Workflow abc-123 is fully complete!
```

## Project Structure

```text
azure-poc-bus/
├── src/
│   ├── config.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── trigger.ts
│   ├── worker.ts
│   ├── jobs/
│   │   ├── IJobHandler.ts
│   │   ├── ClaimLoadingJobHandler.ts
│   │   ├── ClaimAuditJobHandler.ts
│   │   ├── B1MoveJobHandler.ts
│   │   ├── B2MoveJobHandler.ts
│   │   └── JobHandlerFactory.ts
│   ├── models/
│   │   ├── WorkflowEvent.ts
│   │   └── JobResult.ts
│   ├── scripts/
│   │   └── setup-infrastructure.ts
│   ├── services/
│   │   ├── ServiceBusService.ts
│   │   └── WorkflowOrchestrator.ts
│   └── workers/
│       └── SubscriptionWorker.ts
├── k8s/
└── README.md
```

## Verification in Azure Portal

After running workflows:

1. Go to **Service Bus Namespace → Topics → workflow-events-topic → Subscriptions**
2. Validate each subscription:
   - **Active Messages** eventually returns to 0
   - **Dead-letter Messages** remains 0 (or is investigated)
3. Confirm event progression across subscriptions:
   - `claim-loading-sub` → `claim-audit-sub` → `b1-move-sub` → `b2-move-sub`

## Key Features

✅ **Pub/Sub workflow orchestration** using topic + subscriptions  
✅ **Sequential stage execution** via completion events  
✅ **Decoupled handlers** with event-based routing  
✅ **Retry/dead-letter behavior** through Service Bus subscription semantics  
✅ **KEDA autoscaling** support on Kubernetes/AKS  
✅ **Container-friendly modes** (`start:worker`, `start:trigger`)  

## Extending the POC

To add another stage:

1. Add a new `EventType` in `src/models/WorkflowEvent.ts`
2. Implement a handler in `src/jobs/`
3. Map the event to the handler in `src/jobs/JobHandlerFactory.ts`
4. Add completion-event mapping in `src/services/WorkflowOrchestrator.ts`
5. Add subscription config in `src/config.ts`
6. Add subscription + SQL filter setup in `src/scripts/setup-infrastructure.ts`
7. Add KEDA trigger entry in `k8s/keda.yaml` (if using K8s scaling)

## Troubleshooting

- **Connection errors**: verify `AZURE_SERVICEBUS_CONNECTION_STRING` in `.env`
- **Topic/subscriptions missing**: run `npm run setup-infrastructure`
- **No events routed**: verify subscription SQL filters are present and `$Default` rule is removed
- **Messages stuck / retries**: inspect worker logs and subscription dead-letter queue
- **Permission errors**: ensure Send/Listen/Manage rights for setup operations

## Kubernetes & KEDA

For AKS/Kubernetes deployment and autoscaling instructions, see [k8s/README.md](k8s/README.md).

## License

MIT
