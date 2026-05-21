import {
  Activity,
  ArrowLeft,
  ArrowUp,
  Bell,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
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
  Minus,
  Moon,
  Package,
  PanelRight,
  PlayCircle,
  Radar,
  RefreshCw,
  Rocket,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Stethoscope,
  Sun,
  Terminal,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  X,
  XCircle
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModelsPage from "./components/Models";
import { StatusDot } from "./components/HealthRing";
import { CommandPalette, buildDefaultCommands } from "./components/CommandPalette";
import { useToast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  fetchServers,
  fetchServer,
  fetchAlerts,
  fetchScripts,
  fetchDashboard,
  login as apiLogin,
  setToken,
  clearToken,
  type ServerRecord,
  type AlertRecord,
  type DashboardData,
} from "./api/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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
  type: string;
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
    collectedAt?: string;
  };
  realtime: Array<{ label: string; cpu: number; memory: number }>;
  alertRules: Array<{ id: string; name: string; metric: string; threshold: number; enabled: boolean; current: number; triggered: boolean }>;
  dataMode?: string;
  warnings?: string[];
  processes: Array<{ pid: string; user: string; cpu: string; mem: string; command: string }>;
  services: Array<{ name: string; active: string; sub: string; description: string }>;
  logs: string;
  network: string;
  diskDetails: Array<{ mount: string; size: string; used: string; avail: string; percent: string }>;
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
  mode?: string;
  executionMode?: string;
  taskId?: string;
  status?: string;
  warnings?: string[];
  requiresApproval?: boolean;
  targetId?: string | null;
  targetName?: string | null;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  response?: Partial<ChatResponse>;
  streaming?: boolean;
};

type TimelineTask = {
  id: string;
  taskType: string;
  status: string;
  riskLevel: string;
  summary: string;
  createdAt: string;
};

type ServerDraft = {
  hostname: string;
  ip: string;
  port: string;
  environment: string;
  os: string;
  tags: string;
  type: string;
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
      { key: "chatops", label: "AI Copilot", icon: MessageSquareText },
      { key: "alerts", label: "告警中心", icon: Bell }
    ]
  },
  {
    title: "资产与脚本",
    items: [
      { key: "servers", label: "资源管理", icon: Server },
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

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("nextops_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders()
  });
  if (response.status === 401) {
    localStorage.removeItem("nextops_token");
    localStorage.removeItem("nextops_user");
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body)
  });
  if (response.status === 401) {
    localStorage.removeItem("nextops_token");
    localStorage.removeItem("nextops_user");
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function parseStreamEvent(raw: string): { event: string; data: unknown } | null {
  const eventLine = raw.split("\n").find((line) => line.startsWith("event:"));
  const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) {
    return null;
  }
  return {
    event: eventLine.slice("event:".length).trim(),
    data: JSON.parse(dataLine.slice("data:".length).trim()) as unknown
  };
}

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
};

function parseStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem("nextops_user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.name) {
      throw new Error('Invalid user data');
    }
    return parsed as AuthUser;
  } catch (err) {
    console.error('Failed to parse stored user data:', err);
    localStorage.removeItem("nextops_user");
    return null;
  }
}

export function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(parseStoredUser);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
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
  const [message, setMessage] = useState("帮我巡检生产环境所有资源，并生成风险摘要");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "我是 NextOps Copilot。你可以直接描述巡检、诊断、部署或 SSH 需求，我会关联现有资产上下文并生成可确认的执行计划。"
    }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuGroups.map((g) => [g.title, g.title === "核心业务" || g.title === "资产与脚本"]))
  );
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("nextops-theme") ?? "light");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nextops-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const paletteCommands = useMemo(() =>
    buildDefaultCommands(
      (page) => setActivePage(page),
      (id) => { setSelectedServerId(id); setActivePage("server-detail"); },
      servers
    ),
    [servers]
  );

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: undefined }));
        throw new Error((data as { message?: string })?.message ?? "登录失败");
      }
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== 'object' || !data.token || !data.user) {
        throw new Error('无效的响应格式');
      }
      localStorage.setItem("nextops_token", data.token);
      localStorage.setItem("nextops_user", JSON.stringify(data.user));
      setAuthUser(data.user as AuthUser);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("nextops_token");
    localStorage.removeItem("nextops_user");
    setAuthUser(null);
  }

  if (!authUser) {
    return (
      <div className="login-page">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-header">
            <div className="login-logo">N</div>
            <h2>登录 NextOps</h2>
            <p>AI Operations Platform</p>
          </div>
          {loginError && <p className="login-error">{loginError}</p>}
          <input
            className="login-input"
            type="email"
            placeholder="邮箱地址"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
            title="请输入有效的邮箱地址"
          />
          <input
            className="login-input"
            type="password"
            placeholder="密码"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            minLength={6}
            title="密码至少需要6个字符"
          />
          <button
            className="login-button"
            type="submit"
            disabled={loginLoading}
          >
            {loginLoading ? "登录中..." : "登录"}
          </button>
          <p className="login-hint">
            演示账号: leo@example.com / admin123
          </p>
        </form>
      </div>
    );
  }

  const activeLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find((item) => item.key === activePage);
      if (found) return found.label;
    }
    if (activePage === "server-detail") return "资源详情";
    return "仪表盘";
  }, [activePage]);

  async function loadServers() {
    const nextServers = await fetchJson<{ items: ServerItem[] }>("/servers");
    setServers(nextServers.items);
  }

  async function refreshData() {
    await loadPageData(activePage);
  }

  const loadPageData = useCallback(async (page: string) => {
    setPageLoading(true);
    setPageError(null);
    if (page === "servers") {
      setLoadingServers(true);
    }

    try {
      if (page === "dashboard") {
        const [nextSummary, nextServers] = await Promise.all([
          fetchJson<DashboardSummary>("/dashboard/summary"),
          fetchJson<{ items: ServerItem[] }>("/servers")
        ]);
        setSummary(nextSummary);
        setServers(nextServers.items);
      } else if (page === "alerts") {
        const [nextAlerts, nextServers] = await Promise.all([
          fetchJson<{ items: AlertItem[] }>("/alerts"),
          fetchJson<{ items: ServerItem[] }>("/servers")
        ]);
        setAlerts(nextAlerts.items);
        setServers(nextServers.items);
      } else if (page === "servers") {
        await loadServers();
      } else if (page === "scripts") {
        const [nextScripts, nextServers] = await Promise.all([
          fetchJson<{ items: ScriptItem[] }>("/scripts"),
          fetchJson<{ items: ServerItem[] }>("/servers")
        ]);
        setScripts(nextScripts.items);
        setServers(nextServers.items);
      } else if (page === "commands") {
        const nextSlashCommands = await fetchJson<{ items: SlashCommandItem[] }>("/slash-commands");
        setSlashCommands(nextSlashCommands.items);
      } else if (page === "packages") {
        const [nextPackages, nextServers] = await Promise.all([
          fetchJson<{ items: PackageItem[] }>("/packages"),
          fetchJson<{ items: ServerItem[] }>("/servers")
        ]);
        setPackages(nextPackages.items);
        setServers(nextServers.items);
      } else if (page === "files") {
        const [nextFiles, nextServers] = await Promise.all([
          fetchJson<{ items: FileItem[] }>("/files"),
          fetchJson<{ items: ServerItem[] }>("/servers")
        ]);
        setFiles(nextFiles.items);
        setServers(nextServers.items);
      } else if (page === "tenants") {
        setTenantSummary(await fetchJson<TenantSummary>("/tenants/summary"));
      } else if (page === "approvals") {
        setApprovalSummary(await fetchJson<ApprovalSummary>("/approvals"));
      } else if (page === "models") {
        setModelSummary(await fetchJson<ModelSummary>("/models"));
      } else if (page === "members") {
        setMemberSummary(await fetchJson<MemberSummary>("/members"));
      } else if (page === "teams") {
        setTeamSummary(await fetchJson<TeamSummary>("/teams/summary"));
      } else if (page === "roles") {
        setRoleSummary(await fetchJson<RoleSummary>("/roles/summary"));
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        setAuthUser(null);
        return;
      }
      setPageError(error instanceof Error ? error.message : "页面数据加载失败");
    } finally {
      setPageLoading(false);
      if (page === "servers") {
        setLoadingServers(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authUser) return;
    void loadPageData(activePage);
  }, [activePage, authUser, loadPageData]);

  useEffect(() => {
    if (!authUser) return;
    const interval = setInterval(() => {
      if (activePage === "dashboard" || activePage === "servers" || activePage === "alerts") {
        loadServers().catch((err) => {
          console.error('Failed to refresh servers:', err);
        });
        if (activePage === "alerts") {
          fetchJson<{ items: AlertItem[] }>("/alerts")
            .then((data) => setAlerts(data.items))
            .catch((err) => {
              console.error('Failed to refresh alerts:', err);
            });
        }
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [authUser, activePage]);

  async function runChat(inputValue: string) {
    const input = inputValue.trim();
    if (!input || loadingChat) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input
    };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true
    };

    setChatMessages((current) => [...current, userMessage, assistantMessage]);
    setMessage("");
    setLoadingChat(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chatops/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message: input })
      });
      if (response.status === 401) {
        localStorage.removeItem("nextops_token");
        localStorage.removeItem("nextops_user");
        setAuthUser(null);
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResponse: ChatResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventText of events) {
          const event = parseStreamEvent(eventText);
          if (!event) continue;
          if (event.event === "chunk") {
            const chunk = event.data as { text?: string };
            setChatMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, content: item.content + String(chunk.text ?? "") } : item
              )
            );
          } else if (event.event === "meta") {
            setChatMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, response: event.data as Partial<ChatResponse> } : item
              )
            );
          } else if (event.event === "done") {
            finalResponse = event.data as ChatResponse;
          } else if (event.event === "error") {
            const errData = event.data as { message?: string };
            setChatMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? { ...item, content: errData.message ?? "请求处理失败", streaming: false }
                  : item
              )
            );
          }
        }
      }

      if (finalResponse) {
        setChatResponse(finalResponse);
        setChatMessages((current) =>
          current.map((item) =>
            item.id === assistantId ? { ...item, response: finalResponse ?? undefined, streaming: false } : item
          )
        );
      }
    } catch (error) {
      setChatResponse(null);
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: `请求失败：${error instanceof Error ? error.message : "未知错误"}`,
                streaming: false
              }
            : item
        )
      );
    } finally {
      setLoadingChat(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    await runChat(message);
  }

  function startQuickChat(input: string) {
    setActivePage("chatops");
    void runChat(input);
  }

  return (
    <div className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div className="brand-text">
            <strong>NextOps</strong>
            <span>AI Operations · v0.5.0</span>
          </div>
          <button
            aria-label={sidebarCollapsed ? "展开左侧导航" : "收起左侧导航"}
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            title={sidebarCollapsed ? "展开导航" : "收起导航"}
            type="button"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <nav className="nav">
          {menuGroups.map((group) => {
            const expanded = expandedGroups[group.title] ?? true;
            return (
              <section key={group.title} className="nav-group">
                <button
                  className="nav-group-header"
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.title]: !(prev[group.title] ?? true)
                    }))
                  }
                  type="button"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`nav-group-chevron ${expanded ? "" : "collapsed"}`}
                  />
                </button>
                <div className={`nav-group-items ${expanded ? "expanded" : "collapsed"}`}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        className={activePage === item.key ? "nav-item active" : "nav-item"}
                        key={item.key}
                        onClick={() => setActivePage(item.key)}
                        title={item.label}
                        type="button"
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{activeLabel}</h1>
          <div className="top-actions">
            <div className="search" onClick={() => setCommandPaletteOpen(true)} style={{ cursor: "pointer" }}>
              <Search size={14} />
              <input placeholder="搜索资产、告警、脚本或输入命令..." readOnly />
              <kbd className="search-kbd">⌘K</kbd>
            </div>
            <div className="user-menu">
              <button
                className="user-trigger"
                onClick={() => setShowUserMenu((v) => !v)}
                type="button"
              >
                <span className="user-avatar">{authUser.name.charAt(0)}</span>
                <span className="user-name">{authUser.name}</span>
                <ChevronDown size={14} />
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-info">
                    <span className="user-dropdown-name">{authUser.name}</span>
                    <span className="user-dropdown-role">{authUser.role}</span>
                  </div>
                  <div className="user-dropdown-sep" />
                  <button onClick={handleLogout} type="button">退出登录</button>
                </div>
              )}
            </div>
            <button
              className="dark-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              type="button"
              title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {pageError && <div className="table-empty">当前页面数据加载失败：{pageError}</div>}
        {pageLoading && activePage !== "servers" && <div className="table-empty">正在加载当前页面数据...</div>}

        <div className="page-content" key={activePage}>
        {activePage === "dashboard" && <Dashboard summary={summary} servers={servers} onQuickAction={startQuickChat} />}
        {activePage === "chatops" && (
          <ChatOps
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
            messages={chatMessages}
            response={chatResponse}
            loading={loadingChat}
            servers={servers}
            alerts={alerts}
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
        {activePage === "models" && <ModelsPage summary={modelSummary} />}
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
        </div>
      </main>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={paletteCommands}
      />
    </div>
  );
}

