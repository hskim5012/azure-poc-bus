export type JobErrorType = 'transient' | 'permanent';

/**
 * Typed job error used to decide retry vs dead-letter behavior.
 */
export class JobError extends Error {
    readonly errorType: JobErrorType;
    readonly details?: Record<string, unknown>;

    constructor(message: string, errorType: JobErrorType, details?: Record<string, unknown>) {
        super(message);
        this.name = 'JobError';
        this.errorType = errorType;
        this.details = details;
    }
}

export class TransientJobError extends JobError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 'transient', details);
        this.name = 'TransientJobError';
    }
}

export class PermanentJobError extends JobError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 'permanent', details);
        this.name = 'PermanentJobError';
    }
}

export function isJobError(error: unknown): error is JobError {
    return error instanceof JobError;
}
