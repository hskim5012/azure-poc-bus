import { EventType, WorkflowEvent, createWorkflowEvent } from '../models/WorkflowEvent';
import { JobResult } from '../models/JobResult';
import { JobHandlerFactory } from '../jobs/JobHandlerFactory';
import { ServiceBusService } from './ServiceBusService';
import { logger } from '../logger';

export class WorkflowOrchestrator {
    private jobHandlerFactory: JobHandlerFactory;
    private serviceBusService: ServiceBusService;

    constructor(serviceBusService: ServiceBusService) {
        this.jobHandlerFactory = new JobHandlerFactory();
        this.serviceBusService = serviceBusService;
    }

    /**
     * Process an incoming event
     * - Finds the right handler for the event (e.g. WorkflowStarted -> ClaimLoadingHandler)
     * - Executes the job
     * - If successful, publishes a "Completed" event to the Topic
     */
    async processEvent(event: WorkflowEvent): Promise<JobResult> {
        try {
            logger.info(`[Orchestrator] Received event: ${event.eventType} for workflow ${event.workflowId}`);

            // Get the appropriate handler for this event type
            const handler = this.jobHandlerFactory.getHandlerForEvent(event.eventType);

            if (!handler) {
                // null handler means the workflow is fully complete (e.g. B2MoveCompleted)
                logger.info(`[Orchestrator] ✓ Workflow ${event.workflowId} is fully complete!`);
                return { success: true };
            }

            // Execute the job
            const result = await handler.execute(event);

            // If the job succeeded, publish the NEXT event (Completion Event)
            if (result.success) {
                await this.publishCompletionEvent(event, result);
            }

            return result;
        } catch (error) {
            logger.error(`Error processing event ${event.eventType}`, error);
            return {
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Determine and publish the completion event based on what just ran
     */
    private async publishCompletionEvent(
        originalEvent: WorkflowEvent,
        result: JobResult
    ): Promise<void> {
        let nextEventType: EventType;

        // Map the incoming event to the outgoing completion event
        switch (originalEvent.eventType) {
            case EventType.WorkflowStarted:
                nextEventType = EventType.ClaimLoadingCompleted;
                break;
            case EventType.ClaimLoadingCompleted:
                nextEventType = EventType.ClaimAuditCompleted;
                break;
            case EventType.ClaimAuditCompleted:
                nextEventType = EventType.B1MoveCompleted;
                break;
            case EventType.B1MoveCompleted:
                nextEventType = EventType.B2MoveCompleted;
                break;
            default:
                logger.warn(`Unknown original event type: ${originalEvent.eventType}`);
                return;
        }

        // Create the completion event
        const completionEvent = createWorkflowEvent(
            nextEventType,
            originalEvent.workflowId,
            {
                ...originalEvent.eventData,
                resultData: result.resultData // Pass the results forward if needed
            }
        );

        // Publish to the single Topic
        logger.info(`[Orchestrator] Publishing completion event: ${nextEventType}`);
        await this.serviceBusService.publishEvent(completionEvent);
    }
}
