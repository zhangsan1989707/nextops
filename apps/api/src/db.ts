import pg from "pg";

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://nextops:nextops@localhost:5432/nextops"
});

const demoServers: ServerRecord[] = [
  {
    id: "srv-prod-web-01",
    ip: "10.0.1.21",
    port: 22,
    hostname: "prod-web-01",
    environment: "production",
    tenant: "default",
    status: "healthy",
    agentStatus: "online",
    os: "Ubuntu 22.04 LTS",
    cpuUsage: 42,
    memoryUsage: 67,
    diskUsage: 58,
    loadAvg: 1.72,
    tags: ["web", "nginx", "prod"]
  },
  {
    id: "srv-prod-db-01",
    ip: "10.0.2.18",
    port: 22,
    hostname: "prod-db-01",
    environment: "production",
    tenant: "default",
    status: "warning",
    agentStatus: "online",
    os: "Rocky Linux 9",
    cpuUsage: 71,
    memoryUsage: 82,
    diskUsage: 76,
    loadAvg: 3.41,
    tags: ["database", "postgres", "prod"]
  },
  {
    id: "srv-stage-api-01",
    ip: "10.0.8.33",
    port: 22,
    hostname: "stage-api-01",
    environment: "staging",
    tenant: "default",
    status: "offline",
    agentStatus: "not_installed",
    os: "Debian 12",
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 49,
    loadAvg: 0,
    tags: ["api", "staging"]
  }
];

const demoAlerts: AlertRecord[] = [
  {
    id: "alt-001",
    title: "prod-db-01 内存使用率持续高于 80%",
    severity: "critical",
    status: "open",
    source: "server_metrics",
    serverId: "srv-prod-db-01",
    triggeredAt: "2026-05-11T02:10:00.000Z"
  },
  {
    id: "alt-002",
    title: "prod-web-01 nginx 5xx 错误率升高",
    severity: "warning",
    status: "acknowledged",
    source: "logs",
    serverId: "srv-prod-web-01",
    triggeredAt: "2026-05-11T02:25:00.000Z"
  }
];

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
    permissions: ["全局配置", "模型管理", "审批处理", "服务器纳管"]
  },
  {
    id: "mem-002",
    name: "SRE Oncall",
    email: "sre@example.com",
    role: "SRE",
    team: "稳定性团队",
    status: "active",
    lastSeenAt: "2026-05-12T06:40:00.000Z",
    permissions: ["告警处理", "脚本执行", "AI 诊断"]
  },
  {
    id: "mem-003",
    name: "DevOps Reviewer",
    email: "devops@example.com",
    role: "Reviewer",
    team: "DevOps Lab",
    status: "pending",
    lastSeenAt: null,
    permissions: ["工单审核", "部署确认"]
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
  }
];

export async function initializeDatabase() {
  await runMigrations();

  const serverCount = await pool.query<{ count: string }>("select count(*) from servers");
  if (Number(serverCount.rows[0]?.count ?? 0) === 0) {
    for (const server of demoServers) {
      await createServer(server);
    }
  }

  const alertCount = await pool.query<{ count: string }>("select count(*) from alerts");
  if (Number(alertCount.rows[0]?.count ?? 0) === 0) {
    for (const alert of demoAlerts) {
      await pool.query(
        `
          insert into alerts (id, title, severity, status, source, server_id, triggered_at)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (id) do nothing
        `,
        [alert.id, alert.title, alert.severity, alert.status, alert.source, alert.serverId, alert.triggeredAt]
      );
    }
  }

  const scriptCount = await pool.query<{ count: string }>("select count(*) from scripts");
  if (Number(scriptCount.rows[0]?.count ?? 0) === 0) {
    for (const script of demoScripts) {
      await pool.query(
        `
          insert into scripts (id, name, type, risk_level, version, success_rate)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (id) do nothing
        `,
        [script.id, script.name, script.type, script.riskLevel, script.version, script.successRate]
      );
    }
  }

  const modelCount = await pool.query<{ count: string }>("select count(*) from ai_models");
  if (Number(modelCount.rows[0]?.count ?? 0) === 0) {
    for (const model of demoModels) {
      await createAiModel(model);
    }
  }

  await seedIdentityAccess();
}

async function seedIdentityAccess() {
  const permissionCount = await pool.query<{ count: string }>("select count(*) from permissions");
  if (Number(permissionCount.rows[0]?.count ?? 0) === 0) {
    for (const permission of demoPermissions) {
      await pool.query(
        "insert into permissions (key, label, permission_group) values ($1, $2, $3) on conflict (key) do nothing",
        [permission.key, permission.label, permission.group]
      );
    }
  }

  const memberCount = await pool.query<{ count: string }>("select count(*) from members");
  if (Number(memberCount.rows[0]?.count ?? 0) === 0) {
    for (const member of demoMembers) {
      await pool.query(
        `
          insert into members (id, name, email, role, team, status, last_seen_at, permissions)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (id) do nothing
        `,
        [member.id, member.name, member.email, member.role, member.team, member.status, member.lastSeenAt, member.permissions]
      );
    }
  }

  const teamCount = await pool.query<{ count: string }>("select count(*) from teams");
  if (Number(teamCount.rows[0]?.count ?? 0) === 0) {
    for (const team of demoTeams) {
      await pool.query(
        `
          insert into teams (
            id, name, parent_id, team_type, status, lead, member_count, server_count,
            approval_sla, description, responsibilities
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          on conflict (id) do nothing
        `,
        [
          team.id,
          team.name,
          team.parentId,
          team.type,
          team.status,
          team.lead,
          team.memberCount,
          team.serverCount,
          team.approvalSla,
          team.description,
          team.responsibilities
        ]
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
      cpu_usage, memory_usage, disk_usage, load_avg, tags
    from servers
    order by created_at asc
  `);
  return result.rows.map(mapServer);
}

export async function getServer(id: string): Promise<ServerRecord | null> {
  const result = await pool.query(
    `
      select id, ip, port, hostname, environment, tenant, status, agent_status, os,
        cpu_usage, memory_usage, disk_usage, load_avg, tags
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
        cpu_usage, memory_usage, disk_usage, load_avg, tags
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      returning id, ip, port, hostname, environment, tenant, status, agent_status, os,
        cpu_usage, memory_usage, disk_usage, load_avg, tags
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
      input.tags
    ]
  );
  return mapServer(result.rows[0]);
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

export async function getMembers(): Promise<MemberRecord[]> {
  const result = await pool.query(`
    select id, name, email, role, team, status, last_seen_at, permissions
    from members
    order by created_at asc
  `);
  return result.rows.map(mapMember);
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
    tags: Array.isArray(row.tags) ? row.tags.map(String) : []
  };
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
