import { IJobHandler } from './IJobHandler';
import { EventType } from '../models/WorkflowEvent';
import { ClaimLoadingJobHandler } from './ClaimLoadingJobHandler';
import { ClaimAuditJobHandler } from './ClaimAuditJobHandler';
import { B1MoveJobHandler } from './B1MoveJobHandler';
import { B2MoveJobHandler } from './B2MoveJobHandler';

export class JobHandlerFactory {
    // Factory logic to map EventType to the CORRECT handler for that event
    // e.g., if we receive "WorkflowStarted", we need to run "ClaimLoadingJobHandler"
    getHandlerForEvent(eventType: EventType): IJobHandler | null {
        switch (eventType) {
            case EventType.WorkflowStarted:
                return new ClaimLoadingJobHandler();
            case EventType.ClaimLoadingCompleted:
                return new ClaimAuditJobHandler();
            case EventType.ClaimAuditCompleted:
                return new B1MoveJobHandler();
            case EventType.B1MoveCompleted:
                return new B2MoveJobHandler();
            case EventType.B2MoveCompleted:
                // Workflow is entirely completed here.
                return null;
            default:
                throw new Error(`No handler found for event type: ${eventType}`);
        }
    }
}
