import { WorkflowEvent } from '../models/WorkflowEvent';
import { JobResult } from '../models/JobResult';

export interface IJobHandler {
    execute(event: WorkflowEvent): Promise<JobResult>;
}
