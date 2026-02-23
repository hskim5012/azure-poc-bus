# Azure Service Bus Event-Driven Job Chaining POC

A proof of concept demonstrating sequential job processing using Azure Service Bus with an **event-driven pub/sub architecture**. Jobs execute in order: **Claim Loading** → **Claim Audit** → **B1 Move** → **B2 Move**, where each job triggers the next upon successful completion. Now with **KEDA** autoscaling support on Kubernetes!

## Architecture Overview

This POC uses the **simple queue-based chaining pattern**, which works with any Azure Service Bus tier (including Basic):

- **4 separate queues**, one per job type:
  - `claim-loading-queue`
  - `claim-audit-queue`
  - `b1-move-queue`
  - `b2-move-queue`

- **4 workers** listening to each queue simultaneously
- Each worker processes messages and triggers the next job via the orchestrator
- Sequential execution is guaranteed by **application logic** (not Azure Service Bus sessions)

### How It Works

```
[Start Workflow] 
    ↓
[claim-loading-queue] → ClaimLoadingHandler → Success
    ↓
[claim-audit-queue] → ClaimAuditHandler → Success
    ↓
[b1-move-queue] → B1MoveHandler → Success
    ↓
[b2-move-queue] → B2MoveHandler → Success
    ↓
[Workflow Complete]
```

## Prerequisites

1. **Azure Service Bus Namespace** (any tier: Basic, Standard, or Premium)
   - Get your connection string from: Azure Portal → Service Bus Namespace → Shared access policies → RootManageSharedAccessKey

2. **Node.js** (v18 or later)

3. **npm** (comes with Node.js)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd c:\Workspace\POCs\AzureServiceBusJobChaining
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Azure Service Bus connection string:

```bash
copy .env.example .env
```

Edit `.env` and set:
```
AZURE_SERVICEBUS_CONNECTION_STRING=Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=...
LOG_LEVEL=info
```

### 3. Create Queues in Azure Service Bus

Run the automated setup script:

```bash
npm run setup-queues
```

This will create the 4 required queues:
- `claim-loading-queue`
- `claim-audit-queue`
- `b1-move-queue`
- `b2-move-queue`

**Note**: Sessions are NOT required for this pattern.

### 4. Build the Project

```bash
npm run build
```

## Running the POC

### Start the Workers

Open a terminal and run:

```bash
npm start
```

Select option **1: Start all workers**

Expected output:
```
✓ Worker started for claim-loading-queue
✓ Worker started for claim-audit-queue
✓ Worker started for b1-move-queue
✓ Worker started for b2-move-queue

All workers are running. Press Ctrl+C to stop.
```

### Trigger a New Workflow

Open a **second terminal** and run:

```bash
npm start
```

Select option **2: Trigger new workflow**

This will:
1. Generate a unique workflow ID
2. Send a ClaimLoading job message to `claim-loading-queue`
3. Start the sequential execution chain

### Observe the Sequential Execution

Watch the first terminal (where workers are running) for output like:

```
[claim-loading-queue] Received message for workflow: abc-123
[ClaimLoadingHandler] Processing workflow abc-123...
[ClaimLoadingHandler] ✓ Completed in 2.1s
[Orchestrator] Sending to next queue: claim-audit-queue

[claim-audit-queue] Received message for workflow: abc-123
[ClaimAuditHandler] Processing workflow abc-123...
[ClaimAuditHandler] ✓ Completed in 1.8s
[Orchestrator] Sending to next queue: b1-move-queue

[b1-move-queue] Received message for workflow: abc-123
[B1MoveHandler] Processing workflow abc-123...
[B1MoveHandler] ✓ Completed in 2.3s
[Orchestrator] Sending to next queue: b2-move-queue

[b2-move-queue] Received message for workflow: abc-123
[B2MoveHandler] Processing workflow abc-123...
[B2MoveHandler] ✓ Completed in 1.9s
[Orchestrator] ✓ Workflow abc-123 complete!
```

## Project Structure

```
AzureServiceBusJobChaining/
├── src/
│   ├── config.ts                   # Configuration loader
│   ├── logger.ts                   # Logging utility
│   ├── index.ts                    # Main application entry point
│   ├── models/
│   │   ├── JobMessage.ts           # Job message model
│   │   └── JobResult.ts            # Job result model
│   ├── jobs/
│   │   ├── IJobHandler.ts          # Job handler interface
│   │   ├── ClaimLoadingJobHandler.ts
│   │   ├── ClaimAuditJobHandler.ts
│   │   ├── B1MoveJobHandler.ts
│   │   ├── B2MoveJobHandler.ts
│   │   └── JobHandlerFactory.ts    # Factory for creating handlers
│   ├── services/
│   │   ├── ServiceBusService.ts    # Azure Service Bus operations
│   │   └── WorkflowOrchestrator.ts # Job sequencing logic
│   ├── workers/
│   │   └── QueueWorker.ts          # Generic queue worker
│   └── scripts/
│       └── setup-queues.ts         # Queue creation script
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Verification in Azure Portal

After running workflows, verify in Azure Portal:

1. Navigate to: **Service Bus Namespace → Queues**
2. Check each queue's metrics:
   - **Active Messages**: Should be 0 (all processed)
   - **Dead-letter Messages**: Should be 0 (no failures)
3. View message flow: claim-loading → claim-audit → b1-move → b2-move

## Key Features

✅ **Simple queue-based chaining** - Works with any Service Bus tier  
✅ **Sequential execution** - Jobs execute in defined order  
✅ **Error handling** - Failed jobs are automatically retried or dead-lettered  
✅ **Scalable** - Each job type can be scaled independently  
✅ **Observable** - Comprehensive logging at each step  
✅ **Production-ready pattern** - Can be extended for real workloads  

## Pattern Comparison

This POC uses **Pattern 2: Simple Queue-Based Chaining**. Here's how it compares to the session-based pattern:

| Feature | Pattern 1 (Sessions) | Pattern 2 (Queue-Based) ✓ |
|---------|---------------------|---------------------------|
| **Service Bus Tier** | Standard/Premium | **Any (incl. Basic)** |
| **Number of Queues** | 1 | 4 |
| **Ordering Guarantee** | Azure Service Bus | Application logic |
| **Code Complexity** | Higher (session mgmt) | **Simpler** |
| **Independent Scaling** | No | **Yes** |
| **Cost** | Higher | **Lower** |

## Extending the POC

To add more jobs to the chain:

1. Add a new job type to `JobType` enum in `src/models/JobMessage.ts`
2. Create a new job handler implementing `IJobHandler`
3. Add the handler to `JobHandlerFactory`
4. Update `JOB_SEQUENCE` in `WorkflowOrchestrator.ts`
5. Add the queue name to config
6. Create the new queue in Azure

## Troubleshooting

**Connection errors**: Verify your connection string in `.env`

**Queues not found**: Run `npm run setup-queues` to create them

**Messages stuck in queue**: Check worker logs for errors, verify handlers are running

**Permission errors**: Ensure the connection string has Manage/Send/Listen permissions

## Kubernetes & KEDA

To run this workload in Kubernetes (like AKS) using KEDA for Event-Driven Autoscaling (scaling to 0 when idle), see the instructions in [`k8s/README.md`](k8s/README.md).

## License

MIT
