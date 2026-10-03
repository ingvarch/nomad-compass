// src/lib/api/nomad.ts
import type {
  NomadJobsResponse,
  NomadJobListStub,
  ApiError,
  NomadNamespace,
  NomadNode,
  NomadNodeDetail,
  NomadAgentSelf,
  NomadAgentMembers,
  NomadAllocation,
  NomadEvaluation,
  NomadJobPlanResponse,
  NomadJob,
  NomadJobInput,
  NomadJobVersion,
  JobSubmission,
  JobSubmitResponse,
  JobStopResponse,
  LogResponse,
  NomadServiceRegistration,
  NomadDrainSpec,
  NomadNodeActionResponse,
  NomadStopAllocationOptions,
  NomadAllocationStopResponse,
  NomadJobDispatchRequest,
  NomadJobDispatchResponse,
  NomadAllocFileInfo,
} from '../../types/nomad';
import {
  NomadAclPolicy,
  NomadAclPolicyListItem,
  NomadAclRole,
  NomadAclRoleListItem,
  NomadAclToken,
  NomadAclTokenListItem,
  TokenType,
} from '../../types/acl';
import {
  NomadVariable,
  NomadVariableMetadata,
  NomadVariableInput,
} from '../../types/variables';
import {
  NomadNodePool,
  NomadNodePoolInput,
} from '../../types/nodepools';
import {
  NomadDeployment,
  NomadDeploymentPromoteRequest,
} from '../../types/deployment';
import {
  NomadJobScaleRequest,
  NomadJobScaleResponse,
} from '../../types/scale';
import type {
  NomadCSIPlugin,
  NomadCSIPluginListStub,
  NomadCSISnapshot,
  NomadCSIVolume,
  NomadCSIVolumeListStub,
  NomadCSIVolumeRegistration,
} from '../../types/csi';
import { PermissionError, isApiError } from '../errors';
import { DEFAULT_NAMESPACE } from '../constants';
import { periodicLaunchPrefix } from '../services/periodicService';
import { dispatchedJobPrefix } from '../services/dispatchService';

type RequestOptions = RequestInit & { params?: Record<string, string | boolean> };

/**
 * Runs a request; a failure that is not a PermissionError or ApiError becomes a network error
 */
async function withNetworkErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    // Re-throw PermissionError and ApiError as-is
    if (error instanceof PermissionError || (error as ApiError).statusCode) {
      throw error;
    }

    // Handle network errors
    const networkError: ApiError = {
      statusCode: 0,
      message: `Network error: ${(error as Error).message}`,
    };
    throw networkError;
  }
}

/**
 * NomadClient - A client for interacting with Nomad API
 * Token is now handled via httpOnly cookie for security
 */
export class NomadClient {
  private baseUrl: string;

  constructor() {
    // Always use proxy endpoint (SPA architecture)
    // Token is sent automatically via httpOnly cookie
    this.baseUrl = '/api/nomad';
  }

