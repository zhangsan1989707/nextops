const BASE_URL = "/api";

function getToken(): string | null {
  return localStorage.getItem("nextops-token");
}

export function setToken(token: string) {
  localStorage.setItem("nextops-token", token);
}

export function clearToken() {
  localStorage.removeItem("nextops-token");
}

async function apiCall<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: Error & { status?: number; body?: unknown } = new Error(
      (body as { message?: string })?.message ?? `API Error: ${response.status}`
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T = unknown>(path: string): Promise<T> {
  return apiCall<T>(path, { method: "DELETE" });
}

export type ServerRecord = {
  id: string;
  ip: string;
  port: number;
  hostname: string;
  environment: string;
  tenant: string;
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

export type ServerDetail = ServerRecord & {
  system: {
    kernel: string;
    cpuModel: string;
    cpuCores: number;
    memoryTotalMb: number;
    diskTotalGb: number;
    uptimeDays: number;
    networkCards: string[];
    bootTime: string;
    collectedAt: string;
  };
  realtime: Array<{
    label: string;
    cpu: number;
    memory: number;
  }>;
  processes: Array<{
    pid: string;
    user: string;
    cpu: string;
    mem: string;
    command: string;
  }>;
  services: Array<{
    name: string;
    active: string;
    sub: string;
    description: string;
  }>;
  logs: string;
  network: string;
  diskDetails: Array<{
    mount: string;
    size: string;
    used: string;
    avail: string;
    percent: string;
  }>;
  alertRules: Array<unknown>;
  dataMode: string;
  warnings: string[];
};

export type AlertRecord = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  serverId: string;
  triggeredAt: string;
};

export type ScriptRecord = {
  id: string;
  name: string;
  type: string;
  riskLevel: string;
  version: string;
  successRate: number;
};

export type AiModelRecord = {
  id: string;
  name: string;
  provider: string;
  type: string;
  status: string;
  isDefault: boolean;
  contextWindow: string;
  latencyMs: number;
  costLevel: string;
  capabilities: string[];
  endpoint: string;
  apiKeyEnvName: string | null;
  apiKeyConfigured: boolean;
};

export type MemberRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  status: string;
  lastSeenAt: string | null;
  permissions: string[];
};

export type TeamRecord = {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  status: string;
  lead: string;
  memberCount: number;
  serverCount: number;
  approvalSla: string;
  description: string;
  responsibilities: string[];
  members: MemberRecord[];
};

export type RoleRecord = {
  id: string;
  name: string;
  scope: string;
  status: string;
  memberCount: number;
  description: string;
  permissions: string[];
};

export type PermissionRecord = {
  key: string;
  label: string;
  group: string;
};

export type SlashCommandRecord = {
  command: string;
  description: string;
  example: string;
};

export type PackageRecord = {
  id: string;
  name: string;
  type: string;
  version: string;
  size: string;
  checksum: string;
  status: string;
};

export type ManagedFileRecord = {
  id: string;
  name: string;
  path: string;
  type: string;
  size: string;
  source: string;
  updatedAt: string;
};

export type TenantRecord = {
  id: string;
  name: string;
  status: string;
  servers: number;
  alerts: number;
  aiDiagnosesToday: number;
  quota: string;
};

export type ApprovalTicketRecord = {
  id: string;
  title: string;
  type: string;
  status: string;
  riskLevel: string;
  requester: string;
  target: string;
  environment: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
  comment: string | null;
  summary: string;
  steps: string[];
  relatedResource: string;
};

