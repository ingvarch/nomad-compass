// src/lib/api/nomad.ts
import {
  NomadJobsResponse,
  ApiError,
  NomadNamespace,
  NomadNode,
  NomadAgentSelf,
  NomadAgentMembers,
  NomadAllocation,
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
   * Generic request method for Nomad API
   * Token is sent via httpOnly cookie, only CSRF token needs to be added
   */
  private async request<T>(
      endpoint: string,
      options: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<T> {
    // Extract and remove params from options if they exist
    const { params, ...fetchOptions } = options;

    // Build URL with query parameters if provided
    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url = `${url}?${searchParams.toString()}`;
    }

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
      } else {
        console.warn('CSRF token not found for state-changing request');
      }
    }

    try {
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

        const error: ApiError = {
          statusCode: response.status,
          message: errorData.message || errorData.error || `API request failed with status ${response.status}`,
        };
        throw error;
      }

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
    } catch (error) {
      if ((error as ApiError).statusCode) {
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
   * Get all jobs
   */
  async getJobs(namespace?: string): Promise<NomadJobsResponse> {
    const params: Record<string, string> = {
      namespace: namespace || '*'
    };

    const response = await this.request<any>('/v1/jobs', {
      method: 'GET',
      params
    });

    return { Jobs: response };
  }

  /**
   * Get job details by ID
   */
  async getJob(id: string, namespace: string = 'default'): Promise<any> {
    return this.request<any>(`/v1/job/${id}`, {
      params: { namespace }
    });
  }

  /**
   * Get job versions history
   */
  async getJobVersions(id: string, namespace: string = 'default'): Promise<{ Versions: any[] }> {
    return this.request<{ Versions: any[] }>(`/v1/job/${id}/versions`, {
      params: { namespace }
    });
  }

  /**
   * Create a new job or update an existing job
   *
   * Nomad API uses the same endpoint for both create and update operations.
   * If the job ID already exists, the job will be updated.
   */
  async createJob(jobSpec: any): Promise<any> {
    return this.request<any>('/v1/jobs', {
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
  async updateJob(jobSpec: any): Promise<any> {
    return this.createJob(jobSpec);
  }

  /**
   * Stop a job
   */
  async stopJob(id: string, namespace: string = 'default'): Promise<any> {
    return this.request<any>(`/v1/job/${id}`, {
      method: 'DELETE',
      params: { namespace }
    });
  }

  /**
   * Delete a job (purge)
   */
  async deleteJob(id: string, namespace: string = 'default'): Promise<any> {
    return this.request<any>(`/v1/job/${id}`, {
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
  async getJobAllocations(jobId: string, namespace: string = 'default'): Promise<any[]> {
    return this.request<any[]>(`/v1/job/${jobId}/allocations`, {
      params: { namespace }
    });
  }

  /**
   * Get allocation info
   */
  async getAllocation(allocId: string): Promise<any> {
    return this.request<any>(`/v1/allocation/${allocId}`);
  }

  /**
   * Get evaluation info
   */
  async getEvaluation(evalId: string): Promise<any> {
    return this.request<any>(`/v1/evaluation/${evalId}`);
  }

  /**
   * Get logs for an allocation
   */
  async getAllocationLogs(allocId: string, taskName: string, logType: string, plain: boolean = true): Promise<any> {
    return this.request<any>(`/v1/client/fs/logs/${allocId}`, {
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
      return [{ Name: 'default' }];
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

  /**
   * Validate connection to Nomad with the provided token
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Using the /v1/agent/self endpoint to check connectivity and authentication
      await this.request<any>('/v1/agent/self');
      return true;
    } catch (error) {
      return false;
    }
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
   * Get a single ACL role by name
   */
  async getAclRoleByName(name: string): Promise<NomadAclRole> {
    return this.request<NomadAclRole>(`/v1/acl/role/name/${encodeURIComponent(name)}`);
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
}

/**
 * Create a new Nomad API client instance
 * Token is handled via httpOnly cookie, no parameters needed
 */
export function createNomadClient(): NomadClient {
  return new NomadClient();
}