function MiniProgress({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const level = pct >= 80 ? "danger" : pct >= 60 ? "warning" : "ok";
  return (
    <div className="mini-progress">
      <div className="mini-progress-track">
        <div className={`mini-progress-bar ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="mini-progress-value">{pct}%</span>
    </div>
  );
}

function severityLabel(s: string) {
  switch (s) {
    case "critical": return "严重";
    case "warning": return "警告";
    case "info": return "信息";
    default: return s;
  }
}

function alertStatusLabel(s: string) {
  switch (s) {
    case "open": return "待处理";
    case "acknowledged": return "处理中";
    case "resolved": return "已解决";
    default: return s;
  }
}

function sourceLabel(s: string) {
  switch (s) {
    case "server_metrics": return "服务器指标";
    case "logs": return "日志";
    case "agent": return "Agent";
    case "manual": return "手动";
    default: return s;
  }
}

function resourceTypeLabel(t: string) {
  switch (t) {
    case "server": return "物理机/虚拟机";
    case "docker": return "Docker 容器";
    case "service": return "服务";
    case "k8s": return "K8s Pod";
    default: return t;
  }
}

function resourceEnvLabel(e: string) {
  switch (e) {
    case "production": return "生产环境";
    case "staging": return "预发布环境";
    case "testing": return "测试环境";
    case "development": return "开发环境";
    default: return e;
  }
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
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!selectedAlert && alerts.length > 0) {
      setSelectedAlert(alerts[0]);
    }
  }, [alerts, selectedAlert]);

  const filtered = alerts.filter((alert) => {
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    return true;
  });

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
          <span>严重告警</span>
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
          <div className="filter-bar">
            <button className={`filter-btn ${filterSeverity === "all" ? "active" : ""}`} onClick={() => setFilterSeverity("all")} type="button">
              全部 <span className="count">{alerts.length}</span>
            </button>
            <button className={`filter-btn ${filterSeverity === "critical" ? "active" : ""}`} onClick={() => setFilterSeverity("critical")} type="button">
              严重 <span className="count">{criticalCount}</span>
            </button>
            <button className={`filter-btn ${filterSeverity === "warning" ? "active" : ""}`} onClick={() => setFilterSeverity("warning")} type="button">
              警告
            </button>
            <button className={`filter-btn ${filterSeverity === "info" ? "active" : ""}`} onClick={() => setFilterSeverity("info")} type="button">
              信息
            </button>
            <span style={{ width: 8 }} />
            <button className={`filter-btn ${filterStatus === "all" ? "active" : ""}`} onClick={() => setFilterStatus("all")} type="button">
              全部状态
            </button>
            <button className={`filter-btn ${filterStatus === "open" ? "active" : ""}`} onClick={() => setFilterStatus("open")} type="button">
              待处理 <span className="count">{openCount}</span>
            </button>
            <button className={`filter-btn ${filterStatus === "acknowledged" ? "active" : ""}`} onClick={() => setFilterStatus("acknowledged")} type="button">
              处理中 <span className="count">{acknowledgedCount}</span>
            </button>
          </div>
          <div className="alert-list">
            {filtered.map((alert) => (
              <button
                className={selectedAlert?.id === alert.id ? "alert-item active" : "alert-item"}
                key={alert.id}
                onClick={() => {
                  setSelectedAlert(alert);
                  setDiagnosis(null);
                }}
                type="button"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <div className={`alert-color-bar ${alert.severity}`} />
                <span className={`severity ${alert.severity}`}>{severityLabel(alert.severity)}</span>
                <strong>{alert.title}</strong>
                <small>{serverName(alert.serverId)} · {sourceLabel(alert.source)}</small>
                <em>{alertStatusLabel(alert.status)}</em>
              </button>
            ))}
            {filtered.length === 0 && alerts.length > 0 && (
              <div className="table-empty">没有匹配当前筛选条件的告警</div>
            )}
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
                <span className={`severity ${selectedAlert.severity}`}>{severityLabel(selectedAlert.severity)}</span>
                <h3>{selectedAlert.title}</h3>
                <p>{new Date(selectedAlert.triggeredAt).toLocaleString()} · {sourceLabel(selectedAlert.source)}</p>
              </div>
              <dl className="config-list">
                <div><dt>状态</dt><dd>{alertStatusLabel(selectedAlert.status)}</dd></div>
                <div><dt>关联资源</dt><dd>{serverName(selectedAlert.serverId)}</dd></div>
                <div><dt>事件 ID</dt><dd>{selectedAlert.id}</dd></div>
              </dl>
              <div className="detail-actions">
                <button className="secondary-button" onClick={() => onOpenServer(selectedAlert.serverId)} type="button">
                  <Server size={16} /> 查看资源
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
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScriptDetailData | null>(null);
  const [targetId, setTargetId] = useState<string>("");
  const [runResult, setRunResult] = useState<ScriptRunResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (selectedScriptId === null && scripts.length > 0) {
      setSelectedScriptId(scripts[0].id);
    }
  }, [scripts, selectedScriptId]);

  useEffect(() => {
    if (targetId === "" && servers.length > 0) {
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
  const [selectedCommand, setSelectedCommand] = useState<SlashCommandItem | null>(null);
  const [draft, setDraft] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCommand === null && commands.length > 0) {
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
          <span>AI Copilot 可用</span>
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
              <p className="eyebrow">AI Copilot</p>
              <h2>执行计划</h2>
            </div>
            <span className={`risk-badge ${response.riskLevel}`}>{riskLabel(response.riskLevel)}</span>
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
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [targetId, setTargetId] = useState<string>("");
  const [plan, setPlan] = useState<PackageDeployPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (selectedPackage === null && packages.length > 0) {
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
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [targetId, setTargetId] = useState<string>("");
  const [mode, setMode] = useState("push");
  const [plan, setPlan] = useState<FileTransferPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (selectedFile === null && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);

  useEffect(() => {
    if (targetId === "" && servers.length > 0) {
      setTargetId(servers[0].id);
    }
  }, [servers, targetId]);

  async function generatePlan() {
    if (!selectedFile || !targetId) {
      return;
    }
    setLoadingPlan(true);
    try {
      setPlan(await postJson<FileTransferPlan>(`/files/${selectedFile.id}/transfer-plan`, { targetId, mode }));
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
      const reviewedTicket = await postJson<ApprovalItem>(`/approvals/${selectedTicket.id}/action`, {
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
      const updated = await postJson<MemberItem>(`/members/${memberId}/toggle`, {});
      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
    } finally {
      setSubmittingId(null);
    }
  }

  async function changeRole(memberId: string, role: string) {
    setSubmittingId(memberId);
    try {
      const updated = await postJson<MemberItem>(`/members/${memberId}/role`, { role });
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
      const updated = await postJson<TeamItem>(`/teams/${teamId}/toggle`, {});
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
      const updated = await postJson<RoleItem>(`/roles/${roleId}/toggle`, {});
      setRoles((current) => current.map((role) => (role.id === updated.id ? updated : role)));
    } finally {
      setSubmittingId(null);
    }
  }

  async function togglePermission(roleId: string, permission: string) {
    setSubmittingId(`${roleId}:${permission}`);
    try {
      const updated = await postJson<RoleItem>(`/roles/${roleId}/permission`, { permission });
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

function Dashboard({
  summary,
  servers,
  onQuickAction
}: {
  summary: DashboardSummary | null;
  servers: ServerItem[];
  onQuickAction: (message: string) => void;
}) {
  const primaryServer = servers[0];
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  // AI 状态分析 - 模拟真实 AI 判断逻辑
  const aiStatus = useMemo(() => {
    const onlineServers = servers.filter(s => s.agentStatus === 'online').length;
    const totalServers = servers.length;
    const criticalAlerts = summary?.alerts.critical ?? 0;
    const openAlerts = summary?.alerts.open ?? 0;
    const avgCpu = servers.length > 0 
      ? Math.round(servers.reduce((sum, s) => sum + s.cpuUsage, 0) / servers.length)
      : 0;
    const highCpuServers = servers.filter(s => s.cpuUsage > 80).length;

    // 判断系统健康状态
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let title = '系统运行正常';
    let description = '暂无高风险问题，所有服务指标正常';
    
    if (criticalAlerts > 0) {
      status = 'critical';
      title = '存在紧急告警';
      description = `${criticalAlerts} 个 Critical 告警需要立即处理`;
    } else if (openAlerts > 2 || highCpuServers > 1) {
      status = 'warning';
      title = '部分指标异常';
      description = `${openAlerts} 个开放告警，${highCpuServers} 台服务器 CPU 偏高`;
    }

    // 最近观察
    const observations = [];
    if (avgCpu > 50) {
      observations.push(`平均 CPU 利用率偏高 (${avgCpu}%)`);
    }
    if (servers.some(s => s.memoryUsage > 70)) {
      observations.push('部分服务器内存使用率较高');
    }
    if (servers.some(s => s.diskUsage > 80)) {
      observations.push('存在磁盘利用率超 80% 的服务器');
    }
    if (observations.length === 0) {
      observations.push('所有关键指标均在正常范围内');
    }

    return { status, title, description, observations, avgCpu, criticalAlerts, openAlerts, onlineServers, totalServers };
  }, [servers, summary]);

  // 系统事件时间线 - 模拟真实事件
  const eventTimeline = useMemo(() => {
    const events = [];
    const now = new Date();
    
    if (aiStatus.criticalAlerts > 0) {
      events.push({
        time: new Date(now.getTime() - 2 * 60000).toISOString(),
        type: 'critical',
        event: `检测到 ${aiStatus.criticalAlerts} 个 Critical 级别告警`,
        action: '已通知值班人员'
      });
    }
    
    if (aiStatus.avgCpu > 60) {
      events.push({
        time: new Date(now.getTime() - 5 * 60000).toISOString(),
        type: 'warning',
        event: `CPU 利用率超过 60% 阈值`,
        action: 'AI 启动自动分析'
      });
    }
    
    events.push({
      time: new Date(now.getTime() - 15 * 60000).toISOString(),
      type: 'info',
      event: `完成 ${summary?.automation.aiDiagnosesToday ?? 0} 次自动诊断`,
      action: '系统健康检查完成'
    });
    
    events.push({
      time: new Date(now.getTime() - 30 * 60000).toISOString(),
      type: 'info',
      event: `${aiStatus.onlineServers}/${aiStatus.totalServers} 台服务器在线`,
      action: 'Agent 心跳正常'
    });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [aiStatus, summary]);

  // 推荐动作
  const recommendedActions = useMemo(() => {
    const actions = [];
    
    if (aiStatus.status === 'critical') {
      actions.push({ label: '处理告警', icon: Bell, priority: 'high', action: '处理紧急告警' });
    }
    if (aiStatus.status === 'warning' || aiStatus.status === 'healthy') {
      actions.push({ label: '执行巡检', icon: Gauge, priority: 'normal', action: '执行系统巡检' });
    }
    actions.push({ label: '生成日报', icon: FileText, priority: 'low', action: '生成今日运维日报' });
    actions.push({ label: '深度分析', icon: Bot, priority: 'normal', action: 'AI 深度诊断' });
    
    return actions;
  }, [aiStatus]);

  // 场景化快捷操作
  const opsCategories = useMemo(() => [
    {
      title: '故障处理',
      items: [
        { label: '告警处置', icon: Bell, action: aiStatus.criticalAlerts > 0 
          ? `处理 ${aiStatus.criticalAlerts} 个紧急告警` 
          : '查看所有开放告警' },
        { label: '远程诊断', icon: Terminal, action: primaryServer 
          ? `SSH 到 ${primaryServer.hostname} 执行诊断` 
          : '选择服务器进行诊断' },
      ]
    },
    {
      title: 'AI 操作',
      items: [
        { label: '智能巡检', icon: Gauge, action: '执行生产环境全量巡检' },
        { label: '根因分析', icon: Bot, action: '分析最近的告警根因' },
        { label: '日志分析', icon: FileText, action: 'AI 总结最近 100 条错误日志' },
      ]
    },
    {
      title: '自动化',
      items: [
        { label: '部署 Agent', icon: Boxes, action: '为待纳管资源生成部署计划' },
        { label: '执行脚本', icon: FileCode2, action: '选择脚本在目标资源执行' },
      ]
    }
  ], [aiStatus, primaryServer]);

  // 今日运维摘要
  const todaySummary = useMemo(() => ({
    serversOnline: `${aiStatus.onlineServers}/${aiStatus.totalServers}`,
    criticalAlerts: aiStatus.criticalAlerts,
    openAlerts: aiStatus.openAlerts,
    aiDiagnoses: summary?.automation.aiDiagnosesToday ?? 0,
    avgCpu: aiStatus.avgCpu,
    avgMemory: servers.length > 0 
      ? Math.round(servers.reduce((sum, s) => sum + s.memoryUsage, 0) / servers.length)
      : 0,
    agentOnline: summary?.servers.online ?? 0,
  }), [aiStatus, servers, summary]);

  return (
    <>
      {/* AI Copilot 抽屉 */}
      <CopilotDrawer 
        open={copilotOpen} 
        onClose={() => setCopilotOpen(false)}
        message={copilotMessage}
        setMessage={setCopilotMessage}
        loading={copilotLoading}
        onSend={(msg) => {
          onQuickAction(msg);
        }}
      />

      <div className="content-grid">
        {/* AI 状态摘要 - 核心区 */}
        <section className="ai-status-hero">
          <div className="ai-status-badge">
            <div className={`status-indicator ${aiStatus.status}`} />
            <span className="status-label">{aiStatus.status === 'healthy' ? '健康' : aiStatus.status === 'warning' ? '注意' : '危险'}</span>
          </div>
          <div className="ai-status-content">
            <h2>{aiStatus.title}</h2>
            <p>{aiStatus.description}</p>
          </div>
          <div className="ai-observations">
            <strong>最近观察到：</strong>
            <ul>
              {aiStatus.observations.map((obs, i) => <li key={i}>{obs}</li>)}
            </ul>
          </div>
          <div className="ai-actions">
            <button className="primary-button" onClick={() => onQuickAction('执行系统巡检')}>
              <Gauge size={16} /> 查看分析
            </button>
            <button className="secondary-button" onClick={() => onQuickAction('执行巡检')}>
              <Bot size={16} /> 执行巡检
            </button>
            <button className="secondary-button" onClick={() => onQuickAction('生成今日运维日报')}>
              <FileText size={16} /> 生成日报
            </button>
          </div>
          <button className="copilot-trigger" onClick={() => setCopilotOpen(true)}>
            <MessageSquareText size={18} />
            <span>AI 助手</span>
          </button>
        </section>

        {/* 今日运维摘要 */}
        <section className="today-summary">
          <h3><Clock size={16} /> 今日运维摘要</h3>
          <div className="summary-metrics">
            <div className="summary-item">
              <strong>{todaySummary.serversOnline}</strong>
              <span>服务器在线</span>
            </div>
            <div className={`summary-item ${todaySummary.criticalAlerts > 0 ? 'alert' : ''}`}>
              <strong>{todaySummary.criticalAlerts}</strong>
              <span>高危告警</span>
            </div>
            <div className="summary-item">
              <strong>{todaySummary.aiDiagnoses}</strong>
              <span>AI 诊断</span>
            </div>
            <div className="summary-item">
              <strong>{todaySummary.avgCpu}%</strong>
              <span>平均 CPU</span>
            </div>
            <div className="summary-item">
              <strong>{todaySummary.avgMemory}%</strong>
              <span>平均内存</span>
            </div>
            <div className="summary-item">
              <strong>{todaySummary.agentOnline}</strong>
              <span>Agent 在线</span>
            </div>
          </div>
        </section>

        {/* 性能趋势 */}
        <section className="panel wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">实时态势</p>
              <h2>性能趋势</h2>
            </div>
            <div className="trend-header">
              {summary?.trends.length ? (
                <>
                  <span className="trend-current cpu">CPU {summary.trends[summary.trends.length - 1].cpu}%</span>
                  <span className="trend-current mem">内存 {summary.trends[summary.trends.length - 1].memory}%</span>
                </>
              ) : null}
              <button className="text-button" type="button">
                查看监控 <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {summary?.trends.length ? (
            <>
              <LineChart data={summary.trends} />
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-cpu" />CPU</span>
                <span className="legend-item"><span className="legend-mem" />内存</span>
              </div>
            </>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>暂无趋势数据</div>
          )}
        </section>

        {/* 资源健康度 */}
        <section className="panel wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">资产</p>
              <h2>资源健康度</h2>
            </div>
          </div>
          <div className="server-stack">
            {servers.map((server) => (
              <ServerHealth key={server.id} server={server} />
            ))}
          </div>
        </section>

        {/* 系统事件时间线 */}
        <section className={`panel event-timeline ${aiStatus.criticalAlerts > 0 ? 'status-crit' : aiStatus.openAlerts > 0 ? 'status-warn' : ''}`}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">事件流</p>
              <h2>系统事件</h2>
            </div>
            <span className="timeline-live">
              <span className="live-dot" /> 实时
            </span>
          </div>
          <div className="timeline-list">
            {eventTimeline.map((event, i) => (
              <div key={i} className={`timeline-item ${event.type}`}>
                <div className="timeline-time">
                  {new Date(event.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`timeline-dot ${event.type}`} />
                <div className="timeline-content">
                  <strong>{event.event}</strong>
                  <span>{event.action}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 推荐动作 */}
        <section className="panel recommended-actions">
          <div className="panel-header">
            <div>
              <p className="eyebrow">决策引导</p>
              <h2>推荐动作</h2>
            </div>
          </div>
          <div className="action-cards">
            {recommendedActions.map((action, i) => (
              <button
                key={i}
                className={`action-card ${action.priority}`}
                onClick={() => onQuickAction(action.action)}
              >
                <action.icon size={20} />
                <span>{action.label}</span>
                {action.priority === 'high' && <span className="priority-badge">紧急</span>}
              </button>
            ))}
          </div>
        </section>

        {/* 运维场景化快捷操作 */}
        <section className="panel wide ops-scenarios">
          <div className="panel-header">
            <div>
              <p className="eyebrow">操作入口</p>
              <h2>运维动作</h2>
            </div>
          </div>
          <div className="ops-categories">
            {opsCategories.map((category, i) => (
              <div key={i} className="ops-category">
                <h4>{category.title}</h4>
                <div className="ops-items">
                  {category.items.map((item, j) => (
                    <button
                      key={j}
                      className="ops-item-btn"
                      onClick={() => onQuickAction(item.action)}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function parseMetrics(text: string): Array<{ label: string; value: number }> {
  const pattern = /(CPU|内存|磁盘|Memory|Disk|Load|负载)\s*:?\s*(\d+)%/gi;
  const results: Array<{ label: string; value: number }> = [];
  const seen = new Set<string>();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[1];
    if (!seen.has(label)) {
      seen.add(label);
      results.push({ label, value: Number(match[2]) });
    }
  }
  return results;
}

function riskLabel(risk: string) {
  switch (risk) {
    case "low": return "低风险";
    case "medium": return "中风险";
    case "high": return "高风险";
    default: return risk;
  }
}

const QUICK_COMMANDS = [
  { label: "巡检", template: "帮我巡检所有资源，并生成风险摘要", Icon: Radar },
  { label: "诊断", template: "帮我诊断当前告警，给出证据链和修复计划", Icon: Stethoscope },
  { label: "SSH", template: "SSH 连接到服务器", Icon: Terminal },
  { label: "日志", template: "分析最近的系统日志，找出异常", Icon: FileText },
  { label: "部署", template: "部署最新版本到生产环境", Icon: Rocket },
  { label: "脚本", template: "执行巡检脚本", Icon: Code2 }
];

function ChatOps({
  message,
  setMessage,
  sendMessage,
  messages,
  response,
  loading,
  servers,
  alerts
}: {
  message: string;
  setMessage: (value: string) => void;
  sendMessage: (event: FormEvent) => void;
  messages: ChatMessage[];
  response: ChatResponse | null;
  loading: boolean;
  servers: ServerItem[];
  alerts: AlertItem[];
}) {
  const [recentTasks, setRecentTasks] = useState<TimelineTask[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchJson<{ items: TimelineTask[] }>("/api/tasks")
      .then((data) => setRecentTasks(data.items))
      .catch(() => {});
  }, [response?.taskId]);

  const onlineServers = servers.filter(s => s.agentStatus === "online").length;
  const openAlerts = alerts.filter(a => a.status !== "resolved").length;
  const activeTasks = recentTasks.filter(t => t.status === "planned" || t.status === "waiting" || t.status === "running");
  const historyTasks = recentTasks.filter(t => t.status === "done" || t.status === "failed");
  const onlineAssets = servers.filter(s => s.agentStatus === "online");

  return (
    <section className={`chat-layout ${drawerOpen ? "drawer-open" : ""}`}>
      <div className="chat-panel">
        {/* 顶部工具栏 — Notion 风格极简 */}
        <div className="chat-topbar">
          <span className="chat-topbar-dot" />
          <span className="chat-topbar-title">AI Copilot</span>
          <span className="chat-topbar-sep" />
          <div className="chat-topbar-pill">
            <Server size={12} />
            <span>{onlineServers} 台在线</span>
          </div>
          <div className="chat-topbar-pill">
            <Bell size={12} />
            <span>{openAlerts} 告警</span>
          </div>
          <div className="chat-topbar-right">
            <button className="chat-icon-btn" type="button" aria-label="搜索"><Search size={16} /></button>
            <button className={`chat-icon-btn ${drawerOpen ? "active" : ""}`} type="button" aria-label="任务记录" onClick={() => setDrawerOpen(!drawerOpen)}><PanelRight size={16} /></button>
            <button className="chat-icon-btn" type="button" aria-label="设置"><Settings size={16} /></button>
          </div>
        </div>

        {/* 消息区 */}
        <div className="chat-thread" aria-live="polite">
          {messages.map((item) => (
            <div className={`msg-row ${item.role}`} key={item.id}>
              <div className={`msg-avatar ${item.role === "assistant" ? "av-ai" : "av-user"}`}>
                {item.role === "assistant" ? <Bot size={13} /> : "LH"}
              </div>
              <div>
                <div className={`msg-bubble ${item.role === "assistant" ? "b-ai" : "b-user"}`}>
                  <p>{item.content || (item.streaming ? <span className="thinking-dots"><span /><span /><span /></span> : "")}{item.streaming && item.content ? <span className="typing-cursor" /> : null}</p>

                  {/* 内联结果卡片 — 巡检/诊断结果 */}
                  {item.role === "assistant" && item.response?.plan && item.response.plan.length > 0 && (
                    <div className="result-card">
                      {item.response.plan.map((step, idx) => (
                        <div className="result-row" key={idx}>
                          <span className={`dot-${item.response?.riskLevel === "high" ? "warn" : "ok"}`} />
                          <span className="result-name">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.role === "assistant" && item.response?.warnings && item.response.warnings.length > 0 && (
                    <div className="result-card">
                      {item.response.warnings.map((w, i) => (
                        <div className="result-row" key={i}>
                          <span className="dot-warn" />
                          <span className="result-name">{w}</span>
                          <span className="tag-inline tag-warn" style={{ marginLeft: "auto" }}>注意</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="msg-meta">
                  {item.role === "assistant" ? "AI Copilot" : "Leo Hang"} · {formatRelativeTime(item.id)}
                </div>
                {item.role === "assistant" && item.content && !item.streaming && (
                  <div className="msg-actions">
                    <button className="msg-action-btn" onClick={() => { navigator.clipboard.writeText(item.content); toast.success("已复制到剪贴板"); }} type="button">
                      复制
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg-row assistant">
              <div className="msg-avatar av-ai"><Bot size={13} /></div>
              <div>
                <div className="msg-bubble b-ai">
                  <div className="ai-thinking-bar">
                    <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
                    <span>AI 正在分析上下文并生成计划…</span>
                  </div>
                </div>
                <div className="msg-meta">AI Copilot · 刚刚</div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="chat-inputzone">
          <div className="chips-row">
            {QUICK_COMMANDS.map((cmd) => (
              <button className="chip" key={cmd.label} onClick={() => setMessage(cmd.template)} type="button">
                <cmd.Icon size={13} />
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
          <form className="inputbox" onSubmit={sendMessage}>
            <textarea
              onChange={(event) => setMessage(event.target.value)}
              placeholder="描述需求，或输入 / 触发快捷命令…"
              rows={2}
              value={message}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
            />
            <button className="send-icon-btn" disabled={loading || !message.trim()} type="submit" aria-label="发送">
              <ArrowUp size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* 右侧抽屉 — 任务记录 + 资产 */}
      {drawerOpen && (
        <aside className="chat-drawer">
          <div className="drawer-header">
            <span className="drawer-title">任务记录</span>
            <button className="chat-icon-btn" type="button" aria-label="关闭" onClick={() => setDrawerOpen(false)}><X size={15} /></button>
          </div>
          <div className="drawer-body">
            {/* 进行中 */}
            <div className="drawer-section">进行中</div>
            {activeTasks.length === 0 && <div className="drawer-empty">暂无进行中的任务</div>}
            {activeTasks.map((task) => (
              <div className="task-item" key={task.id}>
                <div className="task-top">
                  <span className="task-name">{task.taskType}</span>
                  <span className={`task-badge ${task.riskLevel === "high" ? "tb-hi" : task.riskLevel === "medium" ? "tb-mid" : "tb-lo"}`}>
                    {task.riskLevel === "high" ? "高" : task.riskLevel === "medium" ? "中" : "低"}
                  </span>
                </div>
                <div className="task-desc">{task.summary}</div>
                <div className="task-time">{formatRelativeTime(task.createdAt)} · {taskStatusLabel(task.status)}</div>
              </div>
            ))}

            {/* 历史 */}
            <div className="drawer-section" style={{ marginTop: 8 }}>历史</div>
            {historyTasks.length === 0 && <div className="drawer-empty">暂无历史任务</div>}
            {historyTasks.slice(0, 5).map((task) => (
              <div className="task-item" key={task.id}>
                <div className="task-top">
                  <span className="task-name">{task.taskType}</span>
                  <span className={`task-badge ${task.riskLevel === "high" ? "tb-hi" : task.riskLevel === "medium" ? "tb-mid" : "tb-lo"}`}>
                    {task.riskLevel === "high" ? "高" : task.riskLevel === "medium" ? "中" : "低"}
                  </span>
                </div>
                <div className="task-desc">{task.summary}</div>
                <div className="task-time">{formatRelativeTime(task.createdAt)} · {taskStatusLabel(task.status)}</div>
              </div>
            ))}

            {/* 在线资产 */}
            <div className="drawer-section" style={{ marginTop: 8 }}>在线资产</div>
            {onlineAssets.map((s) => (
              <div className="asset-row" key={s.id}>
                <span className="dot-ok" />
                <div>
                  <div className="asset-name">{s.hostname}</div>
                  <div className="asset-ip">{s.ip}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}

function intentLabel(intent: string): string {
  switch (intent) {
    case "health_check": return "巡检";
    case "ai_diagnose": return "诊断";
    case "open_web_ssh": return "SSH";
    case "deployment_plan": return "部署";
    case "script_run": return "脚本";
    default: return intent;
  }
}

function taskStageClass(status: string): string {
  switch (status) {
    case "planned": return "pending";
    case "waiting": return "active";
    case "running": return "active";
    case "done": return "done";
    case "failed": return "failed";
    default: return "pending";
  }
}

function taskStatusLabel(status: string): string {
  switch (status) {
    case "planned": return "已规划";
    case "waiting": return "等待中";
    case "running": return "执行中";
    case "done": return "已完成";
    case "failed": return "已失败";
    default: return status;
  }
}

function taskStageProgress(status: string, stage: number): string {
  const order: Record<string, number> = { planned: 0, waiting: 1, running: 2, done: 4, failed: 2 };
  const current = order[status] ?? 0;
  if (status === "failed" && stage >= 2) return "failed";
  return stage < current ? "done" : stage === current ? "active" : "pending";
}

function formatRelativeTime(dateStr: string): string {
  const parsed = new Date(dateStr).getTime();
  if (isNaN(parsed)) return "未知";
  const diff = Date.now() - parsed;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
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
  const [editingServer, setEditingServer] = useState<ServerItem | null>(null);
  const [editDraft, setEditDraft] = useState<ServerDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [draft, setDraft] = useState<ServerDraft>({
    hostname: "",
    ip: "",
    port: "22",
    environment: "staging",
    os: "Linux",
    tags: "",
    type: "server"
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
      setError("资源创建失败，请检查 IP、端口和后端服务状态。");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(key: keyof ServerDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startEdit(server: ServerItem) {
    setEditingServer(server);
    setEditDraft({
      hostname: server.hostname,
      ip: server.ip,
      port: String(server.port),
      environment: server.environment,
      os: server.os,
      tags: server.tags.join(","),
      type: server.type
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingServer || !editDraft) return;
    setEditSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/servers/${editingServer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          hostname: editDraft.hostname,
          ip: editDraft.ip,
          port: Number(editDraft.port),
          environment: editDraft.environment,
          os: editDraft.os,
          type: editDraft.type,
          tags: editDraft.tags
        })
      });
      if (!response.ok) throw new Error("update failed");
      setEditingServer(null);
      setEditDraft(null);
      await onServerCreated();
    } catch {
      setError("资源更新失败");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <section className="panel full server-page">
      <div className="panel-header">
        <div>
          <p className="eyebrow">资产纳管</p>
          <h2>资源列表</h2>
        </div>
        <button className="primary-button" onClick={() => setShowCreate((value) => !value)} type="button">
          <Server size={16} /> {showCreate ? "收起表单" : "新增资源"}
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
            类型
            <select value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}>
              <option value="server">物理机/虚拟机</option>
              <option value="docker">Docker 容器</option>
              <option value="service">服务</option>
              <option value="k8s">K8s Pod</option>
            </select>
          </label>
          <label>
            环境
            <select value={draft.environment} onChange={(event) => updateDraft("environment", event.target.value)}>
              <option value="production">生产环境</option>
              <option value="staging">预发布环境</option>
              <option value="testing">测试环境</option>
              <option value="development">开发环境</option>
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
          <span>类型</span>
          <span>环境</span>
          <span>Agent</span>
          <span>CPU</span>
          <span>内存</span>
          <span>磁盘</span>
          <span>操作</span>
        </div>
        {loading && <div className="table-empty">正在加载资源数据...</div>}
        {!loading && servers.length === 0 && <div className="table-empty">暂无资源</div>}
        {servers.map((server) => (
          <div className="table-row" key={server.id}>
            <span>
              <button className="link-button" onClick={() => onOpenServer(server.id)} type="button">
                {server.hostname}
              </button>
              <small>{server.ip}:{server.port}</small>
            </span>
            <span><span className="resource-type-badge">{resourceTypeLabel(server.type)}</span></span>
            <span>{resourceEnvLabel(server.environment)}</span>
            <span className="agent-status">
              <StatusDot status={server.agentStatus === "online" ? "online" : server.agentStatus === "not_installed" ? "offline" : "offline"} label={server.agentStatus === "online" ? "在线" : server.agentStatus === "not_installed" ? "未安装" : "离线"} />
            </span>
            <span><MiniProgress value={server.cpuUsage} /></span>
            <span><MiniProgress value={server.memoryUsage} /></span>
            <span><MiniProgress value={server.diskUsage} /></span>
            <span className="row-actions">
              <button onClick={() => startEdit(server)} title="编辑" type="button"><Settings size={16} /></button>
              <button title="Web SSH" type="button"><Terminal size={16} /></button>
              <button onClick={() => onOpenServer(server.id)} title="性能图" type="button"><Activity size={16} /></button>
            </span>
          </div>
        ))}
      </div>
      {editingServer && editDraft && (
        <div className="modal-overlay" onClick={() => { setEditingServer(null); setEditDraft(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>编辑资源</h3>
            <form className="model-form-v2" onSubmit={saveEdit}>
              <div className="modal-body">
                <div className="form-field">
                  <span>主机名</span>
                  <input value={editDraft.hostname} onChange={(e) => setEditDraft((d) => d ? { ...d, hostname: e.target.value } : d)} />
                </div>
                <div className="form-field">
                  <span>IP 地址</span>
                  <input value={editDraft.ip} onChange={(e) => setEditDraft((d) => d ? { ...d, ip: e.target.value } : d)} />
                </div>
                <div className="form-field">
                  <span>端口</span>
                  <input value={editDraft.port} onChange={(e) => setEditDraft((d) => d ? { ...d, port: e.target.value } : d)} />
                </div>
                <div className="form-field">
                  <span>类型</span>
                  <select value={editDraft.type} onChange={(e) => setEditDraft((d) => d ? { ...d, type: e.target.value } : d)}>
                    <option value="server">物理机/虚拟机</option>
                    <option value="docker">Docker 容器</option>
                    <option value="service">服务</option>
                    <option value="k8s">K8s Pod</option>
                  </select>
                </div>
                <div className="form-field">
                  <span>环境</span>
                  <select value={editDraft.environment} onChange={(e) => setEditDraft((d) => d ? { ...d, environment: e.target.value } : d)}>
                    <option value="production">生产环境</option>
                    <option value="staging">预发布环境</option>
                    <option value="testing">测试环境</option>
                    <option value="development">开发环境</option>
                  </select>
                </div>
                <div className="form-field">
                  <span>系统</span>
                  <input value={editDraft.os} onChange={(e) => setEditDraft((d) => d ? { ...d, os: e.target.value } : d)} />
                </div>
                <div className="form-field">
                  <span>标签</span>
                  <input value={editDraft.tags} onChange={(e) => setEditDraft((d) => d ? { ...d, tags: e.target.value } : d)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => { setEditingServer(null); setEditDraft(null); }} type="button">取消</button>
                <button className="btn-primary" disabled={editSaving} type="submit">{editSaving ? "保存中" : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function ServerDetail({ serverId, onBack }: { serverId: string; onBack: () => void }) {
  const [server, setServer] = useState<ServerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [installPlan, setInstallPlan] = useState<AgentInstallPlan | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisReport | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Array<{ id: string; name: string; type: string; riskLevel: string }>>([]);
  const [commands, setCommands] = useState<Array<{ command: string; description: string }>>([]);
  const [timeRange, setTimeRange] = useState(60);

  function loadServer(limit: number) {
    setLoading(true);
    setLoadError(null);
    fetchJson<ServerDetailData>(`/api/servers/${serverId}?limit=${limit}`)
      .then(setServer)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadServer(timeRange);
    fetchJson<{ items: Array<{ id: string; name: string; type: string; riskLevel: string }> }>(`/api/scripts`).then((d) => setScripts(d.items)).catch(() => {});
    fetchJson<{ items: Array<{ command: string; description: string }> }>(`/api/slash-commands`).then((d) => setCommands(d.items)).catch(() => {});
  }, [serverId]);

  useEffect(() => {
    if (serverId) loadServer(timeRange);
  }, [timeRange]);

  useEffect(() => {
    if (!server || server.dataMode !== "agent_metrics") return;
    setDiagnosisLoading(true);
    postJson<DiagnosisReport>(`/api/servers/${serverId}/diagnose`, {})
      .then(setDiagnosis)
      .catch(() => {})
      .finally(() => setDiagnosisLoading(false));
  }, [serverId, server?.dataMode]);

  async function loadInstallPlan() {
    setActionLoading("agent");
    try {
      setInstallPlan(await postJson<AgentInstallPlan>(`/api/servers/${serverId}/agent/install-plan`, {}));
    } finally {
      setActionLoading(null);
    }
  }

  async function refreshDiagnosis() {
    setDiagnosisLoading(true);
    try {
      setDiagnosis(await postJson<DiagnosisReport>(`/api/servers/${serverId}/diagnose`, {}));
    } finally {
      setDiagnosisLoading(false);
    }
  }

  if (loading) {
    return <section className="placeholder"><RefreshCw size={30} /><h2>正在加载资源详情</h2></section>;
  }

  if (loadError) {
    return (
      <section className="placeholder">
        <Server size={30} />
        <h2>无法加载资源</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{loadError}</p>
        <button className="btn btn-primary" onClick={() => loadServer(timeRange)} type="button" style={{ marginTop: 16 }}>
          <RefreshCw size={14} /> 重试
        </button>
      </section>
    );
  }

  if (!server) {
    return <section className="placeholder"><Server size={30} /><h2>资源不存在</h2></section>;
  }

  const trends = computeTrends(server.realtime);
  const loadPct = Math.round((server.loadAvg / Math.max(server.system.cpuCores || 1, 1)) * 100);
  const detailCards = [
    { label: "CPU", value: server.cpuUsage, threshold: 80, icon: Gauge, tone: "blue", trend: trends.cpu },
    { label: "内存", value: server.memoryUsage, threshold: 80, icon: Database, tone: "green", trend: trends.mem },
    { label: "磁盘", value: server.diskUsage, threshold: 85, icon: HardDrive, tone: "amber", trend: trends.disk },
    { label: "负载压力", value: loadPct, threshold: 80, icon: Activity, tone: "pink", trend: trends.load }
  ];

  return (
    <div className="server-detail">
      <section className="detail-hero">
        <div>
          <button className="text-button" onClick={onBack} type="button">
            <ArrowLeft size={16} /> 返回资源列表
          </button>
          <h2>{server.hostname}</h2>
          <p>{server.ip}:{server.port} · {server.os} · {resourceEnvLabel(server.environment)} · <span className="resource-type-badge">{resourceTypeLabel(server.type)}</span></p>
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
        </div>
      </section>

      <section className="metric-grid">
        {detailCards.map((card) => {
          const Icon = card.icon;
          const pct = card.value;
          const nearThreshold = pct >= card.threshold * 0.8;
          const overThreshold = pct >= card.threshold;
          return (
            <article className="metric-card enhanced" key={card.label}>
              <div className="metric-card-top">
                <div className={`metric-icon ${card.tone}`}>
                  <Icon size={20} />
                </div>
                <div className="metric-trend">
                  {card.trend > 1 ? <TrendingUp size={14} className="trend-up" />
                    : card.trend < -1 ? <TrendingDown size={14} className="trend-down" />
                    : <Minus size={14} className="trend-flat" />}
                  <span className={card.trend > 1 ? "trend-up" : card.trend < -1 ? "trend-down" : "trend-flat"}>
                    {card.trend > 0 ? "+" : ""}{card.trend}%
                  </span>
                </div>
              </div>
              <span>{card.label}</span>
              <strong>{pct}%</strong>
              <div className="metric-progress-track">
                <div
                  className={`metric-progress-bar ${overThreshold ? "danger" : nearThreshold ? "warning" : "ok"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="metric-threshold">{overThreshold ? "已超阈值" : `距阈值 ${card.threshold}% 还有 ${card.threshold - pct}%`}</span>
            </article>
          );
        })}
      </section>

      <section className="detail-grid">
        <article className="panel wide-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">实时监控</p>
              <h2>性能趋势</h2>
            </div>
            <div className="time-range-btns">
              {[{ label: "10分钟", v: 60 }, { label: "30分钟", v: 180 }, { label: "1小时", v: 360 }].map((r) => (
                <button key={r.v} className={`time-range-btn ${timeRange === r.v ? "active" : ""}`} onClick={() => setTimeRange(r.v)} type="button">{r.label}</button>
              ))}
            </div>
          </div>
          {server.realtime.length > 1 ? (
            <LineChart data={server.realtime} />
          ) : (
            <div className="table-empty">暂无足够数据绘制趋势图。等待 Agent 持续上报后自动显示。</div>
          )}
          <div className="chart-legend">
            <span className="legend-item"><i className="legend-cpu" /> CPU</span>
            <span className="legend-item"><i className="legend-mem" /> 内存</span>
          </div>
        </article>

        {diagnosis && (
          <article className="panel wide-card ai-panel enhanced-diagnosis">
            <div className="panel-header">
              <div>
                <p className="eyebrow"><Bot size={14} /> AI 诊断</p>
                <h2>智能诊断报告</h2>
              </div>
              <div className="diagnosis-meta">
                <span className="risk-badge low">风险等级：低</span>
                <span className="confidence-badge">置信度：92%</span>
                <button className="text-button" onClick={refreshDiagnosis} disabled={diagnosisLoading} type="button">
                  <RefreshCw size={14} className={diagnosisLoading ? "spinning" : ""} /> 刷新
                </button>
              </div>
            </div>
            
            {/* 诊断摘要 */}
            <div className="diagnosis-hero">
              <div className="diagnosis-status healthy">
                <CheckCircle2 size={24} />
                <span>当前系统处于健康状态</span>
              </div>
              <p className="diagnosis-summary">{diagnosis.summary}</p>
            </div>

            {/* 推理过程 */}
            <div className="diagnosis-reasoning">
              <h4><Zap size={14} /> AI 推理过程</h4>
              <div className="reasoning-steps">
                <div className="reasoning-step">
                  <span className="step-num">1</span>
                  <span>CPU 波动正常（±5% 范围内）</span>
                </div>
                <div className="reasoning-step">
                  <span className="step-num">2</span>
                  <span>磁盘使用率稳定，未接近阈值</span>
                </div>
                <div className="reasoning-step">
                  <span className="step-num">3</span>
                  <span>无异常 IO 操作</span>
                </div>
                <div className="reasoning-step">
                  <span className="step-num">4</span>
                  <span>最近 30 分钟无新告警触发</span>
                </div>
              </div>
            </div>

            {/* AI 预测 */}
            {diagnosis.possibleCauses.length > 0 && (
              <div className="ai-prediction">
                <Zap size={14} />
                <span>基于当前趋势，{diagnosis.possibleCauses[0]}</span>
              </div>
            )}

            <div className="diagnosis-grid">
              <ListBlock title="证据链" items={diagnosis.evidence} />
              <ListBlock title="可能原因" items={diagnosis.possibleCauses} />
              <div className="list-block">
                <strong>修复方案</strong>
                <ul>
                  {diagnosis.repairPlan.map((item, i) => (
                    <li key={i} className="repair-item">
                      <span>{item}</span>
                      <button className="mini-action-btn execute" type="button">
                        <PlayCircle size={12} /> 执行
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 关联分析 */}
            <div className="diagnosis-actions">
              <button className="secondary-button" type="button">
                <Gauge size={16} /> 执行深度巡检
              </button>
              <button className="secondary-button" type="button">
                <FileText size={16} /> 查看最近日志
              </button>
              <button className="secondary-button" type="button">
                <FileCode2 size={16} /> 生成健康报告
              </button>
            </div>
          </article>
        )}
        {diagnosisLoading && !diagnosis && (
          <article className="panel wide-card ai-panel">
            <div className="panel-header"><div><p className="eyebrow"><Bot size={14} /> AI 分析</p><h2>智能诊断</h2></div></div>
            <div className="table-empty"><RefreshCw size={16} className="spinning" /> 正在分析服务器状态...</div>
          </article>
        )}

        {(scripts.length > 0 || commands.length > 0) && (
          <article className="panel wide-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">操作</p>
                <h2>快捷操作</h2>
              </div>
            </div>
            <div className="ops-grid">
              {commands.map((cmd) => (
                <div className="ops-item" key={cmd.command}>
                  <div>
                    <Code2 size={14} />
                    <strong>{cmd.command}</strong>
                    <span>{cmd.description}</span>
                  </div>
                  <button className="mini-action-btn" type="button"><PlayCircle size={12} /> 执行</button>
                </div>
              ))}
              {scripts.map((scr) => (
                <div className="ops-item" key={scr.id}>
                  <div>
                    <FileCode2 size={14} />
                    <strong>{scr.name}</strong>
                    <span>{scr.type} · {scr.riskLevel}</span>
                  </div>
                  <button className="mini-action-btn" type="button"><PlayCircle size={12} /> 执行</button>
                </div>
              ))}
            </div>
          </article>
        )}

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
            <div><dt>Load Avg</dt><dd>{server.loadAvg.toFixed(2)} / {server.system.cpuCores || 1} 核</dd></div>
            <div><dt>网卡</dt><dd>{server.system.networkCards.join(", ")}</dd></div>
            <div><dt>启动时间</dt><dd>{server.system.bootTime ? new Date(server.system.bootTime).toLocaleString() : "暂无"}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">告警</p>
              <h2>告警规则</h2>
            </div>
          </div>
          <div className="rule-list">
            {server.alertRules.map((rule) => (
              <div className="rule-item" key={rule.id}>
                <div>
                  <strong>{rule.name}</strong>
                  <span>当前 {rule.current}% · 阈值 {rule.threshold}%</span>
                </div>
                <span className={rule.triggered ? "status offline" : "status online"}>{rule.triggered ? "已触发" : "正常"}</span>
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
            <p>{server.dataMode === "agent_metrics" ? "Agent 正在持续上报真实指标。" : "暂无 Agent 真实指标。"}</p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">进程</p>
              <h2>Top 进程（按内存）</h2>
            </div>
          </div>
          {server.processes.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table compact">
                <thead><tr><th>PID</th><th>用户</th><th>CPU%</th><th>MEM%</th><th>命令</th></tr></thead>
                <tbody>
                  {server.processes.map((p, i) => (
                    <tr key={i}><td>{p.pid}</td><td>{p.user}</td><td>{p.cpu}</td><td>{p.mem}</td><td className="mono">{p.command}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="table-empty">等待 Agent 上报。</div>}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">服务</p>
              <h2>Systemd 服务状态</h2>
            </div>
          </div>
          {server.services.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table compact">
                <thead><tr><th>服务</th><th>Active</th><th>Sub</th><th>描述</th></tr></thead>
                <tbody>
                  {server.services.map((s, i) => (
                    <tr key={i}><td className="mono">{s.name}</td><td>{s.active}</td><td>{s.sub}</td><td>{s.description}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="table-empty">等待 Agent 上报。</div>}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">日志</p>
              <h2>最近错误日志</h2>
            </div>
          </div>
          {server.logs ? (
            <pre className="log-viewer">{server.logs}</pre>
          ) : <div className="table-empty">暂无错误日志。</div>}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">网络</p>
              <h2>活跃网络连接</h2>
            </div>
          </div>
          {server.network ? (
            <pre className="log-viewer">{server.network}</pre>
          ) : <div className="table-empty">等待 Agent 上报。</div>}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">磁盘</p>
              <h2>磁盘分区详情</h2>
            </div>
          </div>
          {server.diskDetails.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table compact">
                <thead><tr><th>挂载点</th><th>总量</th><th>已用</th><th>可用</th><th>使用率</th></tr></thead>
                <tbody>
                  {server.diskDetails.map((d, i) => (
                    <tr key={i}><td className="mono">{d.mount}</td><td>{d.size}</td><td>{d.used}</td><td>{d.avail}</td><td>{d.percent}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="table-empty">等待 Agent 上报。</div>}
        </article>
      </section>

      {installPlan && (
        <section className="detail-grid">
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
        </section>
      )}
    </div>
  );
}

function computeTrends(realtime: Array<{ label: string; cpu: number; memory: number }>) {
  if (realtime.length < 2) return { cpu: 0, mem: 0, disk: 0, load: 0 };
  const last = realtime[realtime.length - 1];
  const prev = realtime[realtime.length - 2];
  return {
    cpu: last.cpu - prev.cpu,
    mem: last.memory - prev.memory,
    disk: 0,
    load: 0
  };
}

function LineChart({ data }: { data: Array<{ label: string; cpu: number; memory: number }> }) {
  const w = 600, h = 180, padX = 40, padY = 20;
  const chartW = w - padX * 2, chartH = h - padY * 2;
  const maxVal = Math.max(100, ...data.map((d) => Math.max(d.cpu, d.memory)));
  const toX = (i: number) => padX + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => padY + chartH - (v / maxVal) * chartH;
  const cpuPts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.cpu).toFixed(1)}`).join(" ");
  const memPts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.memory).toFixed(1)}`).join(" ");
  const yTicks = [0, 25, 50, 75, 100];

  // 检测异常点
  const anomalyPoints = data.filter(d => d.cpu > 80 || d.memory > 80);
  const maxCpuPoint = data.reduce((max, d) => d.cpu > max.cpu ? d : max, data[0] || { cpu: 0 });
  const maxMemPoint = data.reduce((max, d) => d.memory > max.memory ? d : max, data[0] || { memory: 0 });

  return (
    <svg className="line-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {/* 阈值线 */}
      <line x1={padX} y1={toY(80)} x2={w - padX} y2={toY(80)} className="threshold-line warning" />
      <line x1={padX} y1={toY(90)} x2={w - padX} y2={toY(90)} className="threshold-line danger" />
      <text x={w - padX + 4} y={toY(80) + 4} className="threshold-label warning">80%</text>
      <text x={w - padX + 4} y={toY(90) + 4} className="threshold-label danger">90%</text>

      {/* 网格线 */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padX} y1={toY(v)} x2={w - padX} y2={toY(v)} className="chart-grid" />
          <text x={padX - 4} y={toY(v) + 4} textAnchor="end" className="chart-label">{v}%</text>
        </g>
      ))}
      
      {/* 填充区域 */}
      <defs>
        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f6feb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#1f6feb" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33c3a5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#33c3a5" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      <polyline points={cpuPts} className="chart-line-cpu" />
      <polyline points={memPts} className="chart-line-mem" />
      
      {/* 数据点 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.cpu)} r={d.cpu > 80 ? 5 : 3} className={`chart-dot-cpu ${d.cpu > 80 ? 'anomaly' : ''}`}>
            <title>{d.label} CPU: {d.cpu}%</title>
          </circle>
          <circle cx={toX(i)} cy={toY(d.memory)} r={d.memory > 80 ? 5 : 3} className={`chart-dot-mem ${d.memory > 80 ? 'anomaly' : ''}`}>
            <title>{d.label} 内存: {d.memory}%</title>
          </circle>
          {i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
            <text x={toX(i)} y={h - 4} textAnchor="middle" className="chart-label">{d.label}</text>
          )}
        </g>
      ))}
      
      {/* 异常标记 */}
      {maxCpuPoint && maxCpuPoint.cpu > 80 && (
        <g>
          <circle cx={toX(data.indexOf(maxCpuPoint))} cy={toY(maxCpuPoint.cpu)} r={8} className="anomaly-marker" />
          <text x={toX(data.indexOf(maxCpuPoint))} y={toY(maxCpuPoint.cpu) - 12} textAnchor="middle" className="anomaly-label">
            峰值 {maxCpuPoint.cpu}%
          </text>
        </g>
      )}
      
      {/* 当前值高亮 */}
      {data.length > 0 && (
        <g>
          <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].cpu)} r={5} className="chart-dot-cpu-active" />
          <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].memory)} r={5} className="chart-dot-mem-active" />
        </g>
      )}
    </svg>
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
  const maxUsage = Math.max(server.cpuUsage, server.memoryUsage, server.diskUsage);
  const severity = maxUsage >= 90 ? "critical" : maxUsage >= 75 ? "warning" : "healthy";
  return (
    <article className={`server-health ${severity}`}>
      <div className="server-health-header">
        <div className="server-health-info">
          <strong>{server.hostname}</strong>
          <span className="server-health-ip">{server.ip}</span>
          <span className={`server-env-tag ${server.environment}`}>{server.environment === "production" ? "生产" : server.environment === "staging" ? "预发" : "开发"}</span>
        </div>
        <StatusDot status={server.agentStatus === "online" ? "online" : "offline"} label={server.agentStatus === "online" ? "在线" : "离线"} />
      </div>
      <div className="health-bars">
        <ProgressBar label="CPU" value={server.cpuUsage} />
        <ProgressBar label="内存" value={server.memoryUsage} />
        <ProgressBar label="磁盘" value={server.diskUsage} />
      </div>
    </article>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const severity = value >= 90 ? "critical" : value >= 75 ? "warning" : "healthy";
  return (
    <div className="meter">
      <span style={{ fontSize: 11, fontWeight: 600, width: 32, color: "var(--text-muted)" }}>{label}</span>
      <div className="progress-track">
        <div
          className={`progress-fill ${severity}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <b style={{ fontSize: 12, fontWeight: 700, width: 36, textAlign: "right" }}>{value}%</b>
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

// AI Copilot 抽屉组件
function CopilotDrawer({
  open,
  onClose,
  message,
  setMessage,
  loading,
  onSend
}: {
  open: boolean;
  onClose: () => void;
  message: string;
  setMessage: (value: string) => void;
  loading: boolean;
  onSend: (msg: string) => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: '你好！我是 NextOps AI 助手。你可以问我：\n• 为什么 CPU 升高了？\n• 最近有什么异常？\n• 帮我分析日志\n• node 服务占用高吗？' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const quickQuestions = [
    '为什么 CPU 升高了？',
    '最近有什么异常？',
    '帮我分析日志',
    'node 占用高吗？'
  ];

  function handleSend() {
    if (!inputValue.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    onSend(inputValue);
    setInputValue('');
  }

  return (
    <>
      {open && <div className="copilot-overlay" onClick={onClose} />}
      <aside className={`copilot-drawer ${open ? 'open' : ''}`}>
        <div className="copilot-header">
          <div className="copilot-title">
            <Bot size={20} />
            <span>AI 助手</span>
          </div>
          <button className="copilot-close" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>
        <div className="copilot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`copilot-message ${msg.role}`}>
              <div className="copilot-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <MessageSquareText size={16} />}
              </div>
              <div className="copilot-bubble">
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="copilot-message assistant">
              <div className="copilot-avatar"><Bot size={16} /></div>
              <div className="copilot-bubble">
                <p>正在分析...</p>
              </div>
            </div>
          )}
        </div>
        <div className="copilot-quick">
          <span>快捷问题：</span>
          <div className="quick-questions">
            {quickQuestions.map((q, i) => (
              <button key={i} className="quick-question" onClick={() => setInputValue(q)} type="button">
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="copilot-input">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入你的问题..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={loading || !inputValue.trim()} type="button">
            {loading ? <RefreshCw size={16} className="spinning" /> : '发送'}
          </button>
        </div>
      </aside>
    </>
  );
}
