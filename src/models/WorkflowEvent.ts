export enum EventType {
    WorkflowStarted = 'WorkflowStarted',
    ClaimLoadingCompleted = 'ClaimLoadingCompleted',
    ClaimAuditCompleted = 'ClaimAuditCompleted',
    B1MoveCompleted = 'B1MoveCompleted',
    B2MoveCompleted = 'B2MoveCompleted'
}

export interface WorkflowEvent {
    eventType: EventType;
    workflowId: string;
    eventData: Record<string, any>;
    createdAt: Date;
}

export function createWorkflowEvent(
    eventType: EventType,
    workflowId: string,
    eventData: Record<string, any> = {}
): WorkflowEvent {
    return {
        eventType,
        workflowId,
        eventData,
        createdAt: new Date(),
    };
}
