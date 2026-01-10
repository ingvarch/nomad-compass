/**
 * Shared style constants for form inputs and UI elements.
 * These eliminate duplication of Tailwind class strings across components.
 */

// Base input styles (text inputs, selects)
export const inputBaseStyles =
  'border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

// Full-width input (most common)
export const inputStyles = `w-full p-2 ${inputBaseStyles}`;

// Flex-grow input for use in flex containers
export const inputFlexStyles = `flex-1 p-2 ${inputBaseStyles}`;

// Monospace input for code/technical values
export const inputMonoStyles = `${inputFlexStyles} font-mono text-sm`;

// Checkbox styles
export const checkboxStyles =
  'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded';

// Textarea styles
export const textareaStyles = `${inputStyles} resize-y min-h-[100px]`;

// Select-specific styles (same as input but may need distinct styling later)
export const selectStyles = inputStyles;

// Input with error state
export const inputErrorStyles =
  'w-full p-2 border border-red-500 dark:border-red-400 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500';

/**
 * Get input styles with optional error state
 */
export function getInputStyles(isError = false): string {
  return isError ? inputErrorStyles : inputStyles;
}

/**
 * Combine base styles with additional classes
 */
export function combineStyles(base: string, additional?: string): string {
  return additional ? `${base} ${additional}` : base;
}
