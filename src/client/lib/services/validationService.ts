// src/lib/services/validationService.ts

/**
 * Validates a job name against Nomad's requirements
 * Job names must start with a letter or number and only contain
 * letters, numbers, underscores, hyphens, and dots
 */
export function validateJobName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name);
}
