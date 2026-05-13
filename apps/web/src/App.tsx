import {
  Activity,
  ArrowLeft,
  Bell,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  FileCode2,
  FileText,
  Gauge,
  GitBranch,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  Package,
  PlayCircle,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Terminal,
  Users,
  XCircle
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

type DashboardSummary = {
  servers: { total: number; online: number; warning: number; offline: number };
  alerts: { total: number; critical: number; open: number };
  automation: { slashCommands: number; scripts: number; aiDiagnosesToday: number };
  trends: Array<{ label: string; cpu: number; memory: number; alerts: number }>;
};

type ServerItem = {
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
};

type ServerDetailData = ServerItem & {
  system: {
    kernel: string;
    cpuModel: string;
    cpuCores: number;
    memoryTotalMb: number;
    diskTotalGb: number;
    uptimeDays: number;
    networkCards: string[];
    bootTime: string;
  };
  realtime: Array<{ label: string; cpu: number; memory: number }>;
  alertRules: Array<{ id: string; name: string; metric: string; threshold: number; enabled: boolean }>;
};

type AlertItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  serverId: string;
  triggeredAt: string;
};

type ScriptItem = {
  id: string;
  name: string;
  type: string;
  riskLevel: string;
  version: string;
  successRate: number;
};

type ScriptDetailData = ScriptItem & {
  description: string;
  parameters: Array<{ name: string; required: boolean; defaultValue: string }>;
  content: string;
  lastRuns: Array<{ id: string; target: string; status: string; durationSeconds: number; createdAt: string }>;
};

type ScriptRunResult = {
  taskId: string;
  scriptName: string;
  status: string;
  riskLevel: string;
  requiresApproval: boolean;
  plan: string[];
  output: string;
  target: { id: string; hostname: string; ip: string; environment: string };
};

type SlashCommandItem = {
  command: string;
  description: string;
  example: string;
};

type PackageItem = {
  id: string;
  name: string;
  type: string;
  version: string;
  size: string;
  checksum: string;
  status: string;
};

type PackageDeployPlan = {
  packageName: string;
  version: string;
  requiresApproval: boolean;
  riskLevel: string;
  target: { id: string; hostname: string; environment: string };
  steps: string[];
};

type FileItem = {
  id: string;
  name: string;
  path: string;
  type: string;
  size: string;
  source: string;
  updatedAt: string;
};

type FileTransferPlan = {
  fileName: string;
  mode: string;
  riskLevel: string;
  requiresApproval: boolean;
  target: { id: string; hostname: string; environment: string };
  steps: string[];
};

type TenantItem = {
  id: string;
  name: string;
  status: string;
  servers: number;
  alerts: number;
  aiDiagnosesToday: number;
  quota: string;
};

type TenantSummary = {
  items: TenantItem[];
  totals: {
    tenants: number;
    servers: number;
    alerts: number;
    aiDiagnosesToday: number;
  };
};

type ApprovalItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  riskLevel: string;
  requester: string;
  target: string;
  environment: string;
  createdAt: string;
  reviewedAt?: string;
  reviewer?: string;
  comment?: string;
  summary: string;
  steps: string[];
  relatedResource: string;
};

type ApprovalSummary = {
  items: ApprovalItem[];
  totals: {
    pending: number;
    approved: number;
    rejected: number;
    highRisk: number;
  };
};

type ModelItem = {
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
  apiKeyConfigured: boolean;
};

type ModelSummary = {
  items: ModelItem[];
  totals: {
    models: number;
    enabled: number;
    chat: number;
    embedding: number;
  };
};

type ModelDraft = {
  name: string;
  id: string;
  provider: string;
  type: string;
  endpoint: string;
  apiKey: string;
  contextWindow: string;
  costLevel: string;
  setDefault: boolean;
};

type ModelTestResult = {
  modelId: string;
  ok: boolean;
  status: string;
  latencyMs: number;
  checkedAt: string;
  checks: string[];
  warnings: string[];
};

type MemberItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  status: string;
  lastSeenAt: string | null;
  permissions: string[];
};

type MemberSummary = {
  items: MemberItem[];
  totals: {
    members: number;
    active: number;
    pending: number;
    admins: number;
  };
};

type TeamItem = {
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
  members: MemberItem[];
};

type TeamSummary = {
  items: TeamItem[];
  totals: {
    teams: number;
    active: number;
    members: number;
    servers: number;
  };
};

type PermissionItem = {
  key: string;
  label: string;
  group: string;
};

type RoleItem = {
  id: string;
  name: string;
  scope: string;
  status: string;
  memberCount: number;
  description: string;
  permissions: string[];
};

type RoleSummary = {
  items: RoleItem[];
  permissions: PermissionItem[];
  totals: {
    roles: number;
    enabled: number;
    permissions: number;
    assignments: number;
  };
};

type ChatResponse = {
  intent: string;
  riskLevel: string;
  plan: string[];
  reply: string;
};

type ServerDraft = {
  hostname: string;
  ip: string;
  port: string;
  environment: string;
  os: string;
  tags: string;
};

type AgentInstallPlan = {
  title: string;
  riskLevel: string;
  steps: string[];
  command: string;
  requiresApproval: boolean;
};

type DiagnosisReport = {
  summary: string;
  evidence: string[];
  possibleCauses: string[];
  repairPlan: string[];
};

type AlertDiagnosisReport = DiagnosisReport & {
  alertId: string;
  serverId: string;
  impact: string;
  timeline: Array<{ time: string; event: string }>;
};

