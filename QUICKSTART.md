# Quick Start Guide

Run these commands from this project root (`azure-poc-bus`).

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Configure Environment Variables
Create a `.env` file and set:

```env
AZURE_SERVICEBUS_CONNECTION_STRING=Endpoint=sb://YOUR-NAMESPACE.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=YOUR-KEY-HERE
LOG_LEVEL=info
AZURE_SB_TOPIC_NAME=workflow-events-topic
AZURE_SB_SUB_CLAIM_LOADING=claim-loading-sub
AZURE_SB_SUB_CLAIM_AUDIT=claim-audit-sub
AZURE_SB_SUB_B1_MOVE=b1-move-sub
AZURE_SB_SUB_B2_MOVE=b2-move-sub
```

## Step 3: Create Topic, Subscriptions, and Filters
```bash
npm run setup-infrastructure
```

## Step 4: Run Locally

### Option A: Interactive menu
```bash
npm run dev
```

- Choose `1` to start workers
- Choose `2` to trigger a workflow

### Option B: Two-terminal mode

Terminal 1 (worker process):
```bash
npm run build
npm run start:worker
```

Terminal 2 (trigger one workflow):
```bash
npm run build
npm run start:trigger
```

## Expected Worker Output (Example)

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

## Troubleshooting

**If npm commands fail**
- Verify Node.js: `node --version`
- Verify npm: `npm --version`

**If Service Bus setup fails**
- Ensure your namespace is **Standard or Premium** (topics/subscriptions are required)
- Validate `AZURE_SERVICEBUS_CONNECTION_STRING`
- Confirm permissions include Manage/Send/Listen

**If events are not routed**
- Re-run `npm run setup-infrastructure`
- Check subscription rules and confirm `$Default` rule was removed
