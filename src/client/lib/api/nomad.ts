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

      // Check if response is expected to be JSON
      if (response.headers.get('content-type')?.includes('application/json')) {
        return await response.json();
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
}

/**
 * Create a new Nomad API client instance
 * Token is handled via httpOnly cookie, no parameters needed
 */
export function createNomadClient(): NomadClient {
  return new NomadClient();
}
