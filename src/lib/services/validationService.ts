// src/lib/services/validationService.ts

/**
 * Validates a job name against Nomad's requirements
 * Job names must start with a letter or number and only contain
 * letters, numbers, underscores, hyphens, and dots
 */
export function validateJobName(name: string): boolean {
    const jobNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    return jobNameRegex.test(name);
}

/**
 * Validates that an image name is provided
 */
export function validateImageName(image: string): boolean {
    return image.trim().length > 0;
}

/**
 * Validates Docker auth credentials
 */
export function validateDockerAuth(usePrivateRegistry: boolean, username?: string, password?: string): string | null {
    if (!usePrivateRegistry) return null;

    if (!username || username.trim() === '') {
        return 'Username is required for private registry';
    }

    if (!password || password.trim() === '') {
        return 'Password is required for private registry';
    }

    return null;
}