  /**
   * Get CSRF token from cookie
   */
  private getCSRFToken(): string | null {
    const name = 'csrf-token';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  /**
   * Path of a job endpoint. Job IDs can contain "/", so the ID is encoded
   * like the Nomad Go client does (url.PathEscape).
   */
  private jobEndpoint(id: string, suffix = ''): string {
    return `/v1/job/${encodeURIComponent(id)}${suffix}`;
  }

  /**
   * Build URL with query parameters if provided
   */
  private url(endpoint: string, params?: Record<string, string | boolean>): string {
    const url = `${this.baseUrl}${endpoint}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Sends a request to the Nomad API and returns the successful response
   * Token is sent via httpOnly cookie, only CSRF token needs to be added
   */
  private async send(endpoint: string, options: RequestOptions = {}): Promise<Response> {
    // Extract and remove params from options if they exist
    const { params, ...fetchOptions } = options;
    const url = this.url(endpoint, params);

    // Determine if this is a state-changing request that needs CSRF protection
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // Extract headers from fetchOptions
    const { headers: optHeaders, ...restFetchOptions } = fetchOptions;

    // Set up headers - no X-Nomad-Token needed (sent via httpOnly cookie)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(optHeaders as Record<string, string> | undefined),
    };

    // Add CSRF token for state-changing requests
    if (needsCSRF) {
      const csrfToken = this.getCSRFToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      // Missing CSRF token will result in 403 from server
    }

    const response = await fetch(url, {
      ...restFetchOptions,
      headers,
      credentials: 'include', // Include cookies in request
    });

    // Check if the request was successful
    if (!response.ok) {
      // Try to parse the error response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, create a generic error
        errorData = {
          error: 'Request failed',
          message: `API request failed with status ${response.status}`,
          status: response.status
        };
      }

      // Handle 403 Forbidden specifically with a PermissionError
      if (response.status === 403) {
        throw new PermissionError(
          errorData.message || 'Insufficient permissions to perform this action'
        );
      }

      const error: ApiError = {
        statusCode: response.status,
        message: errorData.message || errorData.error || `API request failed with status ${response.status}`,
      };
      throw error;
    }

    return response;
  }

  /**
   * Generic request method for Nomad API
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return withNetworkErrors(async () => {
      const response = await this.send(endpoint, options);

      // Check content length - if empty, return undefined
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        return undefined as T;
      }

      // Check if response is expected to be JSON
      if (response.headers.get('content-type')?.includes('application/json')) {
        const text = await response.text();
        // Handle empty response body
        if (!text || text.trim() === '') {
          return undefined as T;
        }
        return JSON.parse(text);
      } else {
        // For non-JSON responses (like logs), return text
        const text = await response.text();
        return { Data: text } as unknown as T;
      }
    });
  }

  /**
   * Raw bytes of a response, for file contents that may not be text
   */
  private async requestBytes(endpoint: string, options: RequestOptions = {}): Promise<Uint8Array> {
    return withNetworkErrors(async () => {
      const response = await this.send(endpoint, options);
      return new Uint8Array(await response.arrayBuffer());
    });
  }

  /**
   * Get all jobs
   */
  async getJobs(namespace?: string): Promise<NomadJobsResponse> {
    const params: Record<string, string> = {
      namespace: namespace || '*'
    };

    const response = await this.request<NomadJobListStub[]>('/v1/jobs', {
      method: 'GET',
      params
    });

    return { Jobs: response };
  }

  /**
   * Get job details by ID
   */
  async getJob(id: string, namespace: string = DEFAULT_NAMESPACE): Promise<NomadJob> {
    return this.request<NomadJob>(this.jobEndpoint(id), {
      params: { namespace }
    });
  }

  /**
   * Get job versions history
   */
  async getJobVersions(id: string, namespace: string = DEFAULT_NAMESPACE): Promise<{ Versions: NomadJobVersion[] }> {
    return this.request<{ Versions: NomadJobVersion[] }>(this.jobEndpoint(id, '/versions'), {
      params: { namespace }
    });
  }

  /**
   * Get job evaluations
   */
  async getJobEvaluations(jobId: string, namespace: string = DEFAULT_NAMESPACE): Promise<NomadEvaluation[]> {
    return this.request<NomadEvaluation[]>(this.jobEndpoint(jobId, '/evaluations'), {
      params: { namespace }
    });
  }

  /**
   * Revert job to a previous version
   */
  async revertJob(
    jobId: string,
    version: number,
    namespace: string = DEFAULT_NAMESPACE
  ): Promise<{ EvalID: string; EvalCreateIndex: number; JobModifyIndex: number }> {
    return this.request(this.jobEndpoint(jobId, '/revert'), {
      method: 'POST',
      params: { namespace },
      body: JSON.stringify({
        JobID: jobId,
        JobVersion: version,
      }),
    });
  }

  /**
   * Plan a job (dry-run) to preview scheduler decisions
   */
  async planJob(
    jobId: string,
    jobSpec: JobSubmission | NomadJob | NomadJobInput,
    namespace: string = DEFAULT_NAMESPACE,
    diff: boolean = true
  ): Promise<NomadJobPlanResponse> {
    const job = 'Job' in jobSpec ? jobSpec.Job : jobSpec;
    return this.request<NomadJobPlanResponse>(this.jobEndpoint(jobId, '/plan'), {
      method: 'POST',
      params: { namespace },
      body: JSON.stringify({
        Job: job,
        Diff: diff,
      }),
    });
  }

  /**
   * Create a new job or update an existing job
   *
   * Nomad API uses the same endpoint for both create and update operations.
   * If the job ID already exists, the job will be updated.
   */
  async createJob(jobSpec: JobSubmission): Promise<JobSubmitResponse> {
    return this.request<JobSubmitResponse>('/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(jobSpec),
    });
  }

  /**
   * Update an existing job
   *
   * This is a wrapper around createJob but makes the semantic intention clearer.
   * In Nomad's API, updating a job is just creating a job with an existing ID.
   */
  async updateJob(jobSpec: JobSubmission): Promise<JobSubmitResponse> {
    return this.createJob(jobSpec);
  }

  /**
   * Stop a job
   */
  async stopJob(id: string, namespace: string = DEFAULT_NAMESPACE): Promise<JobStopResponse> {
    return this.request<JobStopResponse>(this.jobEndpoint(id), {
      method: 'DELETE',
      params: { namespace }
    });
  }

  /**
   * Delete a job (purge)
   */
  async deleteJob(id: string, namespace: string = DEFAULT_NAMESPACE): Promise<JobStopResponse> {
    return this.request<JobStopResponse>(this.jobEndpoint(id), {
      method: 'DELETE',
      params: {
        namespace,
        purge: 'true'
      }
    });
  }

  /**
   * Get job allocations
   */
  async getJobAllocations(jobId: string, namespace: string = DEFAULT_NAMESPACE): Promise<NomadAllocation[]> {
    return this.request<NomadAllocation[]>(this.jobEndpoint(jobId, '/allocations'), {
      params: { namespace }
    });
  }

  /**
   * Launch a periodic job now (Nomad rejects this while the schedule is paused)
   */
  async forcePeriodicLaunch(
    jobId: string,
    namespace: string = DEFAULT_NAMESPACE
  ): Promise<{ EvalID: string; EvalCreateIndex: number }> {
    return this.request(this.jobEndpoint(jobId, '/periodic/force'), {
      method: 'POST',
      params: { namespace },
    });
  }

  /**
   * Get the launches (child jobs) of a periodic job
   */
  async getPeriodicLaunches(jobId: string, namespace: string = DEFAULT_NAMESPACE): Promise<NomadJobListStub[]> {
    return this.request<NomadJobListStub[]>('/v1/jobs', {
      params: { namespace, prefix: periodicLaunchPrefix(jobId) },
    });
  }

  /**
   * Get the dispatched jobs (child jobs) of a parameterized job
   */
  async getDispatchedJobs(jobId: string, namespace: string = DEFAULT_NAMESPACE): Promise<NomadJobListStub[]> {
    return this.request<NomadJobListStub[]>('/v1/jobs', {
      params: { namespace, prefix: dispatchedJobPrefix(jobId) },
    });
  }

  /**
   * Dispatch a parameterized job (Nomad rejects this while the job is stopped).
   * For a token it has seen, Nomad returns the job it dispatched then instead of a new one.
   */
  async dispatchJob(
    jobId: string,
    request: NomadJobDispatchRequest,
    namespace: string = DEFAULT_NAMESPACE,
    idempotencyToken?: string
  ): Promise<NomadJobDispatchResponse> {
    const params: Record<string, string> = { namespace };
    if (idempotencyToken) params.idempotency_token = idempotencyToken;

    return this.request<NomadJobDispatchResponse>(this.jobEndpoint(jobId, '/dispatch'), {
      method: 'POST',
      params,
      body: JSON.stringify(request),
    });
  }

  /**
   * Get allocation info
   */
  async getAllocation(allocId: string): Promise<NomadAllocation> {
    return this.request<NomadAllocation>(`/v1/allocation/${allocId}`);
  }

  /**
   * Restart one task of an allocation in place, or all its running tasks when no task is given
   */
  async restartAllocation(allocId: string, taskName?: string, namespace?: string): Promise<void> {
    await this.request<void>(`/v1/client/allocation/${encodeURIComponent(allocId)}/restart`, {
      method: 'POST',
      params: namespace ? { namespace } : undefined,
      body: JSON.stringify({ TaskName: taskName ?? '' }),
    });
  }

  /**
   * Stop an allocation gracefully or immediately; the scheduler then places a replacement
   */
  async stopAllocation(
    allocId: string,
    options?: NomadStopAllocationOptions,
    namespace?: string
  ): Promise<NomadAllocationStopResponse> {
    const params: Record<string, string | boolean> = {};
    if (options?.noShutdownDelay) params.no_shutdown_delay = true;
    if (options?.reschedule) params.reschedule = true;
    if (namespace) params.namespace = namespace;

    return this.request<NomadAllocationStopResponse>(`/v1/allocation/${encodeURIComponent(allocId)}/stop`, {
      method: 'POST',
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  /**
   * Reschedule the failed allocations of a job now, even past their reschedule limit
   */
  async rescheduleFailedAllocations(
    jobId: string,
    namespace: string = DEFAULT_NAMESPACE
  ): Promise<{ EvalID: string; EvalCreateIndex: number; JobModifyIndex: number }> {
    return this.request(this.jobEndpoint(jobId, '/evaluate'), {
      method: 'POST',
      params: { namespace },
      body: JSON.stringify({
        JobID: jobId,
        EvalOptions: { ForceReschedule: true },
      }),
    });
  }

  /**
   * List a directory of an allocation; paths start at the allocation directory "/"
   */
  async listAllocFiles(allocId: string, path: string): Promise<NomadAllocFileInfo[]> {
    return this.request<NomadAllocFileInfo[]>(`/v1/client/fs/ls/${encodeURIComponent(allocId)}`, {
      params: { path },
    });
  }

  async statAllocFile(allocId: string, path: string): Promise<NomadAllocFileInfo> {
    return this.request<NomadAllocFileInfo>(`/v1/client/fs/stat/${encodeURIComponent(allocId)}`, {
      params: { path },
    });
  }

  /**
   * The first `limit` bytes of a file. Nomad answers some failures, like a directory
   * or a secret, with 200 and the error as content: stat the path first.
   */
  async readAllocFile(allocId: string, path: string, limit: number): Promise<Uint8Array> {
    return this.requestBytes(`/v1/client/fs/readat/${encodeURIComponent(allocId)}`, {
      params: { path, offset: '0', limit: String(limit) },
    });
  }

  /**
   * Link that downloads the whole file; the browser sends the token cookie with it
   */
  allocFileDownloadUrl(allocId: string, path: string): string {
    return this.url(`/v1/client/fs/cat/${encodeURIComponent(allocId)}`, { path });
  }

  /**
   * Send a POSIX signal to a task within an allocation
   */
  async signalTask(
    allocId: string,
    taskName: string,
    signal: string,
    namespace?: string
  ): Promise<void> {
    await this.request<void>(`/v1/client/allocation/${encodeURIComponent(allocId)}/signal`, {
      method: 'POST',
      params: namespace ? { namespace } : undefined,
      body: JSON.stringify({
        Task: taskName,
        Signal: signal,
      }),
    });
  }

  /**
   * Get evaluation info
   */
  async getEvaluation(evalId: string): Promise<NomadEvaluation> {
    return this.request<NomadEvaluation>(`/v1/evaluation/${evalId}`);
  }

  /**
   * Get service registrations for a service name
   */
  async getServiceRegistrations(serviceName: string, namespace: string = DEFAULT_NAMESPACE): Promise<NomadServiceRegistration[]> {
    return this.request<NomadServiceRegistration[]>(`/v1/service/${serviceName}`, {
      params: { namespace }
    });
  }

  /**
   * Get logs for an allocation
   */
  async getAllocationLogs(allocId: string, taskName: string, logType: string, plain: boolean = true): Promise<LogResponse> {
    return this.request<LogResponse>(`/v1/client/fs/logs/${allocId}`, {
      method: 'GET',
      params: {
        task: taskName,
        type: logType,
        plain,
      },
    });
  }

  /**
   * Get available namespaces
   */
  async getNamespaces(): Promise<NomadNamespace[]> {
    try {
      return this.request<NomadNamespace[]>('/v1/namespaces');
    } catch {
      // Return default namespace if API fails
      return [{ Name: DEFAULT_NAMESPACE }];
    }
  }

  /**
   * Get a single namespace by name
   */
  async getNamespace(name: string): Promise<NomadNamespace> {
    return this.request<NomadNamespace>(`/v1/namespace/${name}`);
  }

  /**
   * Create a new namespace
   */
  async createNamespace(namespace: NomadNamespace): Promise<void> {
    await this.request<void>('/v1/namespace', {
      method: 'POST',
      body: JSON.stringify(namespace),
    });
  }

  /**
   * Update an existing namespace
   */
  async updateNamespace(namespace: NomadNamespace): Promise<void> {
    await this.request<void>(`/v1/namespace/${namespace.Name}`, {
      method: 'POST',
      body: JSON.stringify(namespace),
    });
  }

  /**
   * Delete a namespace
   */
  async deleteNamespace(name: string): Promise<void> {
    await this.request<void>(`/v1/namespace/${name}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all nodes in the cluster
   * Uses resources=true to include NodeResources for cluster resource calculations
   */
  async getNodes(): Promise<NomadNode[]> {
    return this.request<NomadNode[]>('/v1/nodes', {
      params: { resources: 'true' },
    });
  }

  /**
   * Get a single node by ID
   */
  async getNode(nodeId: string): Promise<NomadNodeDetail> {
    return this.request<NomadNodeDetail>(`/v1/node/${nodeId}`);
  }

  /**
   * Get allocations for a specific node
   */
  async getNodeAllocations(nodeId: string): Promise<NomadAllocation[]> {
    return this.request<NomadAllocation[]>(`/v1/node/${nodeId}/allocations`);
  }

  /**
   * Toggle or configure node drain status
   */
  async drainNode(
    nodeId: string,
    drainSpec: NomadDrainSpec | null,
    markEligible: boolean = false
  ): Promise<NomadNodeActionResponse> {
    return this.request<NomadNodeActionResponse>(`/v1/node/${encodeURIComponent(nodeId)}/drain`, {
      method: 'POST',
      body: JSON.stringify({
        NodeID: nodeId,
        DrainSpec: drainSpec,
        MarkEligible: markEligible,
      }),
    });
  }

  /**
   * Toggle node scheduling eligibility (eligible or ineligible)
   */
  async toggleNodeEligibility(
    nodeId: string,
    eligibility: 'eligible' | 'ineligible'
  ): Promise<NomadNodeActionResponse> {
    return this.request<NomadNodeActionResponse>(`/v1/node/${encodeURIComponent(nodeId)}/eligibility`, {
      method: 'POST',
      body: JSON.stringify({
        NodeID: nodeId,
        Eligibility: eligibility,
      }),
    });
  }

  /**
   * Purge a dead/offline node from cluster state
   */
  async purgeNode(nodeId: string): Promise<NomadNodeActionResponse> {
    return this.request<NomadNodeActionResponse>(`/v1/node/${encodeURIComponent(nodeId)}/purge`, {
      method: 'POST',
      body: JSON.stringify({
        NodeID: nodeId,
      }),
    });
  }

  /**
   * Get agent self information (version, region, etc.)
   */
  async getAgentSelf(): Promise<NomadAgentSelf> {
    return this.request<NomadAgentSelf>('/v1/agent/self');
  }

  /**
   * Get cluster members (servers)
   */
  async getAgentMembers(): Promise<NomadAgentMembers> {
    return this.request<NomadAgentMembers>('/v1/agent/members');
  }

  /**
   * Get all allocations with optional filters
   */
  async getAllocations(params?: {
    namespace?: string;
    prefix?: string;
  }): Promise<NomadAllocation[]> {
    const queryParams: Record<string, string> = {
      resources: 'true', // Include AllocatedResources in response
    };
    if (params?.namespace) {
      queryParams.namespace = params.namespace;
    } else {
      queryParams.namespace = '*';
    }
    if (params?.prefix) {
      queryParams.prefix = params.prefix;
    }
    return this.request<NomadAllocation[]>('/v1/allocations', {
      params: queryParams,
    });
  }

  /**
   * Trigger garbage collection on the cluster
   * This cleans up old allocations, evaluations, and deployments
   */
  async garbageCollect(): Promise<void> {
    await this.request<void>('/v1/system/gc', {
      method: 'PUT',
    });
  }

  // ==================== ACL Policies ====================

  /**
   * Get all ACL policies
   */
  async getAclPolicies(): Promise<NomadAclPolicyListItem[]> {
    return this.request<NomadAclPolicyListItem[]>('/v1/acl/policies');
  }

  /**
   * Get a single ACL policy by name
   */
  async getAclPolicy(name: string): Promise<NomadAclPolicy> {
    return this.request<NomadAclPolicy>(`/v1/acl/policy/${encodeURIComponent(name)}`);
  }

  /**
   * Create or update an ACL policy
   */
  async createAclPolicy(name: string, description: string, rules: string): Promise<void> {
    await this.request<void>(`/v1/acl/policy/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify({ Name: name, Description: description, Rules: rules }),
    });
  }

  /**
   * Update an existing ACL policy (alias for createAclPolicy)
   */
  async updateAclPolicy(name: string, description: string, rules: string): Promise<void> {
    return this.createAclPolicy(name, description, rules);
  }

  /**
   * Delete an ACL policy
   */
  async deleteAclPolicy(name: string): Promise<void> {
    await this.request<void>(`/v1/acl/policy/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  // ==================== ACL Roles ====================

  /**
   * Get all ACL roles
   */
  async getAclRoles(): Promise<NomadAclRoleListItem[]> {
    return this.request<NomadAclRoleListItem[]>('/v1/acl/roles');
  }

  /**
   * Get a single ACL role by ID
   */
  async getAclRole(id: string): Promise<NomadAclRole> {
    return this.request<NomadAclRole>(`/v1/acl/role/${encodeURIComponent(id)}`);
  }

  /**
   * Create a new ACL role
   */
  async createAclRole(role: {
    Name: string;
    Description?: string;
    Policies: { Name: string }[];
  }): Promise<NomadAclRole> {
    return this.request<NomadAclRole>('/v1/acl/role', {
      method: 'POST',
      body: JSON.stringify(role),
    });
  }

  /**
   * Update an existing ACL role
   */
  async updateAclRole(
    id: string,
    role: {
      ID: string;
      Name: string;
      Description?: string;
      Policies: { Name: string }[];
    }
  ): Promise<NomadAclRole> {
    return this.request<NomadAclRole>(`/v1/acl/role/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify(role),
    });
  }

  /**
   * Delete an ACL role
   */
  async deleteAclRole(id: string): Promise<void> {
    await this.request<void>(`/v1/acl/role/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // ==================== ACL Tokens ====================

  /**
   * Get all ACL tokens
   */
  async getAclTokens(): Promise<NomadAclTokenListItem[]> {
    return this.request<NomadAclTokenListItem[]>('/v1/acl/tokens');
  }

  /**
   * Get a single ACL token by accessor ID
   */
  async getAclToken(accessorId: string): Promise<NomadAclToken> {
    return this.request<NomadAclToken>(`/v1/acl/token/${encodeURIComponent(accessorId)}`);
  }

  /**
   * Get the current token's information
   */
  async getAclTokenSelf(): Promise<NomadAclToken> {
    return this.request<NomadAclToken>('/v1/acl/token/self');
  }

  /**
   * Create a new ACL token
   */
  async createAclToken(token: {
    Name: string;
    Type: TokenType;
    Policies?: string[];
    Roles?: { Name: string }[];
    ExpirationTTL?: string;
    Global?: boolean;
  }): Promise<NomadAclToken> {
    return this.request<NomadAclToken>('/v1/acl/token', {
      method: 'POST',
      body: JSON.stringify(token),
    });
  }

  /**
   * Delete/revoke an ACL token
   */
  async deleteAclToken(accessorId: string): Promise<void> {
    await this.request<void>(`/v1/acl/token/${encodeURIComponent(accessorId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Format variable endpoint path (strips leading slash)
   */
  private varEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/v1/var/${cleanPath}`;
  }

  /**
   * List Nomad variables (metadata only)
   */
  async getVariables(namespace?: string, prefix?: string): Promise<NomadVariableMetadata[]> {
    const params: Record<string, string> = {};
    if (namespace) params.namespace = namespace;
    if (prefix) params.prefix = prefix;
    try {
      const res = await this.request<NomadVariableMetadata[] | null>('/v1/vars', { params });
      return res || [];
    } catch (err: unknown) {
      // 404 from Nomad means no variables found
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Get a single variable with all items/secrets
   */
  async getVariable(path: string, namespace?: string): Promise<NomadVariable> {
    const params = namespace ? { namespace } : undefined;
    return this.request<NomadVariable>(this.varEndpoint(path), { params });
  }

  /**
   * Create or update a Nomad variable
   */
  async putVariable(variable: NomadVariableInput): Promise<NomadVariable> {
    const params = variable.Namespace ? { namespace: variable.Namespace } : undefined;
    return this.request<NomadVariable>(this.varEndpoint(variable.Path), {
      method: 'PUT',
      params,
      body: JSON.stringify(variable),
    });
  }

  /**
   * Delete a Nomad variable
   */
  async deleteVariable(path: string, namespace?: string): Promise<void> {
    const params = namespace ? { namespace } : undefined;
    await this.request<void>(this.varEndpoint(path), {
      method: 'DELETE',
      params,
    });
  }

  // ==================== Node Pools ====================

  /**
   * Get all node pools
   */
  async getNodePools(): Promise<NomadNodePool[]> {
    return this.request<NomadNodePool[]>('/v1/node/pools');
  }

  /**
   * Get a single node pool by name
   */
  async getNodePool(name: string): Promise<NomadNodePool> {
    return this.request<NomadNodePool>(`/v1/node/pool/${encodeURIComponent(name)}`);
  }

  /**
   * Create or update a node pool
   */
  async createOrUpdateNodePool(pool: NomadNodePoolInput): Promise<void> {
    await this.request<void>(`/v1/node/pool/${encodeURIComponent(pool.Name)}`, {
      method: 'POST',
      body: JSON.stringify(pool),
    });
  }

  /**
   * Delete a node pool
   */
  async deleteNodePool(name: string): Promise<void> {
    await this.request<void>(`/v1/node/pool/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  /**
   * List nodes in a node pool
   */
  async getNodePoolNodes(name: string): Promise<NomadNode[]> {
    return this.request<NomadNode[]>(`/v1/node/pool/${encodeURIComponent(name)}/nodes`);
  }

  // ==================== Deployments & Canaries ====================

  /**
   * Get the latest deployment for a job, or null if no deployment exists
   */
  async getJobDeployment(jobId: string, namespace?: string): Promise<NomadDeployment | null> {
    try {
      const params = namespace ? { namespace } : undefined;
      const res = await this.request<NomadDeployment>(
        `/v1/job/${encodeURIComponent(jobId)}/deployment`,
        { params }
      );
      if (!res || !res.ID) {
        return null;
      }
      return res;
    } catch (err: unknown) {
      if (
        (isApiError(err) && (err.statusCode === 404 || err.message?.toLowerCase().includes('not found'))) ||
        (err instanceof Error && err.message?.toLowerCase().includes('not found'))
      ) {
        return null;
      }
      throw err;
    }
  }

  /**
   * List all deployments
   */
  async getDeployments(namespace?: string): Promise<NomadDeployment[]> {
    const params = namespace ? { namespace } : undefined;
    return this.request<NomadDeployment[]>('/v1/deployments', { params });
  }

  /**
   * Get a single deployment by ID
   */
  async getDeployment(id: string): Promise<NomadDeployment> {
    return this.request<NomadDeployment>(`/v1/deployment/${encodeURIComponent(id)}`);
  }

  /**
   * Promote canaries for a deployment
   */
  async promoteDeployment(
    deploymentId: string,
    options?: { all?: boolean; groups?: string[] }
  ): Promise<void> {
    const body: NomadDeploymentPromoteRequest = {
      DeploymentID: deploymentId,
      All: options?.all ?? true,
      Groups: options?.groups,
    };
    await this.request<void>(`/v1/deployment/promote/${encodeURIComponent(deploymentId)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Manually fail a deployment
   */
  async failDeployment(deploymentId: string): Promise<void> {
    await this.request<void>(`/v1/deployment/fail/${encodeURIComponent(deploymentId)}`, {
      method: 'POST',
      body: JSON.stringify({ DeploymentID: deploymentId }),
    });
  }

  /**
   * Pause or resume a deployment
   */
  async pauseDeployment(deploymentId: string, pause: boolean): Promise<void> {
    await this.request<void>(`/v1/deployment/pause/${encodeURIComponent(deploymentId)}`, {
      method: 'POST',
      body: JSON.stringify({ DeploymentID: deploymentId, Pause: pause }),
    });
  }

  // ==================== Job Scaling ====================

  /**
   * Scale a task group within a job
   */
  async scaleJobTaskGroup(
    jobId: string,
    group: string,
    count: number,
    options?: {
      namespace?: string;
      message?: string;
      jobModifyIndex?: number;
      enforceIndex?: boolean;
    }
  ): Promise<NomadJobScaleResponse> {
    const params = options?.namespace ? { namespace: options.namespace } : undefined;
    const body: NomadJobScaleRequest = {
      Target: {
        Group: group,
      },
      Count: count,
      Message: options?.message,
      JobModifyIndex: options?.jobModifyIndex,
      EnforceIndex: options?.enforceIndex,
    };
    return this.request<NomadJobScaleResponse>(
      `/v1/job/${encodeURIComponent(jobId)}/scale`,
      {
        method: 'POST',
        params,
        body: JSON.stringify(body),
      }
    );
  }

  // ==================== CSI Volumes & Plugins ====================

  /**
   * Path of a CSI volume. Volume IDs can contain "[" and "]" (per-allocation volumes) or any other character.
   */
  private csiVolumeEndpoint(id: string): string {
    return `/v1/volume/csi/${encodeURIComponent(id)}`;
  }

  /**
   * List CSI volumes of all namespaces
   */
  async getCSIVolumes(): Promise<NomadCSIVolumeListStub[]> {
    return this.request<NomadCSIVolumeListStub[]>('/v1/volumes', {
      params: { type: 'csi', namespace: '*' },
    });
  }

  async getCSIVolume(id: string, namespace: string): Promise<NomadCSIVolume> {
    return this.request<NomadCSIVolume>(this.csiVolumeEndpoint(id), { params: { namespace } });
  }

  /**
   * Register an existing volume of the storage provider with Nomad
   */
  async registerCSIVolume(volume: NomadCSIVolumeRegistration): Promise<void> {
    await this.request<void>(this.csiVolumeEndpoint(volume.ID), {
      method: 'PUT',
      params: { namespace: volume.Namespace },
      body: JSON.stringify({ Volumes: [volume] }),
    });
  }

  /**
   * Deregister a volume from Nomad; the storage provider keeps it. Force drops the claims of finished
   * allocations; Nomad still refuses while a running allocation uses the volume.
   */
  async deregisterCSIVolume(id: string, namespace: string, force = false): Promise<void> {
    const params: Record<string, string> = { namespace };
    if (force) params.force = 'true';
    await this.request<void>(this.csiVolumeEndpoint(id), { method: 'DELETE', params });
  }

  /**
   * Ask the plugin of a volume to snapshot it; the snapshot request names the volume
   */
  async createCSISnapshot(
    volume: Pick<NomadCSIVolume, 'ID' | 'Namespace' | 'PluginID'>,
    name: string
  ): Promise<NomadCSISnapshot> {
    const response = await this.request<{ Snapshots: NomadCSISnapshot[] }>('/v1/volumes/snapshot', {
      method: 'PUT',
      params: { namespace: volume.Namespace },
      body: JSON.stringify({
        Snapshots: [{ SourceVolumeID: volume.ID, PluginID: volume.PluginID, Name: name }],
      }),
    });
    return response.Snapshots[0];
  }

  async getCSIPlugins(): Promise<NomadCSIPluginListStub[]> {
    return this.request<NomadCSIPluginListStub[]>('/v1/plugins', { params: { type: 'csi' } });
  }

  async getCSIPlugin(id: string): Promise<NomadCSIPlugin> {
    return this.request<NomadCSIPlugin>(`/v1/plugin/csi/${encodeURIComponent(id)}`);
  }
}

/**
 * Create a new Nomad API client instance
 * Token is handled via httpOnly cookie, no parameters needed
 */
export function createNomadClient(): NomadClient {
  return new NomadClient();
}
