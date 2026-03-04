import { ServiceBusReceiver, ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusService } from '../services/ServiceBusService';
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator';
import { logger } from '../logger';

export class SubscriptionWorker {
    private subscriptionName: string;
    private receiver: ServiceBusReceiver;
    private orchestrator: WorkflowOrchestrator;
    private serviceBusService: ServiceBusService;
    private isRunning: boolean = false;

    constructor(
        subscriptionName: string,
        serviceBusService: ServiceBusService,
        orchestrator: WorkflowOrchestrator
    ) {
        this.subscriptionName = subscriptionName;
        this.serviceBusService = serviceBusService;
        this.orchestrator = orchestrator;
        this.receiver = serviceBusService.createSubscriptionReceiver(subscriptionName);
    }

    /**
     * Start the worker to listen for events on this subscription
     */
    async start(): Promise<void> {
        this.isRunning = true;
        logger.info(`✓ Worker started for subscription: ${this.subscriptionName}`);

        // Set up message handler
        this.receiver.subscribe({
            processMessage: async (message: ServiceBusReceivedMessage) => {
                await this.processMessage(message);
            },
            processError: async (error) => {
                logger.error(`Error in worker for ${this.subscriptionName}`, error);
            },
        });
    }

    /**
     * Process a single event message
     */
    private async processMessage(message: ServiceBusReceivedMessage): Promise<void> {
        try {
            // Parse the event
            const workflowEvent = this.serviceBusService.parseWorkflowEvent(message);
            logger.info(`[${this.subscriptionName}] Received ${workflowEvent.eventType} for workflow: ${workflowEvent.workflowId}`);

            // Process the event via the orchestrator
            const result = await this.orchestrator.processEvent(workflowEvent);

            if (result.success) {
                // Complete the message (remove from subscription)
                await this.receiver.completeMessage(message);
                logger.debug(`[${this.subscriptionName}] Message completed successfully`);
            } else {
                if (result.errorType === 'deterministic') {
                    // Dead-letter deterministic failures
                    logger.error(`[${this.subscriptionName}] Job failed deterministically, dead-lettering message`, {
                        error: result.errorMessage,
                    });
                    await this.receiver.deadLetterMessage(message, {
                        deadLetterReason: 'DeterministicJobFailure',
                        deadLetterErrorDescription: result.errorMessage || 'Job failed deterministically'
                    });
                } else {
                    // Transient failures: Check deliveryCount
                    const MAX_RETRIES = 5;
                    if (message.deliveryCount && message.deliveryCount >= MAX_RETRIES) {
                        logger.error(`[${this.subscriptionName}] Message exceeded max retries (${MAX_RETRIES}), dead-lettering message`, {
                            error: result.errorMessage,
                        });
                        await this.receiver.deadLetterMessage(message, {
                            deadLetterReason: 'MaxRetriesExceeded',
                            deadLetterErrorDescription: result.errorMessage || 'Exceeded maximum retries'
                        });
                    } else {
                        // Abandon the message so it can be retried
                        logger.warn(`[${this.subscriptionName}] Job failed transiently, abandoning message for retry`, {
                            error: result.errorMessage,
                            deliveryCount: message.deliveryCount
                        });
                        await this.receiver.abandonMessage(message);
                    }
                }
            }
        } catch (error) {
            logger.error(`[${this.subscriptionName}] Error processing message`, error);
            // Abandon the message on error
            await this.receiver.abandonMessage(message);
        }
    }

    /**
     * Stop the worker
     */
    async stop(): Promise<void> {
        this.isRunning = false;
        await this.receiver.close();
        logger.info(`Worker stopped for ${this.subscriptionName}`);
    }

    /**
     * Check if worker is running
     */
    getIsRunning(): boolean {
        return this.isRunning;
    }
}
