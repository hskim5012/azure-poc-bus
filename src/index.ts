import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { ServiceBusService } from './services/ServiceBusService';
import { WorkflowOrchestrator } from './services/WorkflowOrchestrator';
import { SubscriptionWorker } from './workers/SubscriptionWorker';
import { createWorkflowEvent, EventType } from './models/WorkflowEvent';
import { config } from './config';
import { logger } from './logger';

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Global instances
let serviceBusService: ServiceBusService;
let orchestrator: WorkflowOrchestrator;
let workers: SubscriptionWorker[] = [];

async function startAllWorkers(): Promise<void> {
    logger.info('Starting all workers...');

    serviceBusService = new ServiceBusService();
    orchestrator = new WorkflowOrchestrator(serviceBusService);

    // Create workers for each subscription on the topic
    const subscriptions = [
        config.subscriptions.claimLoading,
        config.subscriptions.claimAudit,
        config.subscriptions.b1Move,
        config.subscriptions.b2Move,
    ];

    for (const subscription of subscriptions) {
        const worker = new SubscriptionWorker(subscription, serviceBusService, orchestrator);
        await worker.start();
        workers.push(worker);
    }

    logger.info('\nAll workers are running. Press Ctrl+C to stop.\n');
}

async function triggerNewWorkflow(): Promise<void> {
    const workflowId = uuidv4();
    logger.info(`\nTriggering new workflow with ID: ${workflowId}\n`);

    const tempServiceBus = serviceBusService || new ServiceBusService();

    // Create the initial event (WorkflowStarted)
    const initialEvent = createWorkflowEvent(EventType.WorkflowStarted, workflowId, {
        source: 'manual-trigger',
        timestamp: new Date().toISOString(),
    });

    // Publish to the common Topic
    await tempServiceBus.publishEvent(initialEvent);

    logger.info(`✓ Workflow ${workflowId} started! Event published to topic: ${config.topic.name}\n`);

    if (!serviceBusService) {
        await tempServiceBus.close();
    }
}

function displayMenu(): void {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Azure Service Bus Event-Driven Job Chaining POC      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('1. Start all workers (listen for events on topic subscriptions)');
    console.log('2. Trigger new workflow (publish WorkflowStarted event)');
    console.log('3. Exit\n');
}

function promptUser(): void {
    rl.question('Select an option (1-3): ', async (answer) => {
        switch (answer.trim()) {
            case '1':
                await startAllWorkers();
                break;
            case '2':
                await triggerNewWorkflow();
                promptUser();
                break;
            case '3':
                await cleanup();
                process.exit(0);
                break;
            default:
                console.log('Invalid option. Please select 1, 2, or 3.');
                promptUser();
                break;
        }
    });
}

async function cleanup(): Promise<void> {
    logger.info('\nShutting down...');

    for (const worker of workers) {
        await worker.stop();
    }

    if (serviceBusService) {
        await serviceBusService.close();
    }

    rl.close();
    logger.info('Cleanup complete');
}

process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
});

async function main() {
    try {
        displayMenu();
        promptUser();
    } catch (error) {
        logger.error('Fatal error:', error);
        await cleanup();
        process.exit(1);
    }
}

main();
