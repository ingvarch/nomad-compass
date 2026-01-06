/**
 * Custom error for permission-related failures (403 Forbidden)
 */
export class PermissionError extends Error {
  public readonly statusCode: number = 403;
  public readonly isPermissionError: boolean = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'PermissionError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionError);
    }
  }
}

/**
 * Type guard to check if an error is a PermissionError
 */
export function isPermissionError(error: unknown): error is PermissionError {
  return (
    error instanceof PermissionError ||
    (error !== null &&
      typeof error === 'object' &&
      'isPermissionError' in error &&
      (error as PermissionError).isPermissionError === true)
  );
}

/**
 * Get a user-friendly permission error message based on the operation
 */
export function getPermissionErrorMessage(operation: string): string {
  const messages: Record<string, string> = {
    'create-namespace': 'You do not have permission to create namespaces',
    'delete-namespace': 'You do not have permission to delete namespaces',
    'update-namespace': 'You do not have permission to update namespaces',
    'create-job': 'You do not have permission to create jobs',
    'update-job': 'You do not have permission to update jobs',
    'stop-job': 'You do not have permission to stop jobs',
    'start-job': 'You do not have permission to start jobs',
    'delete-job': 'You do not have permission to delete jobs',
  };
  return messages[operation] || 'Insufficient permissions to perform this action';
}
