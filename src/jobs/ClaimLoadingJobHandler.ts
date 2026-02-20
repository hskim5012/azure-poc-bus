import { IJobHandler } from './IJobHandler';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { JobResult, createSuccessResult } from '../models/JobResult';
import { logger } from '../logger';

export class ClaimLoadingJobHandler implements IJobHandler {
    async execute(event: WorkflowEvent): Promise<JobResult> {
        logger.info(`[ClaimLoadingHandler] Processing workflow ${event.workflowId}...`);

        // Simulate claim loading work
        const startTime = Date.now();
        await this.loadClaims(event);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        logger.info(`[ClaimLoadingHandler] ✓ Completed in ${duration}s`);

        return createSuccessResult({
            claimsLoaded: 150,
            duration,
        });
    }

    private async loadClaims(event: WorkflowEvent): Promise<void> {
        // Simulate processing time (1.5 - 2.5 seconds)
        const delay = 1500 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        logger.debug(`[ClaimLoadingHandler] Loaded claims for workflow ${event.workflowId}`);
    }
}
