/**
 * "(optional)" after a field label
 */
export function OptionalMark() {
  return <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>;
}

/**
 * Error under a field; nothing without a message
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>;
}
