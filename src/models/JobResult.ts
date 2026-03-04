export interface JobResult {
    success: boolean;
    errorMessage?: string;
    errorType?: 'transient' | 'deterministic';
    resultData?: Record<string, any>;
}

export function createSuccessResult(resultData?: Record<string, any>): JobResult {
    return {
        success: true,
        resultData,
    };
}

export function createErrorResult(
    errorMessage: string,
    errorType: 'transient' | 'deterministic' = 'transient'
): JobResult {
    return {
        success: false,
        errorMessage,
        errorType,
    };
}
