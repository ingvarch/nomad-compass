/**
 * Unified error handling utilities
 *
 * This module consolidates all error handling logic to ensure DRY compliance.
 * Use these functions instead of inline error handling in components.
 */

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
 * Permission error messages by operation
 */
const permissionMessages: Record<string, string> = {
  'create-namespace': 'You do not have permission to create namespaces',
  'delete-namespace': 'You do not have permission to delete namespaces',
  'update-namespace': 'You do not have permission to update namespaces',
  'create-job': 'You do not have permission to create jobs',
  'update-job': 'You do not have permission to update jobs',
  'stop-job': 'You do not have permission to stop jobs',
  'start-job': 'You do not have permission to start jobs',
  'delete-job': 'You do not have permission to delete jobs',
};

/**
 * Get a user-friendly permission error message based on the operation
 */
export function getPermissionErrorMessage(operation: string): string {
  return permissionMessages[operation] || 'Insufficient permissions to perform this action';
}

/**
 * Extract error message from unknown error type
 *
 * Handles:
 * - PermissionError: returns operation-specific or generic permission message
 * - Error: returns error.message
 * - string: returns the string directly
 * - unknown: returns fallback message
 *
 * @param error - The caught error (unknown type)
 * @param fallback - Fallback message if error type is unrecognized
 * @param operation - Optional operation name for permission errors
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'An error occurred',
  operation?: string
): string {
  if (isPermissionError(error)) {
    return operation ? getPermissionErrorMessage(operation) : error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}
