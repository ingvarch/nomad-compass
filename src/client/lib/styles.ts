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

// Select-specific styles (same as input but may need distinct styling later)
export const selectStyles = inputStyles;

// Input with error state
export const inputErrorStyles =
  'w-full p-2 border border-red-500 dark:border-red-400 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500';

// Button base styles
const buttonBase =
  'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';

// Primary button (blue)
export const buttonPrimaryStyles = `${buttonBase} px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-800`;

// Secondary button (gray/white)
export const buttonSecondaryStyles = `${buttonBase} px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500 dark:focus:ring-offset-gray-800`;

// Danger button (red)
export const buttonDangerStyles = `${buttonBase} px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:focus:ring-offset-gray-800`;

// Small button variants
export const buttonPrimarySmallStyles = `${buttonBase} px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-800`;

export const buttonSecondarySmallStyles = `${buttonBase} px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500 dark:focus:ring-offset-gray-800`;

// Success button (green)
export const buttonSuccessStyles = `${buttonBase} px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:focus:ring-offset-gray-800`;

// Success button - small
export const buttonSuccessSmallStyles = `${buttonBase} px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:focus:ring-offset-gray-800`;

// Danger button - small
export const buttonDangerSmallStyles = `${buttonBase} px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:focus:ring-offset-gray-800`;

// Monokai theme input styles (for job/namespace forms with monokai dark theme)
export const inputMonokaiBaseStyles =
  'border border-gray-300 dark:border-monokai-muted rounded-md bg-white dark:bg-monokai-surface text-gray-900 dark:text-monokai-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-blue';

export const inputMonokaiStyles = `w-full p-2 ${inputMonokaiBaseStyles}`;

export const inputMonokaiFlexStyles = `flex-1 p-2 ${inputMonokaiBaseStyles}`;

export const inputMonokaiErrorStyles =
  'w-full p-2 border border-red-500 dark:border-monokai-red rounded-md bg-white dark:bg-monokai-surface text-gray-900 dark:text-monokai-text focus:outline-none focus:ring-2 focus:ring-red-500';

// Table styles
export const tableStyles = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
export const tableHeaderStyles = 'bg-gray-50 dark:bg-gray-700/50';
export const tableHeaderCellStyles = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase';
export const tableBodyStyles = 'divide-y divide-gray-200 dark:divide-gray-700';
export const tableRowHoverStyles = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
