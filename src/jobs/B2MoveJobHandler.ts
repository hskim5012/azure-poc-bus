import { IJobHandler } from './IJobHandler';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { JobResult, createSuccessResult } from '../models/JobResult';
import { logger } from '../logger';

export class B2MoveJobHandler implements IJobHandler {
    async execute(event: WorkflowEvent): Promise<JobResult> {
        logger.info(`[B2MoveHandler] Processing workflow ${event.workflowId}...`);

        // Simulate B2 move work
        const startTime = Date.now();
        await this.moveB2Data(event);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        logger.info(`[B2MoveHandler] ✓ Completed in ${duration}s`);

        return createSuccessResult({
            recordsMoved: 750,
            duration,
        });
    }

    private async moveB2Data(event: WorkflowEvent): Promise<void> {
        // Simulate processing time (1.0 - 2.5 seconds)
        const delay = 1000 + Math.random() * 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));

        logger.debug(`[B2MoveHandler] Moved B2 data for workflow ${event.workflowId}`);
    }
}
