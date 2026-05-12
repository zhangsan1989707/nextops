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

export async function initializeDatabase() {
  await pool.query(`
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
  `);

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
