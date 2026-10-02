import type { NomadJob, NomadJobDispatchRequest, NomadParameterizedJobConfig } from '../../types/nomad';

// Nomad's DispatchPayloadSizeLimit, in bytes before Base64
export const DISPATCH_PAYLOAD_SIZE_LIMIT = 16 * 1024;

export type ParameterizedNomadJob = NomadJob & { ParameterizedJob: NomadParameterizedJobConfig };

export interface DispatchMetaField {
  key: string;
  required: boolean;
}

export interface DispatchErrors {
  // Message per meta key
  meta: Record<string, string>;
  payload?: string;
  priority?: string;
}

export function dispatchedJobPrefix(jobId: string): string {
  return `${jobId}/dispatch-`;
}

/**
 * A dispatched job is the child job Nomad creates for each dispatch of a parameterized job.
 */
export function isDispatchedJob(job: { ID: string; ParentID?: string }): boolean {
  return !!job.ParentID && job.ID.startsWith(dispatchedJobPrefix(job.ParentID));
}

/**
 * Like Nomad's IsParameterized: a dispatched job keeps the block of its parent and cannot be dispatched again.
 */
export function isParameterized<T extends Pick<NomadJob, 'ParameterizedJob' | 'Dispatched'>>(
  job: T
): job is T & { ParameterizedJob: NomadParameterizedJobConfig } {
  return !!job.ParameterizedJob && !job.Dispatched;
}

/**
 * Meta keys a dispatch may set. Nomad rejects any other key.
 */
export function dispatchMetaFields(config: NomadParameterizedJobConfig): DispatchMetaField[] {
  return [
    ...(config.MetaRequired ?? []).map((key) => ({ key, required: true })),
    ...(config.MetaOptional ?? []).map((key) => ({ key, required: false })),
  ];
}

/**
 * What Nomad would reject: a missing required meta key or payload, a payload over the limit,
 * a priority below 1. An empty priority keeps the priority of the job.
 */
export function validateDispatch(
  config: NomadParameterizedJobConfig,
  meta: Record<string, string>,
  payloadSize: number,
  priority = ''
): DispatchErrors {
  const errors: DispatchErrors = { meta: {} };

  (config.MetaRequired ?? []).forEach((key) => {
    if (!meta[key]?.trim()) errors.meta[key] = 'Required';
  });

  if (config.Payload === 'required' && payloadSize === 0) {
    errors.payload = 'This job requires a payload';
  } else if (payloadSize > DISPATCH_PAYLOAD_SIZE_LIMIT) {
    errors.payload = `Payload is ${payloadSize} bytes, the limit is ${DISPATCH_PAYLOAD_SIZE_LIMIT}`;
  }

  // The upper bound is job_max_priority of the servers, so Nomad checks it
  if (priority !== '' && !(/^\d+$/.test(priority) && Number(priority) >= 1)) {
    errors.priority = 'Priority must be a whole number of 1 or more';
  }

  return errors;
}

export function hasDispatchErrors(errors: DispatchErrors): boolean {
  return Object.keys(errors.meta).length > 0 || !!errors.payload || !!errors.priority;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * Body of a dispatch. An empty meta key is left out, so the job keeps its own value for it.
 */
export function dispatchRequest(
  meta: Record<string, string>,
  payload: Uint8Array,
  priority = ''
): NomadJobDispatchRequest {
  const request: NomadJobDispatchRequest = {
    Meta: Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== '')),
  };
  if (payload.length > 0) request.Payload = toBase64(payload);
  if (priority !== '') request.Priority = Number(priority);
  return request;
}
