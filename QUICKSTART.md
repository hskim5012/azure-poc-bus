# Quick Start Guide - Run in Git Bash

Open **Git Bash** terminal and run these commands:

## Step 1: Navigate to Project
```bash
cd /c/Workspace/POCs/AzureServiceBusJobChaining
```

## Step 2: Install Dependencies
```bash
npm install
```

## Step 3: Build the Project
```bash
npm run build
```

## Step 4: Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env file and add your Azure Service Bus connection string
# You can use: notepad .env
```

In the `.env` file, add:
```
AZURE_SERVICEBUS_CONNECTION_STRING=Endpoint=sb://YOUR-NAMESPACE.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=YOUR-KEY-HERE
LOG_LEVEL=info
```

## Step 5: Create Queues in Azure (requires connection string)
```bash
npm run setup-queues
```

## Step 6: Run the POC

### Terminal 1 - Start Workers
```bash
npm start
# Choose option 1: Start all workers
```

### Terminal 2 - Trigger Workflow
Open a second Git Bash terminal:
```bash
cd /c/Workspace/POCs/AzureServiceBusJobChaining
npm start
# Choose option 2: Trigger new workflow
```

## Expected Output in Terminal 1 (Workers)

You should see:
```
✓ Worker started for claim-loading-queue
✓ Worker started for claim-audit-queue
✓ Worker started for b1-move-queue
✓ Worker started for b2-move-queue

All workers are running. Press Ctrl+C to stop.

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

## Troubleshooting

**If npm commands don't work:**
- Make sure you're in Git Bash (not PowerShell)
- Verify Node.js: `node --version` (should show v24.11.1)
- Verify npm: `npm --version`

**If Azure connection fails:**
- Double-check your connection string in `.env`
- Ensure your Azure Service Bus namespace exists
- Verify you have permissions (Manage, Send, Listen)

**If queues already exist:**
- That's fine! The setup script will detect and skip them
- You can also create them manually in Azure Portal
