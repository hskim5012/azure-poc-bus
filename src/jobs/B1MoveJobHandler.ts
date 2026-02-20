import { IJobHandler } from './IJobHandler';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { JobResult, createSuccessResult } from '../models/JobResult';
import { logger } from '../logger';

export class B1MoveJobHandler implements IJobHandler {
    async execute(event: WorkflowEvent): Promise<JobResult> {
        logger.info(`[B1MoveHandler] Processing workflow ${event.workflowId}...`);

        // Simulate B1 move work
        const startTime = Date.now();
        await this.moveB1Data(event);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        logger.info(`[B1MoveHandler] ✓ Completed in ${duration}s`);

        return createSuccessResult({
            recordsMoved: 500,
            duration,
        });
    }

    private async moveB1Data(event: WorkflowEvent): Promise<void> {
        const delay = 110000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        logger.debug(`[B1MoveHandler] Moved B1 data for workflow ${event.workflowId}`);
    }
}
