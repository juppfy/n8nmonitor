import { decrypt } from "@/lib/encryption";

export interface N8nInstance {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string; // Encrypted
  isActive: boolean;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
  tags?: Array<{ id: string; name: string }>;
  updatedAt?: string;
  createdAt?: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: N8nWorkflow;
  data?: any;
  status: "success" | "error" | "running" | "waiting" | "canceled";
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, encryptedApiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = decrypt(encryptedApiKey);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `n8n API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      // Some deployments may not expose /me; use /users as a lightweight sanity check
      await this.request("/api/v1/users");
      return true;
    } catch (error) {
      return false;
    }
  }

  async getWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.request<{ data: N8nWorkflow[] } | N8nWorkflow[]>("/api/v1/workflows");
    // Handle both response formats: { data: [...] } or [...]
    return Array.isArray(response) ? response : response.data;
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    const response = await this.request<{ data: N8nWorkflow } | N8nWorkflow>(`/api/v1/workflows/${id}`);
    // Handle both response formats
    return 'data' in response ? response.data : response;
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/api/v1/workflows/${id}/activate`, {
      method: "POST",
    });
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/api/v1/workflows/${id}/deactivate`, {
      method: "POST",
    });
  }

  async getExecutions(
    workflowId?: string,
    limit: number = 20,
    filters?: {
      finished?: boolean;
      status?: string;
    }
  ): Promise<{ data: N8nExecution[]; count: number }> {
    const params = new URLSearchParams();
    if (workflowId) params.append("workflowId", workflowId);
    params.append("limit", limit.toString());
    if (filters?.finished !== undefined) {
      params.append("finished", filters.finished.toString());
    }
    if (filters?.status) {
      params.append("status", filters.status);
    }

    return this.request<{ data: N8nExecution[]; count: number }>(
      `/api/v1/executions?${params.toString()}`
    );
  }

  async getExecution(id: string): Promise<N8nExecution> {
    return this.request<N8nExecution>(`/api/v1/executions/${id}`);
  }

  async deleteExecution(id: string): Promise<void> {
    await this.request(`/api/v1/executions/${id}`, {
      method: "DELETE",
    });
  }
}


