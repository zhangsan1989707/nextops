const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function fetchJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("nextops_token");
  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("nextops_token");
        window.location.href = "/login";
      }
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.message || errorData?.error || response.statusText,
      };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export const serverApi = {
  getAll: () => fetchJson<{ items: Server[] }>('/servers'),
  getById: (id: string) => fetchJson<Server>(`/servers/${id}`),
  create: (data: Partial<Server>) => fetchJson<Server>('/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Server>) => fetchJson<Server>(`/servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchJson(`/servers/${id}`, { method: 'DELETE' }),
};

export const alertApi = {
  getAll: () => fetchJson<{ items: Alert[] }>('/alerts'),
  getById: (id: string) => fetchJson<Alert>(`/alerts/${id}`),
  acknowledge: (id: string) => fetchJson(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  resolve: (id: string) => fetchJson(`/alerts/${id}/resolve`, { method: 'POST' }),
  delete: (id: string) => fetchJson(`/alerts/${id}`, { method: 'DELETE' }),
};

export const ruleApi = {
  getAll: () => fetchJson<{ items: AlertRule[] }>('/rules'),
  getById: (id: string) => fetchJson<AlertRule>(`/rules/${id}`),
  create: (data: Partial<AlertRule>) => fetchJson<AlertRule>('/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<AlertRule>) => fetchJson<AlertRule>(`/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchJson(`/rules/${id}`, { method: 'DELETE' }),
  toggle: (id: string) => fetchJson<AlertRule>(`/rules/${id}/toggle`, { method: 'POST' }),
};

export const chatApi = {
  send: (message: string, context?: string[]) => fetchJson<ChatResponse>('/chatops/message', {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  }),
};

export const taskApi = {
  getAll: () => fetchJson<{ items: Task[] }>('/tasks'),
  getById: (id: string) => fetchJson<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => fetchJson<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  cancel: (id: string) => fetchJson(`/tasks/${id}/cancel`, { method: 'POST' }),
};

export const scriptApi = {
  getAll: () => fetchJson<{ items: Script[] }>('/scripts'),
  getById: (id: string) => fetchJson<Script>(`/scripts/${id}`),
  create: (data: Partial<Script>) => fetchJson<Script>('/scripts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Script>) => fetchJson<Script>(`/scripts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchJson(`/scripts/${id}`, { method: 'DELETE' }),
  execute: (id: string, serverIds: string[]) => fetchJson(`/scripts/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ serverIds }),
  }),
};

export const packageApi = {
  getAll: () => fetchJson<{ items: Package[] }>('/packages'),
  getById: (id: string) => fetchJson<Package>(`/packages/${id}`),
  create: (data: Partial<Package>) => fetchJson<Package>('/packages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Package>) => fetchJson<Package>(`/packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchJson(`/packages/${id}`, { method: 'DELETE' }),
  install: (id: string, serverIds: string[]) => fetchJson(`/packages/${id}/install`, {
    method: 'POST',
    body: JSON.stringify({ serverIds }),
  }),
};

export const memberApi = {
  getAll: () => fetchJson<{ items: Member[] }>('/members'),
  getById: (id: string) => fetchJson<Member>(`/members/${id}`),
  create: (data: Partial<Member>) => fetchJson<Member>('/members', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Member>) => fetchJson<Member>(`/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchJson(`/members/${id}`, { method: 'DELETE' }),
};

export type Server = {
  id: string;
  ip: string;
  port: number;
  hostname: string;
  environment: string;
  status: string;
  agentStatus: string;
  os: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAvg: number;
  tags: string[];
  type: string;
};

export type Alert = {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'resolved';
  source: string;
  serverId: string;
  triggeredAt: string;
};

export type AlertRule = {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  serverId?: string;
  notificationChannels: string[];
};

export type ChatResponse = {
  intent: string;
  riskLevel: string;
  plan: string[];
  reply: string;
  mode?: string;
  taskId?: string;
  status?: string;
  warnings?: string[];
  requiresApproval?: boolean;
  targetId?: string | null;
  targetName?: string | null;
};

export type Task = {
  id: string;
  taskType: string;
  status: 'planned' | 'waiting' | 'running' | 'done' | 'failed';
  riskLevel: string;
  summary: string;
  createdAt: string;
};

export type Script = {
  id: string;
  name: string;
  content: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type Package = {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'deb' | 'rpm' | 'docker';
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

