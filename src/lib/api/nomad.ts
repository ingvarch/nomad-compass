'use client';

import { NomadJobsResponse, ApiError } from '@/types/nomad';

/**
 * NomadClient - A client for interacting with Nomad API
 */
export class NomadClient {
  private baseUrl: string;
  private token: string;

  constructor(nomadAddr: string, token: string) {
    // Check if we're in a browser environment and should use proxy
    if (typeof window !== 'undefined') {
      // Use our local API proxy to avoid CORS issues
      this.baseUrl = '/api/nomad';
    } else {
      // Direct access in SSR context
      this.baseUrl = nomadAddr.endsWith('/') ? nomadAddr.slice(0, -1) : nomadAddr;
    }
    this.token = token;
  }

  /**
   * Generic request method for Nomad API
   */
  private async request<T>(
      endpoint: string,
      options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add Nomad token header
    const headers = {
      'X-Nomad-Token': this.token,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
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

      return await response.json();
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
    return this.request<NomadJobsResponse>('/v1/jobs');
  }

  /**
   * Get job details by ID
   */
  async getJob(id: string): Promise<any> {
    return this.request<any>(`/v1/job/${id}`);
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
