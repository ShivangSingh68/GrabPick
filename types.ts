export interface Messages {
    success: boolean,
    message?: string,
    error?: string | Error,
    data?: unknown,
}