import {
  Activity,
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
  tags: string[];
};

type ChatResponse = {
  intent: string;
  riskLevel: string;
  plan: string[];
  reply: string;
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

export function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [message, setMessage] = useState("帮我巡检生产环境所有 Web 服务器，并生成风险摘要");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  const activeLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find((item) => item.key === activePage);
      if (found) return found.label;
    }
    return "仪表盘";
  }, [activePage]);

  useEffect(() => {
    fetchJson<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => setSummary(null));
    fetchJson<{ items: ServerItem[] }>("/api/servers")
      .then((data) => setServers(data.items))
      .catch(() => setServers([]));
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
        {activePage === "servers" && <Servers servers={servers} />}
        {activePage !== "dashboard" && activePage !== "chatops" && activePage !== "servers" && (
          <Placeholder title={activeLabel} />
        )}
      </main>
    </div>
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

function Servers({ servers }: { servers: ServerItem[] }) {
  return (
    <section className="panel full">
      <div className="panel-header">
        <div>
          <p className="eyebrow">资产纳管</p>
          <h2>服务器列表</h2>
        </div>
        <button className="primary-button" type="button">
          <Server size={16} /> 新增服务器
        </button>
      </div>
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
        {servers.map((server) => (
          <div className="table-row" key={server.id}>
            <span>
              <strong>{server.hostname}</strong>
              <small>{server.ip}:{server.port}</small>
            </span>
            <span>{server.environment}</span>
            <span className={`status ${server.agentStatus}`}>{server.agentStatus}</span>
            <span>{server.cpuUsage}%</span>
            <span>{server.memoryUsage}%</span>
            <span>{server.diskUsage}%</span>
            <span className="row-actions">
              <button title="Web SSH" type="button"><Terminal size={16} /></button>
              <button title="性能图" type="button"><Activity size={16} /></button>
              <button title="告警规则" type="button"><Bell size={16} /></button>
            </span>
          </div>
        ))}
      </div>
    </section>
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

