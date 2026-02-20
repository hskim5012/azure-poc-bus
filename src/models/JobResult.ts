export interface JobResult {
    success: boolean;
    errorMessage?: string;
    resultData?: Record<string, any>;
}

export function createSuccessResult(resultData?: Record<string, any>): JobResult {
    return {
        success: true,
        resultData,
    };
}

export function createErrorResult(errorMessage: string): JobResult {
    return {
        success: false,
        errorMessage,
    };
}
