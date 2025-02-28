'use client';

import { NomadJobsResponse, ApiError } from '@/types/nomad';

/**
 * NomadClient - A client for interacting with Nomad API
 */
export class NomadClient {
  private baseUrl: string;
  private token: string;

  constructor(nomadAddr: string, token: string) {
    console.log('Initializing NomadClient with:', { nomadAddr, token }); // Лог инициализации

    // Check if we're in a browser environment and should use proxy
    if (typeof window !== 'undefined') {
      // Use our local API proxy to avoid CORS issues
      this.baseUrl = '/api/nomad';
      console.log('Using proxy baseUrl:', this.baseUrl);
    } else {
      // Direct access in SSR context
      this.baseUrl = nomadAddr.endsWith('/') ? nomadAddr.slice(0, -1) : nomadAddr;
      console.log('Using direct baseUrl:', this.baseUrl);
    }
    this.token = token;
  }

  /**
   * Generic request method for Nomad API
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

    // Add Nomad token header
    const headers = {
      'X-Nomad-Token': this.token,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Check if the request was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          statusCode: response.status,
          message: errorData.error || `API request failed with status ${response.status}`,
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
  async getJobs(): Promise<NomadJobsResponse> {
    try {
      const response = await this.request<any>('/v1/jobs', {
        method: 'GET'
      });

      console.log('Processed jobs:', response);

      // Фильтрация только активных jobs
      const activeJobs = response.filter((job: any) =>
          job.Status === 'running' && !job.Stop
      );

      return {
        Jobs: activeJobs
      };
    } catch (error) {
      console.error('Error in getJobs():', error);
      throw error;
    }
  }

  /**
   * Get job details by ID
   */
  async getJob(id: string): Promise<any> {
    return this.request<any>(`/v1/job/${id}`);
  }

  /**
   * Create a new job
   */
  async createJob(jobSpec: any): Promise<any> {
    return this.request<any>('/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(jobSpec),
    });
  }

  /**
   * Stop a job
   */
  async stopJob(id: string): Promise<any> {
    return this.request<any>(`/v1/job/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Restart a job
   */
  async restartJob(id: string): Promise<any> {
    // First get the job
    const job = await this.getJob(id);

    // Then submit it again to restart it
    return this.request<any>('/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }


  /**
   * Get available plugins
   */
  async getPlugins(): Promise<any> {
    return this.request<any>('/v1/plugins');
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
 */
export function createNomadClient(nomadAddr: string, token: string): NomadClient {
  return new NomadClient(nomadAddr, token);
}
