import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
import type { PoolClient } from "pg";

const { Pool } = pg;

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

export type ServerInventoryRecord = {
  serverId: string;
  kernel: string;
  cpuModel: string;
  cpuCores: number;
  memoryTotalMb: number;
  diskTotalGb: number;
  uptimeSeconds: number;
  networkCards: string[];
  bootTime: string;
  collectedAt: string;
};

export type ServerMetricRecord = {
  serverId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAvg: number;
  collectedAt: string;
  topProcesses: Array<{ pid: string; user: string; cpu: string; mem: string; command: string }>;
  services: Array<{ name: string; active: string; sub: string; description: string }>;
  recentLogs: string;
  networkConnections: string;
  diskDetails: Array<{ mount: string; size: string; used: string; avail: string; percent: string }>;
};

export type AgentRegistrationInput = {
  agentId: string;
  hostname: string;
  ip: string;
  os: string;
  environment: string;
  version: string;
  tags: string[];
  inventory: Omit<ServerInventoryRecord, "serverId" | "collectedAt">;
};

export type AgentMetricInput = {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAvg: number;
  inventory?: Omit<ServerInventoryRecord, "serverId" | "collectedAt">;
  topProcesses?: Array<{ pid: string; user: string; cpu: string; mem: string; command: string }>;
  services?: Array<{ name: string; active: string; sub: string; description: string }>;
  recentLogs?: string;
  networkConnections?: string;
  diskDetails?: Array<{ mount: string; size: string; used: string; avail: string; percent: string }>;
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

export type AiModelRuntimeRecord = AiModelRecord & {
  apiKeySecret: string | null;
};

export type AiModelInput = {
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
  apiKeyEnvName?: string | null;
  apiKeySecret?: string | null;
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
  passwordHash?: string | null;
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

export type AuditLogInput = {
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  details?: Record<string, unknown>;
};

export type AuditLogRecord = AuditLogInput & {
  id: string;
  createdAt: string;
};

export type TaskRecordInput = {
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
};

export type TaskRecord = TaskRecordInput & {
  createdAt: string;
  updatedAt: string;
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://nextops:nextops@localhost:5432/nextops",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

const demoServers: ServerRecord[] = [];

const demoAlerts: AlertRecord[] = [];

const demoScripts: ScriptRecord[] = [
  {
    id: "scr-001",
    name: "Linux 基础巡检",
    type: "shell",
    riskLevel: "low",
    version: "1.0.0",
    successRate: 98
  },
  {
    id: "scr-002",
    name: "Nginx 热重载",
    type: "shell",
    riskLevel: "medium",
    version: "1.1.0",
    successRate: 94
  },
  {
    id: "scr-003",
    name: "PostgreSQL 连接数诊断",
    type: "sql",
    riskLevel: "low",
    version: "0.3.0",
    successRate: 100
  }
];

const demoModels: AiModelInput[] = [
  {
    id: "deepseek-v4-flash",
    name: "Deepseek",
    provider: "Deepseek",
    type: "chat",
    status: "enabled",
    isDefault: true,
    contextWindow: "64k",
    latencyMs: 520,
    costLevel: "low",
    capabilities: ["ChatOps", "日志诊断", "修复方案生成", "低延迟推理"],
    endpoint: "https://api.deepseek.com/v1",
    apiKeyEnvName: "DEEPSEEK_API_KEY"
  },
  {
    id: "model-ops-gpt-4.1",
    name: "OpsGPT-4.1",
    provider: "OpenAI Compatible",
    type: "chat",
    status: "enabled",
    isDefault: false,
    contextWindow: "128k",
    latencyMs: 820,
    costLevel: "medium",
    capabilities: ["ChatOps", "日志诊断", "修复方案生成", "Slash 指令解析"],
    endpoint: "https://api.openai.example/v1"
  },
  {
    id: "model-local-qwen",
    name: "Qwen2.5-Ops-Local",
    provider: "Private LLM Gateway",
    type: "chat",
    status: "enabled",
    isDefault: false,
    contextWindow: "32k",
    latencyMs: 460,
    costLevel: "low",
    capabilities: ["内网知识问答", "脚本生成", "告警归因"],
    endpoint: "http://llm-gateway.local/v1"
  },
  {
    id: "model-embedding-bge",
    name: "BGE-M3 Embedding",
    provider: "Vector Service",
    type: "embedding",
    status: "disabled",
    isDefault: false,
    contextWindow: "8k",
    latencyMs: 120,
    costLevel: "low",
    capabilities: ["日志向量化", "知识库检索", "相似事件召回"],
    endpoint: "http://vector.local/embedding"
  }
];

const demoMembers: MemberRecord[] = [
  {
    id: "mem-001",
    name: "Leo Hang",
    email: "leo@example.com",
    role: "Owner",
    team: "平台工程",
    status: "active",
    lastSeenAt: "2026-05-12T07:58:00.000Z",
    permissions: ["全局配置", "模型管理", "审批处理", "服务器纳管"],
    passwordHash: "$2a$10$HGwD5ul1Xb21nirYi4xh4uVEGnTSkZJ//t2dy9xFhEsOTRNcr7pKG"
  },
  {
    id: "mem-002",
    name: "SRE Oncall",
    email: "sre@example.com",
    role: "SRE",
    team: "稳定性团队",
    status: "active",
    lastSeenAt: "2026-05-12T06:40:00.000Z",
    permissions: ["告警处理", "脚本执行", "AI 诊断"],
    passwordHash: "$2a$10$HGwD5ul1Xb21nirYi4xh4uVEGnTSkZJ//t2dy9xFhEsOTRNcr7pKG"
  },
  {
    id: "mem-003",
    name: "DevOps Reviewer",
    email: "devops@example.com",
    role: "Reviewer",
    team: "DevOps Lab",
    status: "pending",
    lastSeenAt: null,
    permissions: ["工单审核", "部署确认"],
    passwordHash: "$2a$10$HGwD5ul1Xb21nirYi4xh4uVEGnTSkZJ//t2dy9xFhEsOTRNcr7pKG"
  }
];

const demoTeams: Omit<TeamRecord, "members">[] = [
  {
    id: "team-platform",
    name: "平台工程",
    parentId: null,
    type: "root",
    status: "active",
    lead: "Leo Hang",
    memberCount: 6,
    serverCount: 12,
    approvalSla: "30m",
    description: "负责 NextOps 平台、模型网关、自动化编排和核心配置。",
    responsibilities: ["平台配置", "模型管理", "权限治理", "自动化编排"]
  },
  {
    id: "team-sre",
    name: "稳定性团队",
    parentId: "team-platform",
    type: "sre",
    status: "active",
    lead: "SRE Oncall",
    memberCount: 8,
    serverCount: 27,
    approvalSla: "15m",
    description: "负责生产环境巡检、告警处理、排障与容量趋势分析。",
    responsibilities: ["告警处理", "巡检", "故障诊断", "容量治理"]
  },
  {
    id: "team-devops",
    name: "DevOps Lab",
    parentId: "team-platform",
    type: "devops",
    status: "active",
    lead: "DevOps Reviewer",
    memberCount: 5,
    serverCount: 8,
    approvalSla: "45m",
    description: "负责 CI/CD 集成、脚本模板、包分发和发布审批。",
    responsibilities: ["发布审批", "脚本模板", "包管理", "流水线集成"]
  },
  {
    id: "team-cloud",
    name: "私有云运维",
    parentId: "team-platform",
    type: "cloud",
    status: "review",
    lead: "Cloud Admin",
    memberCount: 3,
    serverCount: 15,
    approvalSla: "60m",
    description: "负责私有云接入、云原生资源和多协议插件驱动。",
    responsibilities: ["私有云接入", "Kubernetes", "插件驱动", "云资源同步"]
  }
];

const demoRoles: RoleRecord[] = [
  {
    id: "role-owner",
    name: "Owner",
    scope: "global",
    status: "enabled",
    memberCount: 1,
    description: "拥有平台全部管理能力，适合平台负责人和超级管理员。",
    permissions: ["dashboard:read", "server:manage", "script:execute", "approval:review", "model:manage", "member:manage", "role:manage"]
  },
  {
    id: "role-sre",
    name: "SRE",
    scope: "tenant",
    status: "enabled",
    memberCount: 1,
    description: "负责巡检、告警、诊断和常规自动化执行。",
    permissions: ["dashboard:read", "server:manage", "script:execute", "approval:request"]
  },
  {
    id: "role-reviewer",
    name: "Reviewer",
    scope: "tenant",
    status: "enabled",
    memberCount: 1,
    description: "负责高风险脚本、包分发、生产变更的审批。",
    permissions: ["dashboard:read", "approval:review", "script:read"]
  },
  {
    id: "role-developer",
    name: "Developer",
    scope: "team",
    status: "disabled",
    memberCount: 0,
    description: "允许查看资产、触发低风险脚本和发起部署申请。",
    permissions: ["dashboard:read", "server:read", "script:read", "approval:request"]
  }
];

const demoPermissions: PermissionRecord[] = [
  { key: "dashboard:read", label: "查看仪表盘", group: "核心业务" },
  { key: "server:read", label: "查看服务器", group: "资产" },
  { key: "server:manage", label: "管理服务器", group: "资产" },
  { key: "script:read", label: "查看脚本", group: "自动化" },
  { key: "script:execute", label: "执行脚本", group: "自动化" },
  { key: "approval:request", label: "发起审批", group: "审批" },
  { key: "approval:review", label: "审核工单", group: "审批" },
  { key: "model:manage", label: "管理模型", group: "设置" },
  { key: "member:manage", label: "管理成员", group: "设置" },
  { key: "role:manage", label: "管理角色", group: "设置" }
];

const demoSlashCommands: SlashCommandRecord[] = [
  { command: "/ssh", description: "打开服务器 Web SSH", example: "/ssh 10.0.1.21 --port 22" },
  { command: "/check", description: "发起服务器巡检", example: "/check prod-web --items cpu,memory,disk" },
  { command: "/diagnose", description: "发起 AI 诊断", example: "/diagnose alert alt-001" },
  { command: "/deploy", description: "触发部署计划", example: "/deploy order-service --env prod --version 1.8.2" }
];

const demoPackages: PackageRecord[] = [
  {
    id: "pkg-agent-010",
    name: "nextops-agent",
    type: "agent",
    version: "0.1.0",
    size: "18.4 MB",
    checksum: "sha256:7d9e-agent-demo",
    status: "ready"
  },
  {
    id: "pkg-nginx-conf-184",
    name: "nginx-conf-bundle",
    type: "config",
    version: "1.8.4",
    size: "240 KB",
    checksum: "sha256:aa31-nginx-demo",
    status: "ready"
  },
  {
    id: "pkg-order-service-182",
    name: "order-service",
    type: "release",
    version: "1.8.2",
    size: "84.1 MB",
    checksum: "sha256:f91c-order-demo",
    status: "verified"
  }
];

const demoManagedFiles: ManagedFileRecord[] = [
  {
    id: "file-nginx-access",
    name: "nginx-access-sample.log",
    path: "/var/log/nginx/access.log",
    type: "log",
    size: "12.8 MB",
    source: "prod-web-01",
    updatedAt: "2026-05-12T06:42:00.000Z"
  },
  {
    id: "file-agent-install",
    name: "install-agent.sh",
    path: "/opt/nextops/install-agent.sh",
    type: "script",
    size: "8 KB",
    source: "nextops",
    updatedAt: "2026-05-12T05:10:00.000Z"
  },
  {
    id: "file-db-report",
    name: "postgres-diagnosis.txt",
    path: "/tmp/postgres-diagnosis.txt",
    type: "report",
    size: "32 KB",
    source: "prod-db-01",
    updatedAt: "2026-05-12T04:35:00.000Z"
  }
];

const demoTenants: TenantRecord[] = [
  {
    id: "tenant-default",
    name: "Default Ops",
    status: "active",
    servers: 4,
    alerts: 2,
    aiDiagnosesToday: 12,
    quota: "standard"
  },
  {
    id: "tenant-devops",
    name: "DevOps Lab",
    status: "active",
    servers: 8,
    alerts: 1,
    aiDiagnosesToday: 7,
    quota: "standard"
  },
  {
    id: "tenant-private-cloud",
    name: "Private Cloud",
    status: "review",
    servers: 15,
    alerts: 4,
    aiDiagnosesToday: 18,
    quota: "enterprise"
  }
];

const demoApprovalTickets: ApprovalTicketRecord[] = [
  {
    id: "apv-001",
    title: "生产环境 Nginx reload",
    type: "script",
    status: "pending",
    riskLevel: "medium",
    requester: "SRE 值班",
    target: "prod-web-01",
    environment: "production",
    createdAt: "2026-05-12T07:15:00.000Z",
    reviewedAt: null,
    reviewer: null,
    comment: null,
    summary: "执行 Nginx 配置检查并 reload 服务，命中生产环境变更审批策略。",
    steps: ["校验 nginx.conf 语法", "对比当前配置 checksum", "执行 systemctl reload nginx", "采集 reload 后 5 分钟 5xx 指标"],
    relatedResource: "scr-002"
  },
  {
    id: "apv-002",
    title: "分发 Agent 安装包",
    type: "package",
    status: "pending",
    riskLevel: "low",
    requester: "平台管理员",
    target: "prod-cache-01",
    environment: "production",
    createdAt: "2026-05-12T06:48:00.000Z",
    reviewedAt: null,
    reviewer: null,
    comment: null,
    summary: "向新纳管服务器分发 nextops-agent 安装包并生成安装计划。",
    steps: ["校验安装包 checksum", "上传到 /opt/nextops", "生成 systemd unit", "等待人工确认安装"],
    relatedResource: "pkg-agent-010"
  },
  {
    id: "apv-003",
    title: "数据库连接数诊断",
    type: "diagnosis",
    status: "approved",
    riskLevel: "high",
    requester: "DBA",
    target: "prod-db-01",
    environment: "production",
    createdAt: "2026-05-12T05:20:00.000Z",
    reviewedAt: "2026-05-12T05:28:00.000Z",
    reviewer: "ops-admin",
    comment: "允许执行只读诊断。",
    summary: "对 PostgreSQL 活跃会话、等待事件和慢查询进行只读诊断。",
    steps: ["查询 pg_stat_activity", "采集等待事件", "关联慢查询日志", "生成修复建议"],
    relatedResource: "scr-003"
  }
];

const migrations = [
  {
    id: "0001_core_assets",
    sql: `
      create table if not exists servers (
        id text primary key,
        ip text not null,
        port integer not null default 22,
        hostname text not null,
        environment text not null,
        tenant text not null default 'default',
        status text not null,
        agent_status text not null,
        os text not null,
        cpu_usage integer not null default 0,
        memory_usage integer not null default 0,
        disk_usage integer not null default 0,
        load_avg numeric not null default 0,
        tags text[] not null default '{}',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists alerts (
        id text primary key,
        title text not null,
        severity text not null,
        status text not null,
        source text not null,
        server_id text not null references servers(id) on delete cascade,
        triggered_at timestamptz not null
      );

      create table if not exists scripts (
        id text primary key,
        name text not null,
        type text not null,
        risk_level text not null,
        version text not null,
        success_rate integer not null default 0
      );
    `
  },
  {
    id: "0002_ai_models",
    sql: `
      create table if not exists ai_models (
        id text primary key,
        name text not null,
        provider text not null,
        model_type text not null,
        status text not null,
        is_default boolean not null default false,
        context_window text not null,
        latency_ms integer not null default 0,
        cost_level text not null,
        capabilities text[] not null default '{}',
        endpoint text not null,
        api_key_env_name text,
        api_key_secret text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create unique index if not exists ai_models_single_default
        on ai_models (is_default)
        where is_default;
    `
  },
  {
    id: "0003_identity_access",
    sql: `
      create table if not exists members (
        id text primary key,
        name text not null,
        email text not null unique,
        role text not null,
        team text not null,
        status text not null,
        last_seen_at timestamptz,
        permissions text[] not null default '{}',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists teams (
        id text primary key,
        name text not null unique,
        parent_id text,
        team_type text not null,
        status text not null,
        lead text not null,
        member_count integer not null default 0,
        server_count integer not null default 0,
        approval_sla text not null,
        description text not null,
        responsibilities text[] not null default '{}',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists roles (
        id text primary key,
        name text not null unique,
        scope text not null,
        status text not null,
        member_count integer not null default 0,
        description text not null,
        permissions text[] not null default '{}',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists permissions (
        key text primary key,
        label text not null,
        permission_group text not null
      );
    `
  },
  {
    id: "0004_approval_tickets",
    sql: `
      create table if not exists approval_tickets (
        id text primary key,
        title text not null,
        ticket_type text not null,
        status text not null,
        risk_level text not null,
        requester text not null,
        target text not null,
        environment text not null,
        created_at timestamptz not null,
        reviewed_at timestamptz,
        reviewer text,
        comment text,
        summary text not null,
        steps text[] not null default '{}',
        related_resource text not null,
        updated_at timestamptz not null default now()
      );

      create index if not exists approval_tickets_status_created_at_idx
        on approval_tickets (status, created_at desc);
    `
  },
  {
    id: "0005_operational_catalogs",
    sql: `
      create table if not exists slash_commands (
        command text primary key,
        description text not null,
        example text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists packages (
        id text primary key,
        name text not null,
        package_type text not null,
        version text not null,
        package_size text not null,
        checksum text not null,
        status text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists managed_files (
        id text primary key,
        name text not null,
        file_path text not null,
        file_type text not null,
        file_size text not null,
        source text not null,
        updated_at timestamptz not null
      );

      create table if not exists tenants (
        id text primary key,
        name text not null,
        status text not null,
        servers integer not null default 0,
        alerts integer not null default 0,
        ai_diagnoses_today integer not null default 0,
        quota text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `
  },
  {
    id: "0006_task_audit_records",
    sql: `
      create table if not exists task_records (
        id text primary key,
        task_type text not null,
        status text not null,
        risk_level text not null,
        requires_approval boolean not null default false,
        target_id text,
        target_name text,
        resource_id text not null,
        resource_name text not null,
        summary text not null,
        plan text[] not null default '{}',
        output text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists task_records_created_at_idx
        on task_records (created_at desc);

      create table if not exists audit_logs (
        id text primary key,
        action text not null,
        actor text not null,
        resource_type text not null,
        resource_id text not null,
        summary text not null,
        details jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create index if not exists audit_logs_resource_created_at_idx
        on audit_logs (resource_type, resource_id, created_at desc);
    `
  },
  {
    id: "0007_agent_metrics",
    sql: `
      create table if not exists agent_instances (
        id text primary key,
        server_id text not null references servers(id) on delete cascade,
        hostname text not null,
        version text not null,
        status text not null,
        last_seen_at timestamptz not null default now(),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists server_inventory (
        server_id text primary key references servers(id) on delete cascade,
        kernel text not null,
        cpu_model text not null,
        cpu_cores integer not null,
        memory_total_mb integer not null,
        disk_total_gb integer not null,
        uptime_seconds integer not null,
        network_cards text[] not null default '{}',
        boot_time timestamptz not null,
        collected_at timestamptz not null default now()
      );

      create table if not exists server_metrics (
        id bigserial primary key,
        server_id text not null references servers(id) on delete cascade,
        cpu_usage integer not null,
        memory_usage integer not null,
        disk_usage integer not null,
        load_avg numeric not null default 0,
        collected_at timestamptz not null default now()
      );

      create index if not exists server_metrics_server_collected_idx
        on server_metrics (server_id, collected_at desc);
    `
  },
  {
    id: "0008_extended_metrics",
    sql: `
      alter table server_metrics add column if not exists top_processes jsonb not null default '[]';
      alter table server_metrics add column if not exists services jsonb not null default '[]';
      alter table server_metrics add column if not exists recent_logs text not null default '';
      alter table server_metrics add column if not exists network_connections text not null default '';
      alter table server_metrics add column if not exists disk_details jsonb not null default '[]';
    `
  },
  {
    id: "0009_password_auth",
    sql: `
      alter table members add column if not exists password_hash text;
    `
  },
  {
    id: "0010_resource_type",
    sql: `
      alter table servers add column if not exists type text not null default 'server';
    `
  }
];

export async function initializeDatabase() {
  await runMigrations();
  if (process.env.CLEANUP_DEMO_DATA === "true") {
    await cleanupDemoData();
  }
  await seedIdentityAccess();
  await seedOperationalCatalogs();
  await seedDemoAssets();
}

function shouldSeedDemoData(): boolean {
  return process.env.SEED_DEMO_DATA !== "false";
}

async function cleanupDemoData() {
  const result = await pool.query(
    "delete from servers where id like 'srv-prod-%' or id like 'srv-stage-%'"
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log(`cleanupDemoData: removed ${result.rowCount} demo server(s)`);
  }
  await pool.query("delete from alerts");
  await pool.query("delete from scripts");
  await pool.query("delete from approval_tickets");
  await pool.query("delete from packages");
  await pool.query("delete from managed_files");
  await pool.query("delete from tenants");
  await pool.query("delete from ai_models");
  await pool.query("delete from members");
  await pool.query("delete from teams");
}

async function seedIdentityAccess() {
  if (!shouldSeedDemoData()) {
    return;
  }

  const permissionCount = await pool.query<{ count: string }>("select count(*) from permissions");
  if (Number(permissionCount.rows[0]?.count ?? 0) === 0) {
    for (const permission of demoPermissions) {
      await pool.query(
        "insert into permissions (key, label, permission_group) values ($1, $2, $3) on conflict (key) do nothing",
        [permission.key, permission.label, permission.group]
      );
    }
  }

  const roleCount = await pool.query<{ count: string }>("select count(*) from roles");
  if (Number(roleCount.rows[0]?.count ?? 0) === 0) {
    for (const role of demoRoles) {
      await pool.query(
        `
          insert into roles (id, name, scope, status, member_count, description, permissions)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (id) do nothing
        `,
        [role.id, role.name, role.scope, role.status, role.memberCount, role.description, role.permissions]
      );
    }
  }

  const teamCount = await pool.query<{ count: string }>("select count(*) from teams");
  if (Number(teamCount.rows[0]?.count ?? 0) === 0) {
    for (const team of demoTeams) {
      await pool.query(
        `
          insert into teams (id, name, parent_id, team_type, status, lead, member_count, server_count, approval_sla, description, responsibilities)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          on conflict (id) do nothing
        `,
        [team.id, team.name, team.parentId, team.type, team.status, team.lead, team.memberCount, team.serverCount, team.approvalSla, team.description, team.responsibilities]
      );
    }
  }

  const memberCount = await pool.query<{ count: string }>("select count(*) from members");
  if (Number(memberCount.rows[0]?.count ?? 0) === 0) {
    for (const member of demoMembers) {
      await pool.query(
        `
          insert into members (id, name, email, role, team, status, last_seen_at, permissions, password_hash)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do nothing
        `,
        [member.id, member.name, member.email, member.role, member.team, member.status, member.lastSeenAt, member.permissions, member.passwordHash]
      );
    }
  }
}

async function seedOperationalCatalogs() {
  if (!shouldSeedDemoData()) {
    return;
  }

  const slashCommandCount = await pool.query<{ count: string }>("select count(*) from slash_commands");
  if (Number(slashCommandCount.rows[0]?.count ?? 0) === 0) {
    for (const item of demoSlashCommands) {
      await pool.query(
        "insert into slash_commands (command, description, example) values ($1, $2, $3) on conflict (command) do nothing",
        [item.command, item.description, item.example]
      );
    }
  }
}

async function seedDemoAssets() {
  if (!shouldSeedDemoData()) {
    return;
  }

  const serverCount = await pool.query<{ count: string }>("select count(*) from servers");
  if (Number(serverCount.rows[0]?.count ?? 0) === 0) {
    for (const s of demoServers) {
      await pool.query(
        `insert into servers (id, ip, port, hostname, environment, tenant, status, agent_status, os, cpu_usage, memory_usage, disk_usage, load_avg, tags)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) on conflict (id) do nothing`,
        [s.id, s.ip, s.port, s.hostname, s.environment, s.tenant, s.status, s.agentStatus, s.os, s.cpuUsage, s.memoryUsage, s.diskUsage, s.loadAvg, s.tags]
      );
    }
  }

  const alertCount = await pool.query<{ count: string }>("select count(*) from alerts");
  if (Number(alertCount.rows[0]?.count ?? 0) === 0) {
    for (const a of demoAlerts) {
      await pool.query(
        `insert into alerts (id, title, severity, status, source, server_id, triggered_at)
         values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
        [a.id, a.title, a.severity, a.status, a.source, a.serverId, a.triggeredAt]
      );
    }
  }

  const scriptCount = await pool.query<{ count: string }>("select count(*) from scripts");
  if (Number(scriptCount.rows[0]?.count ?? 0) === 0) {
    for (const s of demoScripts) {
      await pool.query(
        `insert into scripts (id, name, type, risk_level, version, success_rate)
         values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing`,
        [s.id, s.name, s.type, s.riskLevel, s.version, s.successRate]
      );
    }
  }

  const modelCount = await pool.query<{ count: string }>("select count(*) from ai_models");
  if (Number(modelCount.rows[0]?.count ?? 0) === 0) {
    for (const m of demoModels) {
      await pool.query(
        `insert into ai_models (id, name, provider, model_type, status, is_default, context_window, latency_ms, cost_level, capabilities, endpoint, api_key_env_name)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do nothing`,
        [m.id, m.name, m.provider, m.type, m.status, m.isDefault, m.contextWindow, m.latencyMs, m.costLevel, m.capabilities, m.endpoint, m.apiKeyEnvName ?? null]
      );
    }
  }
}

async function runMigrations() {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  for (const migration of migrations) {
    const applied = await pool.query("select id from schema_migrations where id = $1", [migration.id]);
    if (applied.rowCount === 0) {
      await pool.query("begin");
      try {
        await pool.query(migration.sql);
        await pool.query("insert into schema_migrations (id) values ($1)", [migration.id]);
        await pool.query("commit");
      } catch (error) {
        await pool.query("rollback");
        throw error;
      }
    }
  }
}

export async function getServers(): Promise<ServerRecord[]> {
  const result = await pool.query(`
    select id, ip, port, hostname, environment, tenant, status, agent_status, os,
      cpu_usage, memory_usage, disk_usage, load_avg, tags, type
    from servers
    order by created_at asc
  `);
  return result.rows.map(mapServer);
}

export async function getServer(id: string): Promise<ServerRecord | null> {
  const result = await pool.query(
    `
      select id, ip, port, hostname, environment, tenant, status, agent_status, os,
        cpu_usage, memory_usage, disk_usage, load_avg, tags, type
      from servers
      where id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapServer(result.rows[0]) : null;
}

export async function createServer(input: ServerRecord): Promise<ServerRecord> {
  const result = await pool.query(
    `
      insert into servers (
        id, ip, port, hostname, environment, tenant, status, agent_status, os,
        cpu_usage, memory_usage, disk_usage, load_avg, tags, type
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      returning id, ip, port, hostname, environment, tenant, status, agent_status, os,
        cpu_usage, memory_usage, disk_usage, load_avg, tags, type
    `,
    [
      input.id,
      input.ip,
      input.port,
      input.hostname,
      input.environment,
      input.tenant,
      input.status,
      input.agentStatus,
      input.os,
      input.cpuUsage,
      input.memoryUsage,
      input.diskUsage,
      input.loadAvg,
      input.tags,
      input.type
    ]
  );
  return mapServer(result.rows[0]);
}

export async function updateServer(id: string, input: Record<string, unknown>): Promise<ServerRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const columnMap: Record<string, string> = {
    hostname: "hostname",
    ip: "ip",
    port: "port",
    environment: "environment",
    os: "os",
    type: "type",
    tags: "tags"
  };

  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = $${idx++}`);
      values.push(input[key]);
    }
  }

  if (fields.length === 0) {
    return getServer(id);
  }

  fields.push("updated_at = now()");
  values.push(id);

  const result = await pool.query(
    `update servers set ${fields.join(", ")} where id = $${idx} returning id, ip, port, hostname, environment, tenant, status, agent_status, os, cpu_usage, memory_usage, disk_usage, load_avg, tags, type`,
    values
  );
  return result.rows[0] ? mapServer(result.rows[0]) : null;
}

export async function registerAgent(input: AgentRegistrationInput): Promise<ServerRecord> {
  const serverId = `srv-local-${input.hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const serverResult = await client.query(
      `
        insert into servers (
          id, ip, port, hostname, environment, tenant, status, agent_status, os,
          cpu_usage, memory_usage, disk_usage, load_avg, tags, type
        )
        values ($1, $2, 0, $3, $4, 'default', 'healthy', 'online', $5, 0, 0, 0, 0, $6, 'server')
        on conflict (id) do update
        set ip = excluded.ip,
          hostname = excluded.hostname,
          environment = excluded.environment,
          status = 'healthy',
          agent_status = 'online',
          os = excluded.os,
          tags = excluded.tags,
          updated_at = now()
        returning id, ip, port, hostname, environment, tenant, status, agent_status, os,
          cpu_usage, memory_usage, disk_usage, load_avg, tags, type
      `,
      [serverId, input.ip, input.hostname, input.environment, input.os, input.tags]
    );
    await client.query(
      `
        insert into agent_instances (id, server_id, hostname, version, status, last_seen_at)
        values ($1, $2, $3, $4, 'online', now())
        on conflict (id) do update
        set server_id = excluded.server_id,
          hostname = excluded.hostname,
          version = excluded.version,
          status = 'online',
          last_seen_at = now(),
          updated_at = now()
      `,
      [input.agentId, serverId, input.hostname, input.version]
    );
    await upsertInventory(client, serverId, input.inventory);
    await client.query("commit");
    return mapServer(serverResult.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordAgentMetrics(agentId: string, input: AgentMetricInput): Promise<ServerMetricRecord | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const agent = await client.query("select server_id from agent_instances where id = $1", [agentId]);
    const serverId = agent.rows[0]?.server_id ? String(agent.rows[0].server_id) : null;
    if (!serverId) {
      await client.query("rollback");
      return null;
    }
    await client.query(
      `
        update agent_instances
        set status = 'online', last_seen_at = now(), updated_at = now()
        where id = $1
      `,
      [agentId]
    );
    await client.query(
      `
        update servers
        set agent_status = 'online',
          status = case when $2 >= 90 or $3 >= 90 or $4 >= 90 then 'warning' else 'healthy' end,
          cpu_usage = $2,
          memory_usage = $3,
          disk_usage = $4,
          load_avg = $5,
          updated_at = now()
        where id = $1
      `,
      [serverId, input.cpuUsage, input.memoryUsage, input.diskUsage, input.loadAvg]
    );
    const metric = await client.query(
      `
        insert into server_metrics (server_id, cpu_usage, memory_usage, disk_usage, load_avg, top_processes, services, recent_logs, network_connections, disk_details)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning server_id, cpu_usage, memory_usage, disk_usage, load_avg, collected_at, top_processes, services, recent_logs, network_connections, disk_details
      `,
      [
        serverId,
        input.cpuUsage,
        input.memoryUsage,
        input.diskUsage,
        input.loadAvg,
        JSON.stringify(input.topProcesses ?? []),
        JSON.stringify(input.services ?? []),
        input.recentLogs ?? "",
        input.networkConnections ?? "",
        JSON.stringify(input.diskDetails ?? [])
      ]
    );
    if (input.inventory) {
      await upsertInventory(client, serverId, input.inventory);
    }
    await client.query("commit");
    return mapServerMetric(metric.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getServerInventory(serverId: string): Promise<ServerInventoryRecord | null> {
  const result = await pool.query(
    `
      select server_id, kernel, cpu_model, cpu_cores, memory_total_mb, disk_total_gb,
        uptime_seconds, network_cards, boot_time, collected_at
      from server_inventory
      where server_id = $1
    `,
    [serverId]
  );
  return result.rows[0] ? mapServerInventory(result.rows[0]) : null;
}

export async function getServerMetrics(serverId: string, limit = 12): Promise<ServerMetricRecord[]> {
  const result = await pool.query(
    `
      select server_id, cpu_usage, memory_usage, disk_usage, load_avg, collected_at
      from (
        select server_id, cpu_usage, memory_usage, disk_usage, load_avg, collected_at
        from server_metrics
        where server_id = $1
        order by collected_at desc
        limit $2
      ) recent
      order by collected_at asc
    `,
    [serverId, limit]
  );
  return result.rows.map(mapServerMetric);
}

export async function getLatestExtendedMetrics(serverId: string): Promise<ServerMetricRecord | null> {
  const result = await pool.query(
    `
      select server_id, cpu_usage, memory_usage, disk_usage, load_avg, collected_at,
        top_processes, services, recent_logs, network_connections, disk_details
      from server_metrics
      where server_id = $1
      order by collected_at desc
      limit 1
    `,
    [serverId]
  );
  return result.rows[0] ? mapServerMetric(result.rows[0]) : null;
}

export async function getRecentMetricTrends(limit = 4): Promise<Array<{ label: string; cpu: number; memory: number; alerts: number }>> {
  const result = await pool.query(
    `
      select collected_at, cpu_usage, memory_usage
      from server_metrics
      order by collected_at desc
      limit $1
    `,
    [limit]
  );
  return result.rows.reverse().map((row) => ({
    label: new Date(String(row.collected_at)).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    cpu: Number(row.cpu_usage),
    memory: Number(row.memory_usage),
    alerts: 0
  }));
}

export async function getAlerts(): Promise<AlertRecord[]> {
  const result = await pool.query(`
    select id, title, severity, status, source, server_id, triggered_at
    from alerts
    order by triggered_at desc
  `);
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    source: row.source,
    serverId: row.server_id,
    triggeredAt: new Date(row.triggered_at).toISOString()
  }));
}

export async function getAlert(id: string): Promise<AlertRecord | null> {
  const result = await pool.query(
    `
      select id, title, severity, status, source, server_id, triggered_at
      from alerts
      where id = $1
    `,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    source: row.source,
    serverId: row.server_id,
    triggeredAt: new Date(row.triggered_at).toISOString()
  };
}

export async function getScripts(): Promise<ScriptRecord[]> {
  const result = await pool.query(`
    select id, name, type, risk_level, version, success_rate
    from scripts
    order by id asc
  `);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    riskLevel: row.risk_level,
    version: row.version,
    successRate: row.success_rate
  }));
}

export async function getScript(id: string): Promise<ScriptRecord | null> {
  const result = await pool.query(
    `
      select id, name, type, risk_level, version, success_rate
      from scripts
      where id = $1
    `,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    riskLevel: row.risk_level,
    version: row.version,
    successRate: row.success_rate
  };
}

export async function getAiModels(): Promise<AiModelRecord[]> {
  const result = await pool.query(`
    select id, name, provider, model_type, status, is_default, context_window,
      latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
    from ai_models
    order by is_default desc, created_at asc
  `);
  return result.rows.map(mapAiModel);
}

export async function getAiModel(id: string): Promise<AiModelRecord | null> {
  const result = await pool.query(
    `
      select id, name, provider, model_type, status, is_default, context_window,
        latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
      from ai_models
      where id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapAiModel(result.rows[0]) : null;
}

export async function getAiModelForRuntime(id: string): Promise<AiModelRuntimeRecord | null> {
  const result = await pool.query(
    `
      select id, name, provider, model_type, status, is_default, context_window,
        latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
      from ai_models
      where id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapAiModelRuntime(result.rows[0]) : null;
}

export async function getDefaultAiModelForRuntime(): Promise<AiModelRuntimeRecord | null> {
  const result = await pool.query(`
    select id, name, provider, model_type, status, is_default, context_window,
      latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
    from ai_models
    where status = 'enabled' and model_type = 'chat'
    order by is_default desc, created_at asc
    limit 1
  `);
  return result.rows[0] ? mapAiModelRuntime(result.rows[0]) : null;
}

export async function createAiModel(input: AiModelInput): Promise<AiModelRecord> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (input.isDefault) {
      await client.query("update ai_models set is_default = false, updated_at = now()");
    }
    const result = await client.query(
      `
        insert into ai_models (
          id, name, provider, model_type, status, is_default, context_window,
          latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        returning id, name, provider, model_type, status, is_default, context_window,
          latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
      `,
      [
        input.id,
        input.name,
        input.provider,
        input.type,
        input.status,
        input.isDefault,
        input.contextWindow,
        input.latencyMs,
        input.costLevel,
        input.capabilities,
        input.endpoint,
        input.apiKeyEnvName ?? null,
        input.apiKeySecret ?? null
      ]
    );
    await client.query("commit");
    return mapAiModel(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function setDefaultAiModel(id: string): Promise<AiModelRecord | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query("select id, status from ai_models where id = $1", [id]);
    if (!existing.rows[0]) {
      await client.query("rollback");
      return null;
    }
    if (existing.rows[0].status !== "enabled") {
      throw new Error("Only enabled models can be default");
    }
    await client.query("update ai_models set is_default = false, updated_at = now()");
    const result = await client.query(
      `
        update ai_models
        set is_default = true, updated_at = now()
        where id = $1
        returning id, name, provider, model_type, status, is_default, context_window,
          latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
      `,
      [id]
    );
    await client.query("commit");
    return mapAiModel(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function toggleAiModel(id: string): Promise<AiModelRecord | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const current = await client.query("select id, status from ai_models where id = $1", [id]);
    if (!current.rows[0]) {
      await client.query("rollback");
      return null;
    }

    const nextStatus = current.rows[0].status === "enabled" ? "disabled" : "enabled";
    const result = await client.query(
      `
        update ai_models
        set status = $2,
          is_default = case when $2 = 'disabled' then false else is_default end,
          updated_at = now()
        where id = $1
        returning id, name, provider, model_type, status, is_default, context_window,
          latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret
      `,
      [id, nextStatus]
    );

    const defaultCount = await client.query<{ count: string }>("select count(*) from ai_models where is_default = true");
    if (Number(defaultCount.rows[0]?.count ?? 0) === 0) {
      await client.query(`
        update ai_models
        set is_default = true, updated_at = now()
        where id = (
          select id from ai_models
          where status = 'enabled'
          order by created_at asc
          limit 1
        )
      `);
    }

    await client.query("commit");
    return mapAiModel(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAiModel(id: string): Promise<boolean> {
  const result = await pool.query("delete from ai_models where id = $1", [id]);
  if ((result.rowCount ?? 0) > 0) {
    const defaultCount = await pool.query<{ count: string }>("select count(*) from ai_models where is_default = true");
    if (Number(defaultCount.rows[0]?.count ?? 0) === 0) {
      await pool.query(`
        update ai_models set is_default = true, updated_at = now()
        where id = (select id from ai_models where status = 'enabled' order by created_at asc limit 1)
      `);
    }
    return true;
  }
  return false;
}

export async function updateAiModel(id: string, input: Partial<AiModelInput>): Promise<AiModelRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 2;

  if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
  if (input.provider !== undefined) { fields.push(`provider = $${idx++}`); values.push(input.provider); }
  if (input.type !== undefined) { fields.push(`model_type = $${idx++}`); values.push(input.type); }
  if (input.endpoint !== undefined) { fields.push(`endpoint = $${idx++}`); values.push(input.endpoint); }
  if (input.contextWindow !== undefined) { fields.push(`context_window = $${idx++}`); values.push(input.contextWindow); }
  if (input.costLevel !== undefined) { fields.push(`cost_level = $${idx++}`); values.push(input.costLevel); }
  if (input.capabilities !== undefined) { fields.push(`capabilities = $${idx++}`); values.push(input.capabilities); }
  if (input.apiKeySecret !== undefined) { fields.push(`api_key_secret = $${idx++}`); values.push(input.apiKeySecret); }

  if (fields.length === 0) {
    return await getAiModel(id);
  }

  fields.push("updated_at = now()");
  const result = await pool.query(
    `update ai_models set ${fields.join(", ")} where id = $1
     returning id, name, provider, model_type, status, is_default, context_window,
       latency_ms, cost_level, capabilities, endpoint, api_key_env_name, api_key_secret`,
    [id, ...values]
  );
  return result.rows[0] ? mapAiModel(result.rows[0]) : null;
}

export async function getMembers(): Promise<MemberRecord[]> {
  const result = await pool.query(`
    select id, name, email, role, team, status, last_seen_at, permissions
    from members
    order by created_at asc
  `);
  return result.rows.map(mapMember);
}

export async function getMemberByEmail(email: string): Promise<MemberRecord & { passwordHash: string | null } | null> {
  const result = await pool.query(
    "select id, name, email, role, team, status, last_seen_at, permissions, password_hash from members where email = $1",
    [email]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...mapMember(row),
    passwordHash: row.password_hash ? String(row.password_hash) : null
  };
}

export async function toggleMember(id: string): Promise<MemberRecord | null> {
  const result = await pool.query(
    `
      update members
      set status = case when status = 'active' then 'disabled' else 'active' end,
        updated_at = now()
      where id = $1
      returning id, name, email, role, team, status, last_seen_at, permissions
    `,
    [id]
  );
  return result.rows[0] ? mapMember(result.rows[0]) : null;
}

export async function updateMemberRole(id: string, role: string): Promise<MemberRecord | null> {
  const result = await pool.query(
    `
      update members
      set role = $2, updated_at = now()
      where id = $1
      returning id, name, email, role, team, status, last_seen_at, permissions
    `,
    [id, role]
  );
  return result.rows[0] ? mapMember(result.rows[0]) : null;
}

export async function getTeams(): Promise<TeamRecord[]> {
  const [teamsResult, members] = await Promise.all([
    pool.query(`
      select id, name, parent_id, team_type, status, lead, member_count, server_count,
        approval_sla, description, responsibilities
      from teams
      order by case when parent_id is null then 0 else 1 end, created_at asc
    `),
    getMembers()
  ]);
  return teamsResult.rows.map((row) => mapTeam(row, members.filter((member) => member.team === row.name)));
}

export async function toggleTeam(id: string): Promise<TeamRecord | null> {
  const result = await pool.query(
    `
      update teams
      set status = case when status = 'active' then 'review' else 'active' end,
        updated_at = now()
      where id = $1
      returning id, name, parent_id, team_type, status, lead, member_count, server_count,
        approval_sla, description, responsibilities
    `,
    [id]
  );
  if (!result.rows[0]) {
    return null;
  }
  const members = (await getMembers()).filter((member) => member.team === result.rows[0].name);
  return mapTeam(result.rows[0], members);
}

export async function getRoles(): Promise<RoleRecord[]> {
  const result = await pool.query(`
    select id, name, scope, status, member_count, description, permissions
    from roles
    order by created_at asc
  `);
  return result.rows.map(mapRole);
}

export async function getPermissions(): Promise<PermissionRecord[]> {
  const result = await pool.query(`
    select key, label, permission_group
    from permissions
    order by key asc
  `);
  return result.rows.map((row) => ({
    key: String(row.key),
    label: String(row.label),
    group: String(row.permission_group)
  }));
}

export async function toggleRole(id: string): Promise<RoleRecord | null> {
  const result = await pool.query(
    `
      update roles
      set status = case when status = 'enabled' then 'disabled' else 'enabled' end,
        updated_at = now()
      where id = $1
      returning id, name, scope, status, member_count, description, permissions
    `,
    [id]
  );
  return result.rows[0] ? mapRole(result.rows[0]) : null;
}

export async function toggleRolePermission(id: string, permission: string): Promise<RoleRecord | null> {
  const role = await pool.query("select permissions from roles where id = $1", [id]);
  if (!role.rows[0]) {
    return null;
  }
  const current: string[] = Array.isArray(role.rows[0].permissions) ? role.rows[0].permissions.map(String) : [];
  const nextPermissions = current.includes(permission)
    ? current.filter((key) => key !== permission)
    : [...current, permission];
  const result = await pool.query(
    `
      update roles
      set permissions = $2, updated_at = now()
      where id = $1
      returning id, name, scope, status, member_count, description, permissions
    `,
    [id, nextPermissions]
  );
  return result.rows[0] ? mapRole(result.rows[0]) : null;
}

export async function getApprovalTickets(): Promise<ApprovalTicketRecord[]> {
  const result = await pool.query(`
    select id, title, ticket_type, status, risk_level, requester, target, environment,
      created_at, reviewed_at, reviewer, comment, summary, steps, related_resource
    from approval_tickets
    order by created_at desc
  `);
  return result.rows.map(mapApprovalTicket);
}

export async function reviewApprovalTicket(
  id: string,
  action: "approve" | "reject",
  comment: string
): Promise<ApprovalTicketRecord | null> {
  const result = await pool.query(
    `
      update approval_tickets
      set status = $2,
        reviewer = 'ops-admin',
        reviewed_at = now(),
        comment = $3,
        updated_at = now()
      where id = $1
      returning id, title, ticket_type, status, risk_level, requester, target, environment,
        created_at, reviewed_at, reviewer, comment, summary, steps, related_resource
    `,
    [id, action === "approve" ? "approved" : "rejected", comment]
  );
  return result.rows[0] ? mapApprovalTicket(result.rows[0]) : null;
}

export async function getSlashCommands(): Promise<SlashCommandRecord[]> {
  const result = await pool.query(`
    select command, description, example
    from slash_commands
    order by command asc
  `);
  return result.rows.map(mapSlashCommand);
}

export async function getPackages(): Promise<PackageRecord[]> {
  const result = await pool.query(`
    select id, name, package_type, version, package_size, checksum, status
    from packages
    order by created_at asc
  `);
  return result.rows.map(mapPackage);
}

export async function getPackage(id: string): Promise<PackageRecord | null> {
  const result = await pool.query(
    `
      select id, name, package_type, version, package_size, checksum, status
      from packages
      where id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapPackage(result.rows[0]) : null;
}

export async function getManagedFiles(): Promise<ManagedFileRecord[]> {
  const result = await pool.query(`
    select id, name, file_path, file_type, file_size, source, updated_at
    from managed_files
    order by updated_at desc
  `);
  return result.rows.map(mapManagedFile);
}

export async function getManagedFile(id: string): Promise<ManagedFileRecord | null> {
  const result = await pool.query(
    `
      select id, name, file_path, file_type, file_size, source, updated_at
      from managed_files
      where id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapManagedFile(result.rows[0]) : null;
}

export async function getTenants(): Promise<TenantRecord[]> {
  const result = await pool.query(`
    select id, name, status, servers, alerts, ai_diagnoses_today, quota
    from tenants
    order by created_at asc
  `);
  return result.rows.map(mapTenant);
}

export async function createTaskRecord(input: TaskRecordInput): Promise<TaskRecord> {
  const result = await pool.query(
    `
      insert into task_records (
        id, task_type, status, risk_level, requires_approval, target_id, target_name,
        resource_id, resource_name, summary, plan, output
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning id, task_type, status, risk_level, requires_approval, target_id, target_name,
        resource_id, resource_name, summary, plan, output, created_at, updated_at
    `,
    [
      input.id,
      input.taskType,
      input.status,
      input.riskLevel,
      input.requiresApproval,
      input.targetId,
      input.targetName,
      input.resourceId,
      input.resourceName,
      input.summary,
      input.plan,
      input.output
    ]
  );
  return mapTaskRecord(result.rows[0]);
}

export async function getTaskRecords(limit = 20): Promise<TaskRecord[]> {
  const result = await pool.query(
    `
      select id, task_type, status, risk_level, requires_approval, target_id, target_name,
        resource_id, resource_name, summary, plan, output, created_at, updated_at
      from task_records
      order by created_at desc
      limit $1
    `,
    [limit]
  );
  return result.rows.map(mapTaskRecord);
}

export async function createAuditLog(input: AuditLogInput): Promise<AuditLogRecord> {
  const result = await pool.query(
    `
      insert into audit_logs (id, action, actor, resource_type, resource_id, summary, details)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id, action, actor, resource_type, resource_id, summary, details, created_at
    `,
    [
      `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      input.action,
      input.actor,
      input.resourceType,
      input.resourceId,
      input.summary,
      JSON.stringify(input.details ?? {})
    ]
  );
  return mapAuditLog(result.rows[0]);
}

export async function getAuditLogs(limit = 50): Promise<AuditLogRecord[]> {
  const result = await pool.query(
    `
      select id, action, actor, resource_type, resource_id, summary, details, created_at
      from audit_logs
      order by created_at desc
      limit $1
    `,
    [limit]
  );
  return result.rows.map(mapAuditLog);
}

function mapServer(row: Record<string, unknown>): ServerRecord {
  return {
    id: String(row.id),
    ip: String(row.ip),
    port: Number(row.port),
    hostname: String(row.hostname),
    environment: String(row.environment),
    tenant: String(row.tenant),
    status: String(row.status),
    agentStatus: String(row.agent_status),
    os: String(row.os),
    cpuUsage: Number(row.cpu_usage),
    memoryUsage: Number(row.memory_usage),
    diskUsage: Number(row.disk_usage),
    loadAvg: Number(row.load_avg),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    type: String(row.type ?? "server")
  };
}

async function upsertInventory(
  client: PoolClient,
  serverId: string,
  inventory: Omit<ServerInventoryRecord, "serverId" | "collectedAt">
) {
  await client.query(
    `
      insert into server_inventory (
        server_id, kernel, cpu_model, cpu_cores, memory_total_mb, disk_total_gb,
        uptime_seconds, network_cards, boot_time, collected_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      on conflict (server_id) do update
      set kernel = excluded.kernel,
        cpu_model = excluded.cpu_model,
        cpu_cores = excluded.cpu_cores,
        memory_total_mb = excluded.memory_total_mb,
        disk_total_gb = excluded.disk_total_gb,
        uptime_seconds = excluded.uptime_seconds,
        network_cards = excluded.network_cards,
        boot_time = excluded.boot_time,
        collected_at = now()
    `,
    [
      serverId,
      inventory.kernel,
      inventory.cpuModel,
      inventory.cpuCores,
      inventory.memoryTotalMb,
      inventory.diskTotalGb,
      inventory.uptimeSeconds,
      inventory.networkCards,
      inventory.bootTime
    ]
  );
}

function mapServerInventory(row: Record<string, unknown>): ServerInventoryRecord {
  return {
    serverId: String(row.server_id),
    kernel: String(row.kernel),
    cpuModel: String(row.cpu_model),
    cpuCores: Number(row.cpu_cores),
    memoryTotalMb: Number(row.memory_total_mb),
    diskTotalGb: Number(row.disk_total_gb),
    uptimeSeconds: Number(row.uptime_seconds),
    networkCards: Array.isArray(row.network_cards) ? row.network_cards.map(String) : [],
    bootTime: new Date(String(row.boot_time)).toISOString(),
    collectedAt: new Date(String(row.collected_at)).toISOString()
  };
}

function mapServerMetric(row: Record<string, unknown>): ServerMetricRecord {
  return {
    serverId: String(row.server_id),
    cpuUsage: Number(row.cpu_usage),
    memoryUsage: Number(row.memory_usage),
    diskUsage: Number(row.disk_usage),
    loadAvg: Number(row.load_avg),
    collectedAt: new Date(String(row.collected_at)).toISOString(),
    topProcesses: parseJsonArray(row.top_processes) as ServerMetricRecord["topProcesses"],
    services: parseJsonArray(row.services) as ServerMetricRecord["services"],
    recentLogs: String(row.recent_logs ?? ""),
    networkConnections: String(row.network_connections ?? ""),
    diskDetails: parseJsonArray(row.disk_details) as ServerMetricRecord["diskDetails"]
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapAiModel(row: Record<string, unknown>): AiModelRecord {
  const envName = row.api_key_env_name ? String(row.api_key_env_name) : null;
  return {
    id: String(row.id),
    name: String(row.name),
    provider: String(row.provider),
    type: String(row.model_type),
    status: String(row.status),
    isDefault: Boolean(row.is_default),
    contextWindow: String(row.context_window),
    latencyMs: Number(row.latency_ms),
    costLevel: String(row.cost_level),
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.map(String) : [],
    endpoint: String(row.endpoint),
    apiKeyEnvName: envName,
    apiKeyConfigured: Boolean((envName && process.env[envName]) || row.api_key_secret)
  };
}

function mapAiModelRuntime(row: Record<string, unknown>): AiModelRuntimeRecord {
  return {
    ...mapAiModel(row),
    apiKeySecret: row.api_key_secret ? String(row.api_key_secret) : null
  };
}

function mapMember(row: Record<string, unknown>): MemberRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
    team: String(row.team),
    status: String(row.status),
    lastSeenAt: row.last_seen_at ? new Date(String(row.last_seen_at)).toISOString() : null,
    permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : []
  };
}

function mapTeam(row: Record<string, unknown>, members: MemberRecord[]): TeamRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    parentId: row.parent_id ? String(row.parent_id) : null,
    type: String(row.team_type),
    status: String(row.status),
    lead: String(row.lead),
    memberCount: Number(row.member_count),
    serverCount: Number(row.server_count),
    approvalSla: String(row.approval_sla),
    description: String(row.description),
    responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities.map(String) : [],
    members
  };
}

function mapRole(row: Record<string, unknown>): RoleRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    scope: String(row.scope),
    status: String(row.status),
    memberCount: Number(row.member_count),
    description: String(row.description),
    permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : []
  };
}

function mapApprovalTicket(row: Record<string, unknown>): ApprovalTicketRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    type: String(row.ticket_type),
    status: String(row.status),
    riskLevel: String(row.risk_level),
    requester: String(row.requester),
    target: String(row.target),
    environment: String(row.environment),
    createdAt: new Date(String(row.created_at)).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(String(row.reviewed_at)).toISOString() : null,
    reviewer: row.reviewer ? String(row.reviewer) : null,
    comment: row.comment ? String(row.comment) : null,
    summary: String(row.summary),
    steps: Array.isArray(row.steps) ? row.steps.map(String) : [],
    relatedResource: String(row.related_resource)
  };
}

function mapSlashCommand(row: Record<string, unknown>): SlashCommandRecord {
  return {
    command: String(row.command),
    description: String(row.description),
    example: String(row.example)
  };
}

function mapPackage(row: Record<string, unknown>): PackageRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.package_type),
    version: String(row.version),
    size: String(row.package_size),
    checksum: String(row.checksum),
    status: String(row.status)
  };
}

function mapManagedFile(row: Record<string, unknown>): ManagedFileRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    path: String(row.file_path),
    type: String(row.file_type),
    size: String(row.file_size),
    source: String(row.source),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapTenant(row: Record<string, unknown>): TenantRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    status: String(row.status),
    servers: Number(row.servers),
    alerts: Number(row.alerts),
    aiDiagnosesToday: Number(row.ai_diagnoses_today),
    quota: String(row.quota)
  };
}

function mapTaskRecord(row: Record<string, unknown>): TaskRecord {
  return {
    id: String(row.id),
    taskType: String(row.task_type),
    status: String(row.status),
    riskLevel: String(row.risk_level),
    requiresApproval: Boolean(row.requires_approval),
    targetId: row.target_id ? String(row.target_id) : null,
    targetName: row.target_name ? String(row.target_name) : null,
    resourceId: String(row.resource_id),
    resourceName: String(row.resource_name),
    summary: String(row.summary),
    plan: Array.isArray(row.plan) ? row.plan.map(String) : [],
    output: row.output ? String(row.output) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapAuditLog(row: Record<string, unknown>): AuditLogRecord {
  const details = row.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {};
  return {
    id: String(row.id),
    action: String(row.action),
    actor: String(row.actor),
    resourceType: String(row.resource_type),
    resourceId: String(row.resource_id),
    summary: String(row.summary),
    details: details as Record<string, unknown>,
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