export type TaskRecord = {
  id: string;
  taskType: string;
  status: string;
  riskLevel: string;
  requiresApproval: boolean;
  targetId: string | null;
  targetName: string | null;
  resourceId: string;
  resourceName: string;
  summary: string;
  plan: string[];
  output: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatOpsResponse = {
  input: string;
  commandMode: boolean;
  taskId: string;
  status: string;
  executionMode: string;
  intent: string;
  riskLevel: string;
  reply: string;
  plan: string[];
  targetId: string | null;
  targetName: string | null;
  resourceId: string;
  resourceName: string;
  requiresApproval: boolean;
  warnings: string[];
  mode: string;
};

export type DashboardData = {
  aiStatus: {
    enabledModels: number;
    activeDiagnoses: number;
    recentDecisions: number;
    pendingApprovals: number;
  };
  opsSummary: {
    totalServers: number;
    healthyServers: number;
    warningServers: number;
    totalAlerts: number;
    openAlerts: number;
    resolvedToday: number;
  };
  trends: Array<{
    label: string;
    cpu: number;
    memory: number;
    alerts: number;
  }>;
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

// ===== API Functions =====

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/login", { email, password });
}

export async function fetchServers(): Promise<{ items: ServerRecord[] }> {
  return apiCall<{ items: ServerRecord[] }>("/servers");
}

export async function fetchServer(id: string): Promise<ServerDetail> {
  return apiCall<ServerDetail>(`/servers/${id}?limit=60`);
}

export async function createServer(data: {
  ip: string;
  hostname: string;
  environment: string;
  port: number;
  os: string;
  tags?: string[];
  type?: string;
}): Promise<ServerRecord> {
  return apiPost<ServerRecord>("/servers", data);
}

export async function updateServer(id: string, data: Record<string, unknown>): Promise<ServerRecord> {
  return apiPut<ServerRecord>(`/servers/${id}`, data);
}

export async function fetchAlerts(): Promise<{ items: AlertRecord[] }> {
  return apiCall<{ items: AlertRecord[] }>("/alerts");
}

export async function fetchScripts(): Promise<{ items: ScriptRecord[] }> {
  return apiCall<{ items: ScriptRecord[] }>("/scripts");
}

export async function fetchModels(): Promise<{ items: AiModelRecord[] }> {
  return apiCall<{ items: AiModelRecord[] }>("/models");
}

export async function createModel(data: Record<string, unknown>): Promise<AiModelRecord> {
  return apiPost<AiModelRecord>("/models", data);
}

export async function updateModel(id: string, data: Record<string, unknown>): Promise<AiModelRecord> {
  return apiPut<AiModelRecord>(`/models/${id}`, data);
}

export async function deleteModel(id: string): Promise<AiModelRecord> {
  return apiDelete<AiModelRecord>(`/models/${id}`);
}

export async function toggleModel(id: string): Promise<AiModelRecord> {
  return apiCall<AiModelRecord>(`/models/${id}/toggle`, { method: "PUT" });
}

export async function setDefaultModel(id: string): Promise<AiModelRecord> {
  return apiCall<AiModelRecord>(`/models/${id}/default`, { method: "PUT" });
}

export async function testModel(id: string): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>(`/models/${id}/test`, {});
}

export async function sendChatMessage(message: string): Promise<ChatOpsResponse> {
  return apiPost<ChatOpsResponse>("/chatops/message", { message });
}

export async function fetchMembers(): Promise<{ items: MemberRecord[] }> {
  return apiCall<{ items: MemberRecord[] }>("/members");
}

export async function fetchTeams(): Promise<{ items: TeamRecord[] }> {
  return apiCall<{ items: TeamRecord[] }>("/teams");
}

export async function fetchRoles(): Promise<{ items: RoleRecord[] }> {
  return apiCall<{ items: RoleRecord[] }>("/roles");
}

export async function fetchPermissions(): Promise<{ items: PermissionRecord[] }> {
  return apiCall<{ items: PermissionRecord[] }>("/roles/permissions");
}

export async function fetchSlashCommands(): Promise<{ items: SlashCommandRecord[] }> {
  return apiCall<{ items: SlashCommandRecord[] }>("/slash-commands");
}

export async function fetchPackages(): Promise<{ items: PackageRecord[] }> {
  return apiCall<{ items: PackageRecord[] }>("/packages");
}

export async function fetchManagedFiles(): Promise<{ items: ManagedFileRecord[] }> {
  return apiCall<{ items: ManagedFileRecord[] }>("/files");
}

export async function fetchTenants(): Promise<{ items: TenantRecord[] }> {
  return apiCall<{ items: TenantRecord[] }>("/tenants");
}

export async function fetchApprovalTickets(): Promise<{ items: ApprovalTicketRecord[] }> {
  return apiCall<{ items: ApprovalTicketRecord[] }>("/approvals");
}

export async function reviewApprovalTicket(
  id: string,
  action: "approve" | "reject",
  comment: string
): Promise<ApprovalTicketRecord> {
  return apiPost<ApprovalTicketRecord>(`/approvals/${id}/review`, { action, comment });
}

export async function fetchTaskRecords(limit = 20): Promise<{ items: TaskRecord[] }> {
  return apiCall<{ items: TaskRecord[] }>(`/tasks?limit=${limit}`);
}

export async function fetchDashboard(): Promise<DashboardData> {
  return apiCall<DashboardData>("/dashboard");
}

export async function toggleMember(id: string): Promise<MemberRecord> {
  return apiPut<MemberRecord>(`/members/${id}/toggle`, {});
}

export async function updateMemberRole(id: string, role: string): Promise<MemberRecord> {
  return apiPut<MemberRecord>(`/members/${id}/role`, { role });
}

export async function toggleTeam(id: string): Promise<TeamRecord> {
  return apiPut<TeamRecord>(`/teams/${id}/toggle`, {});
}

export async function toggleRole(id: string): Promise<RoleRecord> {
  return apiPut<RoleRecord>(`/roles/${id}/toggle`, {});
}

export async function toggleRolePermission(
  id: string,
  permission: string
): Promise<RoleRecord> {
  return apiPut<RoleRecord>(`/roles/${id}/permissions/${encodeURIComponent(permission)}`, {});
}