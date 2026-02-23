import { v4 as uuidv4 } from 'uuid';
import { ServiceBusService } from './services/ServiceBusService';
import { createWorkflowEvent, EventType } from './models/WorkflowEvent';
import { config } from './config';
import { logger } from './logger';

async function triggerNewWorkflow(): Promise<void> {
    const workflowId = uuidv4();
    logger.info(`Triggering new workflow with ID: ${workflowId}`);

    const serviceBusService = new ServiceBusService();

    try {
        // Create the initial event (WorkflowStarted)
        const initialEvent = createWorkflowEvent(EventType.WorkflowStarted, workflowId, {
            source: 'scheduled-cronjob',
            timestamp: new Date().toISOString(),
        });

        // Publish to the common Topic
        await serviceBusService.publishEvent(initialEvent);

        logger.info(`✓ Workflow ${workflowId} started! Event published to topic: ${config.topic.name}`);
    } catch (error) {
        logger.error('Failed to trigger workflow:', error);
        process.exit(1);
    } finally {
        await serviceBusService.close();
    }
}

// Execute immediately when the script runs
triggerNewWorkflow()
    .then(() => {
        logger.info('Trigger script completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Trigger script failed:', error);
        process.exit(1);
    });
