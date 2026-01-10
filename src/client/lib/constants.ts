/**
 * Application-wide constants
 */

/**
 * Default Nomad namespace used when none is specified.
 * This is the standard Nomad default namespace.
 */
export const DEFAULT_NAMESPACE = 'default';

/**
 * Job name validation: must start with letter/number,
 * then letters/numbers/underscores/hyphens/dots
 */
export const JOB_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export const JOB_NAME_ERROR =
  'Job name must start with a letter or number and contain only letters, numbers, hyphens, underscores, and dots';
