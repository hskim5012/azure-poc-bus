import { IJobHandler } from './IJobHandler';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { JobResult, createSuccessResult } from '../models/JobResult';
import { logger } from '../logger';

export class ClaimAuditJobHandler implements IJobHandler {
    async execute(event: WorkflowEvent): Promise<JobResult> {
        logger.info(`[ClaimAuditHandler] Processing workflow ${event.workflowId}...`);

        // Simulate claim audit work
        const startTime = Date.now();
        await this.auditClaims(event);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        logger.info(`[ClaimAuditHandler] ✓ Completed in ${duration}s`);

        return createSuccessResult({
            claimsAudited: 150,
            issuesFound: 3,
            duration,
        });
    }

    private async auditClaims(event: WorkflowEvent): Promise<void> {
        // Simulate processing time (1.0 - 2.0 seconds)
        const delay = 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        logger.debug(`[ClaimAuditHandler] Audited claims for workflow ${event.workflowId}`);
    }
}
