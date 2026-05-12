import {
  Activity,
  ArrowLeft,
  Bell,
  Bot,
  Boxes,
  Building2,
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
  Users
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
  const [message, setMessage] = useState("帮我巡检生产环境所有 Web 服务器，并生成风险摘要");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const activeLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find((item) => item.key === activePage);
      if (found) return found.label;
    }
    if (activePage === "server-detail") return "服务器详情";
    return "仪表盘";
  }, [activePage]);

  async function refreshData() {
    const [nextSummary, nextServers, nextAlerts, nextScripts, nextSlashCommands] = await Promise.all([
      fetchJson<DashboardSummary>("/api/dashboard/summary"),
      fetchJson<{ items: ServerItem[] }>("/api/servers"),
      fetchJson<{ items: AlertItem[] }>("/api/alerts"),
      fetchJson<{ items: ScriptItem[] }>("/api/scripts"),
      fetchJson<{ items: SlashCommandItem[] }>("/api/slash-commands")
    ]);
    setSummary(nextSummary);
    setServers(nextServers.items);
    setAlerts(nextAlerts.items);
    setScripts(nextScripts.items);
    setSlashCommands(nextSlashCommands.items);
  }

  useEffect(() => {
    setLoadingServers(true);
    refreshData()
      .catch(() => {
        setSummary(null);
        setServers([]);
        setAlerts([]);
        setScripts([]);
        setSlashCommands([]);
      })
      .finally(() => setLoadingServers(false));
  }, []);

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
            <button className="icon-button" type="button" title="系统设置">
              <Settings size={18} />
            </button>
          </div>
        </header>

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