const menuGroups = [
  {
    title: "核心业务",
    items: [
      { key: "dashboard", label: "仪表盘", icon: LayoutDashboard },
      { key: "chatops", label: "ChatOps", icon: MessageSquareText },
      { key: "alerts", label: "告警中心", icon: Bell }
    ]
  },
  {
    title: "资产与脚本",
    items: [
      { key: "servers", label: "服务器管理", icon: Server },
      { key: "scripts", label: "脚本中心", icon: FileCode2 },
      { key: "commands", label: "快捷指令", icon: Terminal },
      { key: "packages", label: "包管理", icon: Package },
      { key: "files", label: "文件管理", icon: FileText }
    ]
  },
  {
    title: "多租户与授权",
    items: [
      { key: "tenants", label: "多租户大盘", icon: Building2 },
      { key: "approvals", label: "工单审核", icon: ShieldCheck }
    ]
  },
  {
    title: "设置与成员",
    items: [
      { key: "models", label: "模型管理", icon: Bot },
      { key: "members", label: "成员管理", icon: Users },
      { key: "teams", label: "团队结构", icon: GitBranch },
      { key: "roles", label: "权限与角色", icon: KeyRound }
    ]
  }
];

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [slashCommands, setSlashCommands] = useState<SlashCommandItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tenantSummary, setTenantSummary] = useState<TenantSummary | null>(null);
  const [approvalSummary, setApprovalSummary] = useState<ApprovalSummary | null>(null);
  const [modelSummary, setModelSummary] = useState<ModelSummary | null>(null);
  const [memberSummary, setMemberSummary] = useState<MemberSummary | null>(null);
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [roleSummary, setRoleSummary] = useState<RoleSummary | null>(null);
  const [message, setMessage] = useState("帮我巡检生产环境所有 Web 服务器，并生成风险摘要");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find((item) => item.key === activePage);
      if (found) return found.label;
    }
    if (activePage === "server-detail") return "服务器详情";
    return "仪表盘";
  }, [activePage]);

  async function loadServers() {
    const nextServers = await fetchJson<{ items: ServerItem[] }>("/api/servers");
    setServers(nextServers.items);
  }

  async function refreshData() {
    await loadPageData(activePage);
  }

  async function loadPageData(page: string) {
    setPageLoading(true);
    setPageError(null);
    if (page === "servers") {
      setLoadingServers(true);
    }

    try {
      if (page === "dashboard") {
        const [nextSummary, nextServers] = await Promise.all([
          fetchJson<DashboardSummary>("/api/dashboard/summary"),
          fetchJson<{ items: ServerItem[] }>("/api/servers")
        ]);
        setSummary(nextSummary);
        setServers(nextServers.items);
      } else if (page === "alerts") {
        const [nextAlerts, nextServers] = await Promise.all([
          fetchJson<{ items: AlertItem[] }>("/api/alerts"),
          fetchJson<{ items: ServerItem[] }>("/api/servers")
        ]);
        setAlerts(nextAlerts.items);
        setServers(nextServers.items);
      } else if (page === "servers") {
        await loadServers();
      } else if (page === "scripts") {
        const [nextScripts, nextServers] = await Promise.all([
          fetchJson<{ items: ScriptItem[] }>("/api/scripts"),
          fetchJson<{ items: ServerItem[] }>("/api/servers")
        ]);
        setScripts(nextScripts.items);
        setServers(nextServers.items);
      } else if (page === "commands") {
        const nextSlashCommands = await fetchJson<{ items: SlashCommandItem[] }>("/api/slash-commands");
        setSlashCommands(nextSlashCommands.items);
      } else if (page === "packages") {
        const [nextPackages, nextServers] = await Promise.all([
          fetchJson<{ items: PackageItem[] }>("/api/packages"),
          fetchJson<{ items: ServerItem[] }>("/api/servers")
        ]);
        setPackages(nextPackages.items);
        setServers(nextServers.items);
      } else if (page === "files") {
        const [nextFiles, nextServers] = await Promise.all([
          fetchJson<{ items: FileItem[] }>("/api/files"),
          fetchJson<{ items: ServerItem[] }>("/api/servers")
        ]);
        setFiles(nextFiles.items);
        setServers(nextServers.items);
      } else if (page === "tenants") {
        setTenantSummary(await fetchJson<TenantSummary>("/api/tenants/summary"));
      } else if (page === "approvals") {
        setApprovalSummary(await fetchJson<ApprovalSummary>("/api/approvals"));
      } else if (page === "models") {
        setModelSummary(await fetchJson<ModelSummary>("/api/models"));
      } else if (page === "members") {
        setMemberSummary(await fetchJson<MemberSummary>("/api/members"));
      } else if (page === "teams") {
        setTeamSummary(await fetchJson<TeamSummary>("/api/teams/summary"));
      } else if (page === "roles") {
        setRoleSummary(await fetchJson<RoleSummary>("/api/roles/summary"));
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "页面数据加载失败");
    } finally {
      setPageLoading(false);
      if (page === "servers") {
        setLoadingServers(false);
      }
    }
  }

  useEffect(() => {
    void loadPageData(activePage);
  }, [activePage]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    setLoadingChat(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatops/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      setChatResponse((await response.json()) as ChatResponse);
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>NextOps</strong>
            <span>AI Operations</span>
          </div>
        </div>

        <nav className="nav">
          {menuGroups.map((group) => (
            <section key={group.title} className="nav-group">
              <p>{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={activePage === item.key ? "nav-item active" : "nav-item"}
                    key={item.key}
                    onClick={() => setActivePage(item.key)}
                    type="button"
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">当复杂操作变成一句话</p>
            <h1>{activeLabel}</h1>
          </div>
          <div className="top-actions">
            <div className="search">
              <Search size={16} />
              <input placeholder="搜索服务器、告警、脚本或指令" />
            </div>
            <div className="settings-menu">
              <button
                aria-expanded={settingsOpen}
                aria-label="系统设置"
                className="icon-button"
                onClick={() => setSettingsOpen((open) => !open)}
                type="button"
                title="系统设置"
              >
                <Settings size={18} />
              </button>
              {settingsOpen && (
                <div className="settings-popover">
                  {[
                    { key: "models", label: "模型管理", icon: Bot },
                    { key: "members", label: "成员管理", icon: Users },
                    { key: "teams", label: "团队结构", icon: GitBranch },
                    { key: "roles", label: "权限与角色", icon: KeyRound }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActivePage(item.key);
                          setSettingsOpen(false);
                        }}
                        type="button"
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {pageError && <div className="table-empty">当前页面数据加载失败：{pageError}</div>}
        {pageLoading && activePage !== "servers" && <div className="table-empty">正在加载当前页面数据...</div>}

        {activePage === "dashboard" && <Dashboard summary={summary} servers={servers} />}
        {activePage === "chatops" && (
          <ChatOps
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
            response={chatResponse}
            loading={loadingChat}
          />
        )}
        {activePage === "alerts" && (
          <Alerts
            alerts={alerts}
            servers={servers}
            onOpenServer={(serverId) => {
              setSelectedServerId(serverId);
              setActivePage("server-detail");
            }}
          />
        )}
        {activePage === "servers" && (
          <Servers
            servers={servers}
            loading={loadingServers}
            onOpenServer={(serverId) => {
              setSelectedServerId(serverId);
              setActivePage("server-detail");
            }}
            onServerCreated={refreshData}
          />
        )}
        {activePage === "scripts" && <Scripts scripts={scripts} servers={servers} />}
        {activePage === "commands" && <Commands commands={slashCommands} />}
        {activePage === "packages" && <Packages packages={packages} servers={servers} />}
        {activePage === "files" && <Files files={files} servers={servers} />}
        {activePage === "tenants" && <Tenants summary={tenantSummary} />}
        {activePage === "approvals" && <Approvals summary={approvalSummary} />}
        {activePage === "models" && <Models summary={modelSummary} />}
        {activePage === "members" && <Members summary={memberSummary} />}
        {activePage === "teams" && <Teams summary={teamSummary} />}
        {activePage === "roles" && <Roles summary={roleSummary} />}
        {activePage === "server-detail" && selectedServerId && (
          <ServerDetail
            serverId={selectedServerId}
            onBack={() => {
              setSelectedServerId(null);
              setActivePage("servers");
            }}
          />
        )}
        {activePage !== "dashboard" &&
          activePage !== "alerts" &&
          activePage !== "chatops" &&
          activePage !== "servers" &&
          activePage !== "scripts" &&
          activePage !== "commands" &&
          activePage !== "packages" &&
          activePage !== "files" &&
          activePage !== "tenants" &&
          activePage !== "approvals" &&
          activePage !== "models" &&
          activePage !== "members" &&
          activePage !== "teams" &&
          activePage !== "roles" &&
          activePage !== "server-detail" && <Placeholder title={activeLabel} />}
      </main>
    </div>
  );
}

function Alerts({
  alerts,
  servers,
  onOpenServer
}: {
  alerts: AlertItem[];
  servers: ServerItem[];
  onOpenServer: (serverId: string) => void;
}) {
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(alerts[0] ?? null);
  const [diagnosis, setDiagnosis] = useState<AlertDiagnosisReport | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);

  useEffect(() => {
    if (!selectedAlert && alerts.length > 0) {
      setSelectedAlert(alerts[0]);
    }
  }, [alerts, selectedAlert]);

  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const openCount = alerts.filter((alert) => alert.status === "open").length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === "acknowledged").length;

  async function diagnose(alert: AlertItem) {
    setSelectedAlert(alert);
    setLoadingDiagnosis(true);
    try {
      setDiagnosis(await postJson<AlertDiagnosisReport>(`/api/alerts/${alert.id}/diagnose`, {}));
    } finally {
      setLoadingDiagnosis(false);
    }
  }

  function serverName(serverId: string) {
    return servers.find((server) => server.id === serverId)?.hostname ?? serverId;
  }

  return (
    <section className="alerts-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon amber"><Bell size={20} /></div>
          <span>告警总数</span>
          <strong>{alerts.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Bell size={20} /></div>
          <span>Critical</span>
          <strong>{criticalCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon blue"><Activity size={20} /></div>
          <span>待处理</span>
          <strong>{openCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><ShieldCheck size={20} /></div>
          <span>处理中</span>
          <strong>{acknowledgedCount}</strong>
        </article>
      </div>

      <div className="alerts-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">事件</p>
              <h2>告警列表</h2>
            </div>
          </div>
          <div className="alert-list">
            {alerts.map((alert) => (
              <button
                className={selectedAlert?.id === alert.id ? "alert-item active" : "alert-item"}
                key={alert.id}
                onClick={() => {
                  setSelectedAlert(alert);
                  setDiagnosis(null);
                }}
                type="button"
              >
                <span className={`severity ${alert.severity}`}>{alert.severity}</span>
                <strong>{alert.title}</strong>
                <small>{serverName(alert.serverId)} · {alert.source}</small>
                <em>{alert.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">处置</p>
              <h2>告警详情</h2>
            </div>
          </div>
          {selectedAlert ? (
            <div className="alert-detail">
              <div>
                <span className={`severity ${selectedAlert.severity}`}>{selectedAlert.severity}</span>
                <h3>{selectedAlert.title}</h3>
                <p>{new Date(selectedAlert.triggeredAt).toLocaleString()} · {selectedAlert.source}</p>
              </div>
              <dl className="config-list">
                <div><dt>状态</dt><dd>{selectedAlert.status}</dd></div>
                <div><dt>关联服务器</dt><dd>{serverName(selectedAlert.serverId)}</dd></div>
                <div><dt>事件 ID</dt><dd>{selectedAlert.id}</dd></div>
              </dl>
              <div className="detail-actions">
                <button className="secondary-button" onClick={() => onOpenServer(selectedAlert.serverId)} type="button">
                  <Server size={16} /> 查看服务器
                </button>
                <button
                  className="primary-button"
                  disabled={loadingDiagnosis}
                  onClick={() => diagnose(selectedAlert)}
                  type="button"
                >
                  <Bot size={16} /> {loadingDiagnosis ? "诊断中" : "AI 诊断"}
                </button>
              </div>
            </div>
          ) : (
            <div className="table-empty">暂无告警</div>
          )}
        </article>
      </div>

      {diagnosis && (
        <article className="panel wide-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AI 诊断</p>
              <h2>告警诊断报告</h2>
            </div>
            <span className="status">{diagnosis.alertId}</span>
          </div>
          <p className="diagnosis-summary">{diagnosis.summary}</p>
          <p className="diagnosis-impact">{diagnosis.impact}</p>
          <div className="timeline">
            {diagnosis.timeline.map((item) => (
              <div key={`${item.time}-${item.event}`}>
                <span>{new Date(item.time).toLocaleTimeString()}</span>
                <strong>{item.event}</strong>
              </div>
            ))}
          </div>
          <div className="diagnosis-grid">
            <ListBlock title="证据链" items={diagnosis.evidence} />
            <ListBlock title="可能原因" items={diagnosis.possibleCauses} />
            <ListBlock title="修复方案" items={diagnosis.repairPlan} />
          </div>
        </article>
      )}
    </section>
  );
}

function Scripts({ scripts, servers }: { scripts: ScriptItem[]; servers: ServerItem[] }) {
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id ?? null);
  const [detail, setDetail] = useState<ScriptDetailData | null>(null);
  const [targetId, setTargetId] = useState<string>(servers[0]?.id ?? "");
  const [runResult, setRunResult] = useState<ScriptRunResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!selectedScriptId && scripts.length > 0) {
      setSelectedScriptId(scripts[0].id);
    }
  }, [scripts, selectedScriptId]);

  useEffect(() => {
    if (!targetId && servers.length > 0) {
      setTargetId(servers[0].id);
    }
  }, [servers, targetId]);

  useEffect(() => {
    if (!selectedScriptId) {
      return;
    }
    setLoadingDetail(true);
    setRunResult(null);
    fetchJson<ScriptDetailData>(`/api/scripts/${selectedScriptId}`)
      .then(setDetail)
      .finally(() => setLoadingDetail(false));
  }, [selectedScriptId]);

  async function runScript() {
    if (!selectedScriptId || !targetId) {
      return;
    }
    setRunning(true);
    try {
      setRunResult(await postJson<ScriptRunResult>(`/api/scripts/${selectedScriptId}/run`, { targetId }));
    } finally {
      setRunning(false);
    }
  }

  const lowRiskCount = scripts.filter((script) => script.riskLevel === "low").length;
  const avgSuccess =
    scripts.length > 0 ? Math.round(scripts.reduce((total, script) => total + script.successRate, 0) / scripts.length) : 0;

  return (
    <section className="scripts-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><FileCode2 size={20} /></div>
          <span>脚本总数</span>
          <strong>{scripts.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><ShieldCheck size={20} /></div>
          <span>低风险脚本</span>
          <strong>{lowRiskCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><Activity size={20} /></div>
          <span>平均成功率</span>
          <strong>{avgSuccess}%</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><PlayCircle size={20} /></div>
          <span>可执行目标</span>
          <strong>{servers.length}</strong>
        </article>
      </div>

      <div className="scripts-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">自动化</p>
              <h2>脚本列表</h2>
            </div>
          </div>
          <div className="script-list">
            {scripts.map((script) => (
              <button
                className={selectedScriptId === script.id ? "script-item active" : "script-item"}
                key={script.id}
                onClick={() => setSelectedScriptId(script.id)}
                type="button"
              >
                <FileCode2 size={18} />
                <span>
                  <strong>{script.name}</strong>
                  <small>{script.type} · v{script.version}</small>
                </span>
                <em className={`risk ${script.riskLevel}`}>{script.riskLevel}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">详情</p>
              <h2>{detail?.name ?? "脚本详情"}</h2>
            </div>
            {detail && <span className={`risk ${detail.riskLevel}`}>{detail.riskLevel}</span>}
          </div>
          {loadingDetail && <div className="table-empty">正在加载脚本详情...</div>}
          {!loadingDetail && detail && (
            <div className="script-detail">
              <p>{detail.description}</p>
              <div className="parameter-grid">
                {detail.parameters.map((parameter) => (
                  <div key={parameter.name}>
                    <strong>{parameter.name}</strong>
                    <span>{parameter.required ? "required" : "optional"} · 默认 {parameter.defaultValue}</span>
                  </div>
                ))}
              </div>
              <pre className="code-block">{detail.content}</pre>
              <div className="run-controls">
                <label>
                  执行目标
                  <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.hostname} ({server.environment})
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" disabled={running || !targetId} onClick={runScript} type="button">
                  <PlayCircle size={16} /> {running ? "执行中" : "生成执行计划"}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>

      {detail && (
        <div className="scripts-layout">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">记录</p>
                <h2>最近执行</h2>
              </div>
            </div>
            <div className="run-list">
              {detail.lastRuns.map((run) => (
                <div key={run.id}>
                  <strong>{run.target}</strong>
                  <span>{run.status} · {run.durationSeconds}s · {new Date(run.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </article>

          {runResult && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">执行</p>
                  <h2>执行计划</h2>
                </div>
                <span className="status">{runResult.status}</span>
              </div>
              <p className="diagnosis-summary">
                {runResult.scriptName} · {runResult.target.hostname} · {runResult.requiresApproval ? "需要审批" : "可直接执行"}
              </p>
              <ol className="plan-list">
                {runResult.plan.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <pre className="command-block">{runResult.output}</pre>
            </article>
          )}
        </div>
      )}
    </section>
  );
}

function Commands({ commands }: { commands: SlashCommandItem[] }) {
  const [selectedCommand, setSelectedCommand] = useState<SlashCommandItem | null>(commands[0] ?? null);
  const [draft, setDraft] = useState(commands[0]?.example ?? "");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCommand && commands.length > 0) {
      setSelectedCommand(commands[0]);
      setDraft(commands[0].example);
    }
  }, [commands, selectedCommand]);

  function selectCommand(command: SlashCommandItem) {
    setSelectedCommand(command);
    setDraft(command.example);
    setResponse(null);
  }

  async function previewCommand() {
    if (!draft.trim()) {
      return;
    }
    setLoading(true);
    try {
      setResponse(await postJson<ChatResponse>("/api/chatops/message", { message: draft }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="commands-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><Terminal size={20} /></div>
          <span>指令数量</span>
          <strong>{commands.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><MessageSquareText size={20} /></div>
          <span>ChatOps 可用</span>
          <strong>{commands.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><ShieldCheck size={20} /></div>
          <span>执行前校验</span>
          <strong>100%</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Bot size={20} /></div>
          <span>AI 计划生成</span>
          <strong>on</strong>
        </article>
      </div>

      <div className="commands-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Slash</p>
              <h2>快捷指令</h2>
            </div>
          </div>
          <div className="command-list">
            {commands.map((command) => (
              <button
                className={selectedCommand?.command === command.command ? "command-item active" : "command-item"}
                key={command.command}
                onClick={() => selectCommand(command)}
                type="button"
              >
                <Terminal size={18} />
                <span>
                  <strong>{command.command}</strong>
                  <small>{command.description}</small>
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">预览</p>
              <h2>{selectedCommand?.command ?? "指令预览"}</h2>
            </div>
          </div>
          <div className="command-preview">
            <p>{selectedCommand?.description ?? "选择一个指令查看示例。"}</p>
            <label>
              指令输入
              <input value={draft} onChange={(event) => setDraft(event.target.value)} />
            </label>
            <button className="primary-button" disabled={loading || !draft.trim()} onClick={previewCommand} type="button">
              <Bot size={16} /> {loading ? "生成中" : "生成执行计划"}
            </button>
          </div>
        </article>
      </div>

      {response && (
        <article className="panel wide-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">ChatOps</p>
              <h2>执行计划</h2>
            </div>
            <span className="status">{response.riskLevel}</span>
          </div>
          <p className="diagnosis-summary">{response.reply}</p>
          <ol className="plan-list">
            {response.plan.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
      )}
    </section>
  );
}

function Packages({ packages, servers }: { packages: PackageItem[]; servers: ServerItem[] }) {
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(packages[0] ?? null);
  const [targetId, setTargetId] = useState(servers[0]?.id ?? "");
  const [plan, setPlan] = useState<PackageDeployPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (!selectedPackage && packages.length > 0) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  useEffect(() => {
    if (!targetId && servers.length > 0) {
      setTargetId(servers[0].id);
    }
  }, [servers, targetId]);

  async function generatePlan() {
    if (!selectedPackage || !targetId) {
      return;
    }
    setLoadingPlan(true);
    try {
      setPlan(await postJson<PackageDeployPlan>(`/api/packages/${selectedPackage.id}/deploy-plan`, { targetId }));
    } finally {
      setLoadingPlan(false);
    }
  }

  const releaseCount = packages.filter((item) => item.type === "release").length;
  const verifiedCount = packages.filter((item) => item.status === "verified").length;

  return (
    <section className="packages-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><Package size={20} /></div>
          <span>包总数</span>
          <strong>{packages.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><ShieldCheck size={20} /></div>
          <span>已验证</span>
          <strong>{verifiedCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><Boxes size={20} /></div>
          <span>发布包</span>
          <strong>{releaseCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Server size={20} /></div>
          <span>目标服务器</span>
          <strong>{servers.length}</strong>
        </article>
      </div>

      <div className="packages-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">制品</p>
              <h2>包列表</h2>
            </div>
          </div>
          <div className="package-list">
            {packages.map((item) => (
              <button
                className={selectedPackage?.id === item.id ? "package-item active" : "package-item"}
                key={item.id}
                onClick={() => {
                  setSelectedPackage(item);
                  setPlan(null);
                }}
                type="button"
              >
                <Package size={18} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.type} · {item.version} · {item.size}</small>
                </span>
                <em>{item.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">部署</p>
              <h2>{selectedPackage?.name ?? "包详情"}</h2>
            </div>
            {selectedPackage && <span className="status">{selectedPackage.type}</span>}
          </div>
          {selectedPackage && (
            <div className="package-detail">
              <dl className="config-list">
                <div><dt>版本</dt><dd>{selectedPackage.version}</dd></div>
                <div><dt>大小</dt><dd>{selectedPackage.size}</dd></div>
                <div><dt>校验</dt><dd>{selectedPackage.checksum}</dd></div>
                <div><dt>状态</dt><dd>{selectedPackage.status}</dd></div>
              </dl>
              <div className="run-controls">
                <label>
                  部署目标
                  <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.hostname} ({server.environment})
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" disabled={loadingPlan || !targetId} onClick={generatePlan} type="button">
                  <PlayCircle size={16} /> {loadingPlan ? "生成中" : "生成部署计划"}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>

      {plan && (
        <article className="panel wide-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">部署计划</p>
              <h2>{plan.packageName}@{plan.version}</h2>
            </div>
            <span className="status">{plan.requiresApproval ? "requires approval" : plan.riskLevel}</span>
          </div>
          <p className="diagnosis-summary">
            目标：{plan.target.hostname} ({plan.target.environment})
          </p>
          <ol className="plan-list">
            {plan.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
      )}
    </section>
  );
}

function Files({ files, servers }: { files: FileItem[]; servers: ServerItem[] }) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(files[0] ?? null);
  const [targetId, setTargetId] = useState(servers[0]?.id ?? "");
  const [mode, setMode] = useState("push");
  const [plan, setPlan] = useState<FileTransferPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (!selectedFile && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);

  useEffect(() => {
    if (!targetId && servers.length > 0) {
      setTargetId(servers[0].id);
    }
  }, [servers, targetId]);

  async function generatePlan() {
    if (!selectedFile || !targetId) {
      return;
    }
    setLoadingPlan(true);
    try {
      setPlan(await postJson<FileTransferPlan>(`/api/files/${selectedFile.id}/transfer-plan`, { targetId, mode }));
    } finally {
      setLoadingPlan(false);
    }
  }

  const logCount = files.filter((file) => file.type === "log").length;
  const scriptCount = files.filter((file) => file.type === "script").length;

  return (
    <section className="files-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><FileText size={20} /></div>
          <span>文件总数</span>
          <strong>{files.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><FileText size={20} /></div>
          <span>日志文件</span>
          <strong>{logCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><FileCode2 size={20} /></div>
          <span>脚本文件</span>
          <strong>{scriptCount}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Server size={20} /></div>
          <span>服务器</span>
          <strong>{servers.length}</strong>
        </article>
      </div>

      <div className="files-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">文件</p>
              <h2>文件列表</h2>
            </div>
          </div>
          <div className="file-list">
            {files.map((file) => (
              <button
                className={selectedFile?.id === file.id ? "file-item active" : "file-item"}
                key={file.id}
                onClick={() => {
                  setSelectedFile(file);
                  setPlan(null);
                }}
                type="button"
              >
                <FileText size={18} />
                <span>
                  <strong>{file.name}</strong>
                  <small>{file.type} · {file.size} · {file.source}</small>
                </span>
                <em>{file.type}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">传输</p>
              <h2>{selectedFile?.name ?? "文件详情"}</h2>
            </div>
          </div>
          {selectedFile && (
            <div className="file-detail">
              <dl className="config-list">
                <div><dt>路径</dt><dd>{selectedFile.path}</dd></div>
                <div><dt>来源</dt><dd>{selectedFile.source}</dd></div>
                <div><dt>大小</dt><dd>{selectedFile.size}</dd></div>
                <div><dt>更新时间</dt><dd>{new Date(selectedFile.updatedAt).toLocaleString()}</dd></div>
              </dl>
              <div className="run-controls">
                <label>
                  操作模式
                  <select value={mode} onChange={(event) => setMode(event.target.value)}>
                    <option value="push">分发到服务器</option>
                    <option value="pull">从服务器拉取</option>
                  </select>
                </label>
                <label>
                  目标服务器
                  <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.hostname} ({server.environment})
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" disabled={loadingPlan || !targetId} onClick={generatePlan} type="button">
                  <PlayCircle size={16} /> {loadingPlan ? "生成中" : "生成传输计划"}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>

      {plan && (
        <article className="panel wide-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">文件操作</p>
              <h2>{plan.fileName}</h2>
            </div>
            <span className="status">{plan.requiresApproval ? "requires approval" : plan.riskLevel}</span>
          </div>
          <p className="diagnosis-summary">
            {plan.mode === "pull" ? "拉取" : "分发"} · {plan.target.hostname} ({plan.target.environment})
          </p>
          <ol className="plan-list">
            {plan.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
      )}
    </section>
  );
}

function Tenants({ summary }: { summary: TenantSummary | null }) {
  const tenants = summary?.items ?? [];
  const totals = summary?.totals;

  return (
    <section className="tenants-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><Building2 size={20} /></div>
          <span>租户数</span>
          <strong>{totals?.tenants ?? "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><Server size={20} /></div>
          <span>资产数</span>
          <strong>{totals?.servers ?? "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><Bell size={20} /></div>
          <span>告警数</span>
          <strong>{totals?.alerts ?? "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Bot size={20} /></div>
          <span>AI 诊断</span>
          <strong>{totals?.aiDiagnosesToday ?? "--"}</strong>
        </article>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">租户</p>
            <h2>多租户大盘</h2>
          </div>
        </div>
        <div className="tenant-grid">
          {tenants.map((tenant) => (
            <article className="tenant-card" key={tenant.id}>
              <div>
                <strong>{tenant.name}</strong>
                <span>{tenant.id} · {tenant.quota}</span>
              </div>
              <span className="status">{tenant.status}</span>
              <div className="tenant-metrics">
                <span>服务器 <b>{tenant.servers}</b></span>
                <span>告警 <b>{tenant.alerts}</b></span>
                <span>AI <b>{tenant.aiDiagnosesToday}</b></span>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

function Approvals({ summary }: { summary: ApprovalSummary | null }) {
  const [tickets, setTickets] = useState<ApprovalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const nextTickets = summary?.items ?? [];
    setTickets(nextTickets);
    setSelectedId((current) => current ?? nextTickets[0]?.id ?? null);
  }, [summary]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];
  const totals = {
    pending: tickets.filter((ticket) => ticket.status === "pending").length,
    approved: tickets.filter((ticket) => ticket.status === "approved").length,
    rejected: tickets.filter((ticket) => ticket.status === "rejected").length,
    highRisk: tickets.filter((ticket) => ticket.riskLevel === "high").length
  };

  async function review(action: "approve" | "reject") {
    if (!selectedTicket) {
      return;
    }

    setSubmitting(true);
    try {
      const reviewedTicket = await postJson<ApprovalItem>(`/api/approvals/${selectedTicket.id}/action`, {
        action,
        comment
      });
      setTickets((current) => current.map((ticket) => (ticket.id === reviewedTicket.id ? reviewedTicket : ticket)));
      setComment("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="approvals-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon amber"><ShieldCheck size={20} /></div>
          <span>待审核</span>
          <strong>{summary ? totals.pending : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><CheckCircle2 size={20} /></div>
          <span>已通过</span>
          <strong>{summary ? totals.approved : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><XCircle size={20} /></div>
          <span>已驳回</span>
          <strong>{summary ? totals.rejected : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon blue"><Bell size={20} /></div>
          <span>高风险</span>
          <strong>{summary ? totals.highRisk : "--"}</strong>
        </article>
      </div>

      <div className="approvals-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">审批队列</p>
              <h2>工单审核</h2>
            </div>
          </div>
          <div className="approval-list">
            {tickets.map((ticket) => (
              <button
                className={selectedTicket?.id === ticket.id ? "approval-item active" : "approval-item"}
                key={ticket.id}
                onClick={() => {
                  setSelectedId(ticket.id);
                  setComment(ticket.comment ?? "");
                }}
                type="button"
              >
                <span>
                  <strong>{ticket.title}</strong>
                  <small>{ticket.requester} · {ticket.target}</small>
                </span>
                <em className={`state ${ticket.status}`}>{ticket.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel approval-detail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">工单详情</p>
              <h2>{selectedTicket?.title ?? "暂无工单"}</h2>
            </div>
            {selectedTicket && <span className="status">{selectedTicket.riskLevel}</span>}
          </div>

          {selectedTicket && (
            <>
              <p className="diagnosis-summary">{selectedTicket.summary}</p>
              <dl className="config-list">
                <div><dt>类型</dt><dd>{selectedTicket.type}</dd></div>
                <div><dt>环境</dt><dd>{selectedTicket.environment}</dd></div>
                <div><dt>资源</dt><dd>{selectedTicket.relatedResource}</dd></div>
                <div><dt>创建时间</dt><dd>{new Date(selectedTicket.createdAt).toLocaleString()}</dd></div>
                <div><dt>审核人</dt><dd>{selectedTicket.reviewer ?? "待处理"}</dd></div>
                <div><dt>审核意见</dt><dd>{selectedTicket.comment ?? "未填写"}</dd></div>
              </dl>
              <ol className="plan-list">
                {selectedTicket.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <textarea
                className="comment-box"
                onChange={(event) => setComment(event.target.value)}
                placeholder="填写审批意见"
                value={comment}
              />
              <div className="detail-actions">
                <button
                  className="primary-button"
                  disabled={submitting || selectedTicket.status !== "pending"}
                  onClick={() => review("approve")}
                  type="button"
                >
                  <CheckCircle2 size={16} /> 通过审批
                </button>
                <button
                  className="secondary-button danger"
                  disabled={submitting || selectedTicket.status !== "pending"}
                  onClick={() => review("reject")}
                  type="button"
                >
                  <XCircle size={16} /> 驳回工单
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Models({ summary }: { summary: ModelSummary | null }) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("local");
  const [modelDraft, setModelDraft] = useState<ModelDraft>({
    name: "本地 Ollama",
    id: "local-ollama-qwen",
    provider: "Local",
    type: "chat",
    endpoint: "http://localhost:11434/v1",
    apiKey: "",
    contextWindow: "32k",
    costLevel: "low",
    setDefault: false
  });

  useEffect(() => {
    const nextModels = summary?.items ?? [];
    setModels(nextModels);
    setSelectedId((current) => current ?? nextModels.find((model) => model.isDefault)?.id ?? nextModels[0]?.id ?? null);
  }, [summary]);

  const selectedModel = models.find((model) => model.id === selectedId) ?? models[0];
  const totals = {
    models: models.length,
    enabled: models.filter((model) => model.status === "enabled").length,
    chat: models.filter((model) => model.type === "chat").length,
    embedding: models.filter((model) => model.type === "embedding").length
  };

  async function setDefault(modelId: string) {
    setSubmittingId(modelId);
    try {
      const updated = await postJson<ModelItem>(`/api/models/${modelId}/default`, {});
      setModels((current) => current.map((model) => ({ ...model, isDefault: model.id === updated.id })));
    } finally {
      setSubmittingId(null);
    }
  }

  async function toggleModel(modelId: string) {
    setSubmittingId(modelId);
    try {
      const updated = await postJson<ModelItem>(`/api/models/${modelId}/toggle`, {});
      setModels((current) => {
        const nextModels = current.map((model) => (model.id === updated.id ? updated : model));
        if (!nextModels.some((model) => model.isDefault) && nextModels.some((model) => model.status === "enabled")) {
          const fallback = nextModels.find((model) => model.status === "enabled");
          return nextModels.map((model) => ({ ...model, isDefault: model.id === fallback?.id }));
        }
        return nextModels;
      });
    } finally {
      setSubmittingId(null);
    }
  }

  async function testModel(modelId: string) {
    setSubmittingId(modelId);
    try {
      setTestResult(await postJson<ModelTestResult>(`/api/models/${modelId}/test`, {}));
    } finally {
      setSubmittingId(null);
    }
  }

  function applyModelTemplate(template: string) {
    const templates: Record<string, ModelDraft> = {
      local: {
        name: "本地 Ollama",
        id: "local-ollama-qwen",
        provider: "Local",
        type: "chat",
        endpoint: "http://localhost:11434/v1",
        apiKey: "",
        contextWindow: "32k",
        costLevel: "low",
        setDefault: false
      },
      deepseek: {
        name: "Deepseek",
        id: "deepseek-v4-flash-custom",
        provider: "Deepseek",
        type: "chat",
        endpoint: "https://api.deepseek.com/v1",
        apiKey: "",
        contextWindow: "64k",
        costLevel: "low",
        setDefault: false
      },
      openai: {
        name: "OpenAI Compatible",
        id: "openai-compatible-main",
        provider: "OpenAI Compatible",
        type: "chat",
        endpoint: "https://api.openai.com/v1",
        apiKey: "",
        contextWindow: "128k",
        costLevel: "medium",
        setDefault: false
      }
    };
    setSelectedTemplate(template);
    setModelDraft(templates[template] ?? templates.local);
  }

  function updateModelDraft<K extends keyof ModelDraft>(key: K, value: ModelDraft[K]) {
    setModelDraft((current) => ({ ...current, [key]: value }));
  }

  async function createModel(event: FormEvent) {
    event.preventDefault();
    setSavingModel(true);
    try {
      const created = await postJson<ModelItem>("/api/models", {
        ...modelDraft,
        capabilities: modelDraft.provider === "Local"
          ? ["内网知识问答", "脚本生成", "日志诊断"]
          : ["ChatOps", "日志诊断", "修复方案生成"]
      });
      setModels((current) => {
        const nextModels = modelDraft.setDefault
          ? current.map((model) => ({ ...model, isDefault: false }))
          : current;
        return [...nextModels, created];
      });
      setSelectedId(created.id);
      setModelDraft((current) => ({ ...current, apiKey: "", setDefault: false }));
    } finally {
      setSavingModel(false);
    }
  }

  return (
    <section className="models-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><Bot size={20} /></div>
          <span>模型总数</span>
          <strong>{summary ? totals.models : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><CheckCircle2 size={20} /></div>
          <span>已启用</span>
          <strong>{summary ? totals.enabled : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><MessageSquareText size={20} /></div>
          <span>对话模型</span>
          <strong>{summary ? totals.chat : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Database size={20} /></div>
          <span>向量模型</span>
          <strong>{summary ? totals.embedding : "--"}</strong>
        </article>
      </div>

      <div className="models-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">模型路由</p>
              <h2>模型管理</h2>
            </div>
          </div>
          <div className="model-list">
            {models.map((model) => (
              <button
                className={selectedModel?.id === model.id ? "model-item active" : "model-item"}
                key={model.id}
                onClick={() => setSelectedId(model.id)}
                type="button"
              >
                <span>
                  <strong>{model.name}</strong>
                  <small>{model.provider} · {model.type}</small>
                </span>
                <em className={`state ${model.status}`}>{model.isDefault ? "default" : model.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel model-detail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">模型详情</p>
              <h2>{selectedModel?.name ?? "暂无模型"}</h2>
            </div>
            {selectedModel && <span className="status">{selectedModel.costLevel}</span>}
          </div>

          {selectedModel && (
            <>
              <dl className="config-list">
                <div><dt>Provider</dt><dd>{selectedModel.provider}</dd></div>
                <div><dt>Endpoint</dt><dd>{selectedModel.endpoint}</dd></div>
                <div><dt>上下文</dt><dd>{selectedModel.contextWindow}</dd></div>
                <div><dt>延迟</dt><dd>{selectedModel.latencyMs}ms</dd></div>
                <div><dt>状态</dt><dd>{selectedModel.status}</dd></div>
                <div><dt>默认</dt><dd>{selectedModel.isDefault ? "是" : "否"}</dd></div>
                <div><dt>密钥</dt><dd>{selectedModel.apiKeyConfigured ? "已配置" : "未配置"}</dd></div>
              </dl>
              <div className="capability-tags">
                {selectedModel.capabilities.map((capability) => <span key={capability}>{capability}</span>)}
              </div>
              <div className="detail-actions">
                <button
                  className="primary-button"
                  disabled={submittingId === selectedModel.id || selectedModel.status !== "enabled" || selectedModel.isDefault}
                  onClick={() => setDefault(selectedModel.id)}
                  type="button"
                >
                  <ShieldCheck size={16} /> 设为默认
                </button>
                <button
                  className="secondary-button"
                  disabled={submittingId === selectedModel.id}
                  onClick={() => toggleModel(selectedModel.id)}
                  type="button"
                >
                  <Settings size={16} /> {selectedModel.status === "enabled" ? "停用模型" : "启用模型"}
                </button>
                <button
                  className="secondary-button"
                  disabled={submittingId === selectedModel.id}
                  onClick={() => testModel(selectedModel.id)}
                  type="button"
                >
                  <Activity size={16} /> 测试连接
                </button>
              </div>
              {testResult?.modelId === selectedModel.id && (
                <div className={testResult.ok ? "model-test ok" : "model-test warning"}>
                  <strong>{testResult.ok ? "连接可用" : "需要检查"} · {testResult.latencyMs}ms</strong>
                  <span>{new Date(testResult.checkedAt).toLocaleString()}</span>
                  <ul>
                    {testResult.checks.map((check) => <li key={check}>{check}</li>)}
                    {testResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </article>

        <article className="panel model-create">
          <div className="panel-header">
            <div>
              <p className="eyebrow">接入</p>
              <h2>添加模型</h2>
            </div>
            <button className="primary-button" disabled={savingModel} form="model-create-form" type="submit">
              <Bot size={16} /> {savingModel ? "添加中" : "添加模型"}
            </button>
          </div>
          <form className="model-form" id="model-create-form" onSubmit={createModel}>
            <div className="model-template-strip" role="group" aria-label="模型模板">
              {[
                { key: "local", label: "本地模型", meta: "Ollama / vLLM", icon: Server },
                { key: "deepseek", label: "Deepseek", meta: "API Compatible", icon: Bot },
                { key: "openai", label: "OpenAI", meta: "Compatible", icon: MessageSquareText }
              ].map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    className={selectedTemplate === template.key ? "template-button active" : "template-button"}
                    key={template.key}
                    onClick={() => applyModelTemplate(template.key)}
                    type="button"
                  >
                    <Icon size={16} />
                    <span>
                      <strong>{template.label}</strong>
                      <small>{template.meta}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="model-form-grid">
              <label className="field">
                <span>名称</span>
                <input value={modelDraft.name} onChange={(event) => updateModelDraft("name", event.target.value)} />
              </label>
              <label className="field">
                <span>模型 ID</span>
                <input value={modelDraft.id} onChange={(event) => updateModelDraft("id", event.target.value)} />
              </label>
              <label className="field">
                <span>Provider</span>
                <input value={modelDraft.provider} onChange={(event) => updateModelDraft("provider", event.target.value)} />
              </label>
              <label className="field endpoint-field">
                <span>Endpoint</span>
                <input value={modelDraft.endpoint} onChange={(event) => updateModelDraft("endpoint", event.target.value)} />
              </label>
              <label className="field">
                <span>API Key</span>
                <input
                  autoComplete="off"
                  placeholder="本地模型可留空"
                  type="password"
                  value={modelDraft.apiKey}
                  onChange={(event) => updateModelDraft("apiKey", event.target.value)}
                />
              </label>
              <label className="field compact-field">
                <span>类型</span>
                <select value={modelDraft.type} onChange={(event) => updateModelDraft("type", event.target.value)}>
                  <option value="chat">chat</option>
                  <option value="embedding">embedding</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>上下文</span>
                <input value={modelDraft.contextWindow} onChange={(event) => updateModelDraft("contextWindow", event.target.value)} />
              </label>
              <label className="field compact-field">
                <span>成本</span>
                <select value={modelDraft.costLevel} onChange={(event) => updateModelDraft("costLevel", event.target.value)}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label className="checkbox-line">
                <input
                  checked={modelDraft.setDefault}
                  onChange={(event) => updateModelDraft("setDefault", event.target.checked)}
                  type="checkbox"
                />
                <span>设为默认模型</span>
              </label>
            </div>
          </form>
        </article>
      </div>
    </section>
  );
}

function Members({ summary }: { summary: MemberSummary | null }) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const nextMembers = summary?.items ?? [];
    setMembers(nextMembers);
    setSelectedId((current) => current ?? nextMembers[0]?.id ?? null);
  }, [summary]);

  const selectedMember = members.find((member) => member.id === selectedId) ?? members[0];
  const totals = {
    members: members.length,
    active: members.filter((member) => member.status === "active").length,
    pending: members.filter((member) => member.status === "pending").length,
    admins: members.filter((member) => member.role === "Owner").length
  };

  async function toggleMember(memberId: string) {
    setSubmittingId(memberId);
    try {
      const updated = await postJson<MemberItem>(`/api/members/${memberId}/toggle`, {});
      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
    } finally {
      setSubmittingId(null);
    }
  }

  async function changeRole(memberId: string, role: string) {
    setSubmittingId(memberId);
    try {
      const updated = await postJson<MemberItem>(`/api/members/${memberId}/role`, { role });
      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="members-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><Users size={20} /></div>
          <span>成员总数</span>
          <strong>{summary ? totals.members : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><CheckCircle2 size={20} /></div>
          <span>活跃成员</span>
          <strong>{summary ? totals.active : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><ShieldCheck size={20} /></div>
          <span>待激活</span>
          <strong>{summary ? totals.pending : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><KeyRound size={20} /></div>
          <span>管理员</span>
          <strong>{summary ? totals.admins : "--"}</strong>
        </article>
      </div>

      <div className="members-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">成员</p>
              <h2>成员管理</h2>
            </div>
          </div>
          <div className="member-list">
            {members.map((member) => (
              <button
                className={selectedMember?.id === member.id ? "member-item active" : "member-item"}
                key={member.id}
                onClick={() => setSelectedId(member.id)}
                type="button"
              >
                <span>
                  <strong>{member.name}</strong>
                  <small>{member.email} · {member.team}</small>
                </span>
                <em className={`state ${member.status}`}>{member.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel member-detail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">成员详情</p>
              <h2>{selectedMember?.name ?? "暂无成员"}</h2>
            </div>
            {selectedMember && <span className="status">{selectedMember.role}</span>}
          </div>

          {selectedMember && (
            <>
              <dl className="config-list">
                <div><dt>邮箱</dt><dd>{selectedMember.email}</dd></div>
                <div><dt>团队</dt><dd>{selectedMember.team}</dd></div>
                <div><dt>状态</dt><dd>{selectedMember.status}</dd></div>
                <div><dt>最近在线</dt><dd>{selectedMember.lastSeenAt ? new Date(selectedMember.lastSeenAt).toLocaleString() : "未登录"}</dd></div>
              </dl>
              <div className="run-controls">
                <label>
                  角色
                  <select
                    disabled={submittingId === selectedMember.id}
                    onChange={(event) => changeRole(selectedMember.id, event.target.value)}
                    value={selectedMember.role}
                  >
                    <option value="Owner">Owner</option>
                    <option value="SRE">SRE</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Developer">Developer</option>
                  </select>
                </label>
                <button
                  className="secondary-button"
                  disabled={submittingId === selectedMember.id}
                  onClick={() => toggleMember(selectedMember.id)}
                  type="button"
                >
                  <Settings size={16} /> {selectedMember.status === "active" ? "停用成员" : "启用成员"}
                </button>
              </div>
              <div className="capability-tags">
                {selectedMember.permissions.map((permission) => <span key={permission}>{permission}</span>)}
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Teams({ summary }: { summary: TeamSummary | null }) {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const nextTeams = summary?.items ?? [];
    setTeams(nextTeams);
    setSelectedId((current) => current ?? nextTeams[0]?.id ?? null);
  }, [summary]);

  const selectedTeam = teams.find((team) => team.id === selectedId) ?? teams[0];
  const totals = {
    teams: teams.length,
    active: teams.filter((team) => team.status === "active").length,
    members: teams.reduce((total, team) => total + team.memberCount, 0),
    servers: teams.reduce((total, team) => total + team.serverCount, 0)
  };

  async function toggleTeam(teamId: string) {
    setSubmittingId(teamId);
    try {
      const updated = await postJson<TeamItem>(`/api/teams/${teamId}/toggle`, {});
      setTeams((current) => current.map((team) => (team.id === updated.id ? updated : team)));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="teams-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><GitBranch size={20} /></div>
          <span>团队总数</span>
          <strong>{summary ? totals.teams : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><CheckCircle2 size={20} /></div>
          <span>活跃团队</span>
          <strong>{summary ? totals.active : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><Users size={20} /></div>
          <span>覆盖成员</span>
          <strong>{summary ? totals.members : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Server size={20} /></div>
          <span>管理资产</span>
          <strong>{summary ? totals.servers : "--"}</strong>
        </article>
      </div>

      <div className="teams-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">组织</p>
              <h2>团队结构</h2>
            </div>
          </div>
          <div className="team-tree">
            {teams.map((team) => (
              <button
                className={selectedTeam?.id === team.id ? "team-node active" : "team-node"}
                key={team.id}
                onClick={() => setSelectedId(team.id)}
                style={{ marginLeft: team.parentId ? 18 : 0 }}
                type="button"
              >
                <GitBranch size={16} />
                <span>
                  <strong>{team.name}</strong>
                  <small>{team.lead} · {team.memberCount} 人</small>
                </span>
                <em className={`state ${team.status}`}>{team.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel team-detail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">团队详情</p>
              <h2>{selectedTeam?.name ?? "暂无团队"}</h2>
            </div>
            {selectedTeam && <span className="status">{selectedTeam.type}</span>}
          </div>

          {selectedTeam && (
            <>
              <p className="diagnosis-summary">{selectedTeam.description}</p>
              <dl className="config-list">
                <div><dt>负责人</dt><dd>{selectedTeam.lead}</dd></div>
                <div><dt>上级团队</dt><dd>{teams.find((team) => team.id === selectedTeam.parentId)?.name ?? "无"}</dd></div>
                <div><dt>成员数</dt><dd>{selectedTeam.memberCount}</dd></div>
                <div><dt>管理资产</dt><dd>{selectedTeam.serverCount}</dd></div>
                <div><dt>审批 SLA</dt><dd>{selectedTeam.approvalSla}</dd></div>
                <div><dt>状态</dt><dd>{selectedTeam.status}</dd></div>
              </dl>
              <div className="capability-tags">
                {selectedTeam.responsibilities.map((responsibility) => <span key={responsibility}>{responsibility}</span>)}
              </div>
              <div className="team-members">
                <strong>团队成员</strong>
                {(selectedTeam.members.length > 0 ? selectedTeam.members : []).map((member) => (
                  <div className="team-member" key={member.id}>
                    <span>{member.name}</span>
                    <small>{member.role} · {member.status}</small>
                  </div>
                ))}
                {selectedTeam.members.length === 0 && <p className="empty-note">暂无已绑定成员</p>}
              </div>
              <div className="detail-actions">
                <button
                  className="secondary-button"
                  disabled={submittingId === selectedTeam.id}
                  onClick={() => toggleTeam(selectedTeam.id)}
                  type="button"
                >
                  <Settings size={16} /> {selectedTeam.status === "active" ? "进入评审" : "启用团队"}
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Roles({ summary }: { summary: RoleSummary | null }) {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const nextRoles = summary?.items ?? [];
    setRoles(nextRoles);
    setSelectedId((current) => current ?? nextRoles[0]?.id ?? null);
  }, [summary]);

  const selectedRole = roles.find((role) => role.id === selectedId) ?? roles[0];
  const permissions = summary?.permissions ?? [];
  const totals = {
    roles: roles.length,
    enabled: roles.filter((role) => role.status === "enabled").length,
    permissions: permissions.length,
    assignments: roles.reduce((total, role) => total + role.memberCount, 0)
  };

  async function toggleRole(roleId: string) {
    setSubmittingId(roleId);
    try {
      const updated = await postJson<RoleItem>(`/api/roles/${roleId}/toggle`, {});
      setRoles((current) => current.map((role) => (role.id === updated.id ? updated : role)));
    } finally {
      setSubmittingId(null);
    }
  }

  async function togglePermission(roleId: string, permission: string) {
    setSubmittingId(`${roleId}:${permission}`);
    try {
      const updated = await postJson<RoleItem>(`/api/roles/${roleId}/permission`, { permission });
      setRoles((current) => current.map((role) => (role.id === updated.id ? updated : role)));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="roles-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon blue"><KeyRound size={20} /></div>
          <span>角色数</span>
          <strong>{summary ? totals.roles : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><CheckCircle2 size={20} /></div>
          <span>已启用</span>
          <strong>{summary ? totals.enabled : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber"><ShieldCheck size={20} /></div>
          <span>权限点</span>
          <strong>{summary ? totals.permissions : "--"}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Users size={20} /></div>
          <span>成员绑定</span>
          <strong>{summary ? totals.assignments : "--"}</strong>
        </article>
      </div>

      <div className="roles-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">角色</p>
              <h2>权限与角色</h2>
            </div>
          </div>
          <div className="role-list">
            {roles.map((role) => (
              <button
                className={selectedRole?.id === role.id ? "role-item active" : "role-item"}
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                type="button"
              >
                <span>
                  <strong>{role.name}</strong>
                  <small>{role.scope} · {role.memberCount} 人</small>
                </span>
                <em className={`state ${role.status}`}>{role.status}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="panel role-detail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">权限矩阵</p>
              <h2>{selectedRole?.name ?? "暂无角色"}</h2>
            </div>
            {selectedRole && <span className="status">{selectedRole.scope}</span>}
          </div>

          {selectedRole && (
            <>
              <p className="diagnosis-summary">{selectedRole.description}</p>
              <dl className="config-list">
                <div><dt>状态</dt><dd>{selectedRole.status}</dd></div>
                <div><dt>成员绑定</dt><dd>{selectedRole.memberCount}</dd></div>
                <div><dt>授权范围</dt><dd>{selectedRole.scope}</dd></div>
                <div><dt>权限数量</dt><dd>{selectedRole.permissions.length}</dd></div>
              </dl>
              <div className="permission-grid">
                {permissions.map((permission) => {
                  const enabled = selectedRole.permissions.includes(permission.key);
                  return (
                    <button
                      className={enabled ? "permission-item enabled" : "permission-item"}
                      disabled={submittingId === `${selectedRole.id}:${permission.key}`}
                      key={permission.key}
                      onClick={() => togglePermission(selectedRole.id, permission.key)}
                      type="button"
                    >
                      <span>{permission.label}</span>
                      <small>{permission.group}</small>
                    </button>
                  );
                })}
              </div>
              <div className="detail-actions">
                <button
                  className="secondary-button"
                  disabled={submittingId === selectedRole.id}
                  onClick={() => toggleRole(selectedRole.id)}
                  type="button"
                >
                  <Settings size={16} /> {selectedRole.status === "enabled" ? "停用角色" : "启用角色"}
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Dashboard({ summary, servers }: { summary: DashboardSummary | null; servers: ServerItem[] }) {
  const cards = [
    { label: "服务器总数", value: summary?.servers.total ?? "--", icon: Server, tone: "blue" },
    { label: "在线 Agent", value: summary?.servers.online ?? "--", icon: Activity, tone: "green" },
    { label: "开放告警", value: summary?.alerts.open ?? "--", icon: Bell, tone: "amber" },
    { label: "今日 AI 诊断", value: summary?.automation.aiDiagnosesToday ?? "--", icon: Bot, tone: "pink" }
  ];

  return (
    <div className="content-grid">
      <section className="metric-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card" key={card.label}>
              <div className={`metric-icon ${card.tone}`}>
                <Icon size={20} />
              </div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">实时态势</p>
            <h2>性能趋势</h2>
          </div>
          <button className="text-button" type="button">
            查看监控 <ChevronRight size={16} />
          </button>
        </div>
        <div className="trend-grid">
          {(summary?.trends ?? []).map((item) => (
            <div className="trend-item" key={item.label}>
              <span>{item.label}</span>
              <div className="bar">
                <i style={{ height: `${item.cpu}%` }} />
                <i style={{ height: `${item.memory}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">资产</p>
            <h2>服务器健康度</h2>
          </div>
        </div>
        <div className="server-stack">
          {servers.map((server) => (
            <ServerHealth key={server.id} server={server} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">自动化</p>
            <h2>快捷入口</h2>
          </div>
        </div>
        <div className="quick-grid">
          <button type="button"><Terminal size={18} />/ssh</button>
          <button type="button"><Gauge size={18} />/check</button>
          <button type="button"><Bot size={18} />/diagnose</button>
          <button type="button"><Boxes size={18} />Agent 部署</button>
        </div>
      </section>
    </div>
  );
}

function ChatOps({
  message,
  setMessage,
  sendMessage,
  response,
  loading
}: {
  message: string;
  setMessage: (value: string) => void;
  sendMessage: (event: FormEvent) => void;
  response: ChatResponse | null;
  loading: boolean;
}) {
  return (
    <section className="chat-layout">
      <div className="chat-panel">
        <div className="assistant-message">
          <Bot size={20} />
          <div>
            <strong>NextOps Copilot</strong>
            <p>输入自然语言或 Slash 指令，我会生成可确认的运维执行计划。</p>
          </div>
        </div>

        {response && (
          <div className="result-card">
            <div className="result-meta">
              <span>意图：{response.intent}</span>
              <span>风险：{response.riskLevel}</span>
            </div>
            <p>{response.reply}</p>
            <ol>
              {response.plan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        <form className="chat-input" onSubmit={sendMessage}>
          <input value={message} onChange={(event) => setMessage(event.target.value)} />
          <button type="submit">{loading ? "生成中" : "发送"}</button>
        </form>
      </div>

      <aside className="command-panel">
        <h2>Slash 指令</h2>
        <button onClick={() => setMessage("/ssh 10.0.1.21 --port 22")} type="button">/ssh</button>
        <button onClick={() => setMessage("/check prod-web --items cpu,memory,disk")} type="button">/check</button>
        <button onClick={() => setMessage("/diagnose alert alt-001")} type="button">/diagnose</button>
        <button onClick={() => setMessage("/deploy order-service --env prod --version 1.8.2")} type="button">/deploy</button>
      </aside>
    </section>
  );
}

function Servers({
  servers,
  loading,
  onOpenServer,
  onServerCreated
}: {
  servers: ServerItem[];
  loading: boolean;
  onOpenServer: (serverId: string) => void;
  onServerCreated: () => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServerDraft>({
    hostname: "demo-node-01",
    ip: "192.168.1.20",
    port: "22",
    environment: "staging",
    os: "Ubuntu 22.04 LTS",
    tags: "demo,agent-pending"
  });

  async function createServer(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJson<ServerItem>("/api/servers", {
        ...draft,
        port: Number(draft.port),
        tags: draft.tags
      });
      setShowCreate(false);
      await onServerCreated();
    } catch {
      setError("服务器创建失败，请检查 IP、端口和后端服务状态。");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(key: keyof ServerDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="panel full server-page">
      <div className="panel-header">
        <div>
          <p className="eyebrow">资产纳管</p>
          <h2>服务器列表</h2>
        </div>
        <button className="primary-button" onClick={() => setShowCreate((value) => !value)} type="button">
          <Server size={16} /> {showCreate ? "收起表单" : "新增服务器"}
        </button>
      </div>
      {showCreate && (
        <form className="create-server-form" onSubmit={createServer}>
          <label>
            主机名
            <input value={draft.hostname} onChange={(event) => updateDraft("hostname", event.target.value)} />
          </label>
          <label>
            IP 地址
            <input value={draft.ip} onChange={(event) => updateDraft("ip", event.target.value)} />
          </label>
          <label>
            端口
            <input value={draft.port} onChange={(event) => updateDraft("port", event.target.value)} />
          </label>
          <label>
            环境
            <select value={draft.environment} onChange={(event) => updateDraft("environment", event.target.value)}>
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="testing">testing</option>
              <option value="development">development</option>
            </select>
          </label>
          <label>
            系统
            <input value={draft.os} onChange={(event) => updateDraft("os", event.target.value)} />
          </label>
          <label>
            标签
            <input value={draft.tags} onChange={(event) => updateDraft("tags", event.target.value)} />
          </label>
          <div className="form-actions">
            {error && <span>{error}</span>}
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "保存中" : "保存并纳管"}
            </button>
          </div>
        </form>
      )}
      <div className="table">
        <div className="table-row table-head">
          <span>主机</span>
          <span>环境</span>
          <span>Agent</span>
          <span>CPU</span>
          <span>内存</span>
          <span>磁盘</span>
          <span>操作</span>
        </div>
        {loading && <div className="table-empty">正在加载服务器资产...</div>}
        {!loading && servers.length === 0 && <div className="table-empty">暂无服务器资产</div>}
        {servers.map((server) => (
          <div className="table-row" key={server.id}>
            <span>
              <button className="link-button" onClick={() => onOpenServer(server.id)} type="button">
                {server.hostname}
              </button>
              <small>{server.ip}:{server.port}</small>
            </span>
            <span>{server.environment}</span>
            <span className={`status ${server.agentStatus}`}>{server.agentStatus}</span>
            <span>{server.cpuUsage}%</span>
            <span>{server.memoryUsage}%</span>
            <span>{server.diskUsage}%</span>
            <span className="row-actions">
              <button title="Web SSH" type="button"><Terminal size={16} /></button>
              <button onClick={() => onOpenServer(server.id)} title="性能图" type="button"><Activity size={16} /></button>
              <button onClick={() => onOpenServer(server.id)} title="告警规则" type="button"><Bell size={16} /></button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServerDetail({ serverId, onBack }: { serverId: string; onBack: () => void }) {
  const [server, setServer] = useState<ServerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [installPlan, setInstallPlan] = useState<AgentInstallPlan | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisReport | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJson<ServerDetailData>(`/api/servers/${serverId}`)
      .then(setServer)
      .finally(() => setLoading(false));
  }, [serverId]);

  async function loadInstallPlan() {
    setActionLoading("agent");
    try {
      setInstallPlan(await postJson<AgentInstallPlan>(`/api/servers/${serverId}/agent/install-plan`, {}));
    } finally {
      setActionLoading(null);
    }
  }

  async function runDiagnosis() {
    setActionLoading("diagnose");
    try {
      setDiagnosis(await postJson<DiagnosisReport>(`/api/servers/${serverId}/diagnose`, {}));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <section className="placeholder"><RefreshCw size={30} /><h2>正在加载服务器详情</h2></section>;
  }

  if (!server) {
    return <section className="placeholder"><Server size={30} /><h2>服务器不存在</h2></section>;
  }

  const detailCards = [
    { label: "CPU", value: `${server.cpuUsage}%`, icon: Gauge, tone: "blue" },
    { label: "内存", value: `${server.memoryUsage}%`, icon: Database, tone: "green" },
    { label: "磁盘", value: `${server.diskUsage}%`, icon: HardDrive, tone: "amber" },
    { label: "负载", value: server.loadAvg.toFixed(2), icon: Activity, tone: "pink" }
  ];

  return (
    <div className="server-detail">
      <section className="detail-hero">
        <div>
          <button className="text-button" onClick={onBack} type="button">
            <ArrowLeft size={16} /> 返回服务器列表
          </button>
          <h2>{server.hostname}</h2>
          <p>{server.ip}:{server.port} · {server.os} · {server.environment}</p>
          <div className="tag-row">
            {server.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <div className="detail-actions">
          <button className="secondary-button" type="button">
            <Terminal size={16} /> Web SSH
          </button>
          <button className="secondary-button" disabled={actionLoading === "agent"} onClick={loadInstallPlan} type="button">
            <PlayCircle size={16} /> Agent 部署计划
          </button>
          <button className="primary-button" disabled={actionLoading === "diagnose"} onClick={runDiagnosis} type="button">
            <Bot size={16} /> AI 诊断
          </button>
        </div>
      </section>

      <section className="metric-grid">
        {detailCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card" key={card.label}>
              <div className={`metric-icon ${card.tone}`}>
                <Icon size={20} />
              </div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">实时监控</p>
              <h2>性能图</h2>
            </div>
          </div>
          <div className="mini-chart">
            {server.realtime.map((point) => (
              <div className="mini-chart-item" key={point.label}>
                <span>{point.label}</span>
                <div>
                  <i style={{ height: `${point.cpu}%` }} />
                  <i style={{ height: `${point.memory}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">配置</p>
              <h2>系统详细配置</h2>
            </div>
          </div>
          <dl className="config-list">
            <div><dt>内核</dt><dd>{server.system.kernel}</dd></div>
            <div><dt>CPU</dt><dd>{server.system.cpuModel}</dd></div>
            <div><dt>核心数</dt><dd>{server.system.cpuCores}</dd></div>
            <div><dt>内存</dt><dd>{server.system.memoryTotalMb} MB</dd></div>
            <div><dt>磁盘</dt><dd>{server.system.diskTotalGb} GB</dd></div>
            <div><dt>网卡</dt><dd>{server.system.networkCards.join(", ")}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">告警</p>
              <h2>专属告警规则</h2>
            </div>
            <button className="text-button" type="button">新建规则 <ChevronRight size={16} /></button>
          </div>
          <div className="rule-list">
            {server.alertRules.map((rule) => (
              <div className="rule-item" key={rule.id}>
                <div>
                  <strong>{rule.name}</strong>
                  <span>{rule.metric} / 阈值 {rule.threshold}</span>
                </div>
                <span className={rule.enabled ? "status online" : "status"}>{rule.enabled ? "enabled" : "disabled"}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Agent</p>
              <h2>纳管状态</h2>
            </div>
          </div>
          <div className="agent-state">
            <span className={`status ${server.agentStatus}`}>{server.agentStatus}</span>
            <p>通过 Agent 上报指标、配置、日志和脚本执行状态。未安装服务器可先生成部署计划，后续接入真实 Web SSH 执行。</p>
          </div>
        </article>
      </section>

      {(installPlan || diagnosis) && (
        <section className="detail-grid">
          {installPlan && (
            <article className="panel wide-card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">执行计划</p>
                  <h2>{installPlan.title}</h2>
                </div>
                <span className="status">{installPlan.requiresApproval ? "requires approval" : installPlan.riskLevel}</span>
              </div>
              <ol className="plan-list">
                {installPlan.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <pre className="command-block">{installPlan.command}</pre>
            </article>
          )}

          {diagnosis && (
            <article className="panel wide-card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">AI 诊断</p>
                  <h2>诊断报告</h2>
                </div>
              </div>
              <p className="diagnosis-summary">{diagnosis.summary}</p>
              <div className="diagnosis-grid">
                <ListBlock title="证据链" items={diagnosis.evidence} />
                <ListBlock title="可能原因" items={diagnosis.possibleCauses} />
                <ListBlock title="修复方案" items={diagnosis.repairPlan} />
              </div>
            </article>
          )}
        </section>
      )}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="list-block">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function ServerHealth({ server }: { server: ServerItem }) {
  return (
    <article className="server-health">
      <div>
        <strong>{server.hostname}</strong>
        <span>{server.ip}</span>
      </div>
      <div className="health-bars">
        <Meter icon={<Gauge size={14} />} value={server.cpuUsage} />
        <Meter icon={<Database size={14} />} value={server.memoryUsage} />
        <Meter icon={<HardDrive size={14} />} value={server.diskUsage} />
      </div>
    </article>
  );
}

function Meter({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <div className="meter">
      {icon}
      <span><i style={{ width: `${value}%` }} /></span>
      <b>{value}%</b>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="placeholder">
      <Code2 size={32} />
      <h2>{title}</h2>
      <p>模块入口已建立，后续会按 MVP 排期逐步接入真实数据、权限和自动化流程。</p>
    </section>
  );
}
