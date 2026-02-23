import { ServiceBusService } from './services/ServiceBusService';
import { WorkflowOrchestrator } from './services/WorkflowOrchestrator';
import { SubscriptionWorker } from './workers/SubscriptionWorker';
import { config } from './config';
import { logger } from './logger';

// Global instances
let serviceBusService: ServiceBusService;
let orchestrator: WorkflowOrchestrator;
let workers: SubscriptionWorker[] = [];

async function startAllWorkers(): Promise<void> {
    logger.info('Starting worker in non-interactive mode...');

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

    logger.info('\nAll workers are running and listening for events...\n');
}

async function cleanup(): Promise<void> {
    logger.info('\nShutting down workers gracefully...');

    for (const worker of workers) {
        await worker.stop();
    }

    if (serviceBusService) {
        await serviceBusService.close();
    }

    logger.info('Cleanup complete');
}

process.on('SIGINT', async () => {
    logger.info('Received SIGINT...');
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM...');
    await cleanup();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
});

async function main() {
    try {
        await startAllWorkers();
    } catch (error) {
        logger.error('Fatal error starting worker:', error);
        await cleanup();
        process.exit(1);
    }
}

main();
