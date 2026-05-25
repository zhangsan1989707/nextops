import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Bell,
  Bot,
  ChevronRight,
  FileText,
  PanelRight,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Server,
  Settings,
  Stethoscope,
  Terminal,
  X,
} from "lucide-react";
import { useToast } from "../../components/common/Toast";

export type ServerItem = {
  id: string;
  ip: string;
  hostname: string;
  environment: string;
  agentStatus: string;
};

export type AlertItem = {
  id: string;
  status: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  response?: Partial<ChatResponse>;
  streaming?: boolean;
  contextRef?: string;
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
  missingParams?: string[];
};

function intentLabel(intent: string): string {
  const map: Record<string, string> = {
    system_check: "系统巡检",
    diagnosis: "智能诊断",
    ssh_exec: "远程执行",
    log_query: "日志查询",
    metric_query: "指标查询",
    restart_service: "服务重启",
    rollback: "回滚",
  };
  return map[intent] ?? intent;
}

interface TimelineTask {
  id: string;
  taskType: string;
  status: string;
  riskLevel: string;
  summary: string;
  createdAt: string;
}

interface ChatOpsProps {
  servers: ServerItem[];
  alerts: AlertItem[];
}

const QUICK_COMMANDS = [
  { label: "巡检", template: "帮我巡检所有资源，并生成风险摘要", Icon: Radar },
  { label: "诊断", template: "帮我诊断当前告警，给出证据链和修复计划", Icon: Stethoscope },
  { label: "SSH", template: "SSH 连接到服务器", Icon: Terminal },
  { label: "日志", template: "分析最近的系统日志，找出异常", Icon: FileText },
];

function formatRelativeTime(id: string): string {
  try {
    const timestamp = parseInt(id.replace(/\D/g, "").slice(-13), 10);
    if (isNaN(timestamp)) return "刚刚";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    return `${Math.floor(diff / 3600000)} 小时前`;
  } catch {
    return "刚刚";
  }
}

function taskStatusLabel(status: string): string {
  switch (status) {
    case "planned": return "已计划";
    case "waiting": return "等待中";
    case "running": return "执行中";
    case "done": return "已完成";
    case "failed": return "失败";
    default: return status;
  }
}

export function ChatOps({ servers, alerts }: ChatOpsProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentTasks, setRecentTasks] = useState<TimelineTask[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [conversationContext, setConversationContext] = useState<{ lastServer?: string; lastAction?: string; history: Array<{ role: string; content: string; timestamp: number }> } | null>(null);
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onlineServers = servers.filter(s => s.agentStatus === "online").length;
  const openAlerts = alerts.filter(a => a.status !== "resolved").length;
  const activeTasks = recentTasks.filter(t => t.status === "planned" || t.status === "waiting" || t.status === "running");
  const historyTasks = recentTasks.filter(t => t.status === "done" || t.status === "failed");
  const onlineAssets = servers.filter(s => s.agentStatus === "online");

  const enhanceMessageWithContext = (input: string): string => {
    if (!conversationContext) return input;
    
    let enhanced = input;
    
    if (conversationContext.lastServer && 
        (input.includes("那台") || input.includes("这台") || input.includes("刚才") || input.includes("同样的"))) {
      enhanced = enhanced.replace(/(那台|这台|刚才的|同样的)/g, conversationContext.lastServer);
    }
    
    if (conversationContext.lastAction && input.includes("也")) {
      enhanced = `${conversationContext.lastAction}，并且${enhanced}`;
    }
    
    return enhanced;
  };

  const updateContextFromResponse = (userMsg: string, aiResponse: string) => {
    const serverMatch = userMsg.match(/(?:服务器|主机|机器)\s*([^\s,，。]+)/);
    const actionMatch = userMsg.match(/(?:巡检|诊断|检查|查看|分析)\s*([^\s,，]+)?/);
    
    setConversationContext(prev => ({
      lastServer: serverMatch?.[1] || prev?.lastServer,
      lastAction: actionMatch?.[0] || prev?.lastAction,
      history: [
        ...(prev?.history || []).slice(-4),
        { role: "user", content: userMsg, timestamp: Date.now() },
        { role: "assistant", content: aiResponse, timestamp: Date.now() },
      ],
    }));
  };

  const sendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!message.trim() || loading) return;

    const enhancedMessage = enhanceMessageWithContext(message);
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setMessage("");

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResponse: ChatResponse = {
        intent: "system_check",
        riskLevel: "low",
        plan: ["检查服务器状态", "分析资源使用", "生成报告"],
        reply: "好的，我来帮你执行系统巡检。当前检测到系统运行正常，所有服务指标均在正常范围内。",
      };

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: mockResponse.reply,
        response: mockResponse,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setResponse(mockResponse);
      updateContextFromResponse(message, mockResponse.reply);
      toast.success("巡检完成");
    } catch {
      toast.error("请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`chat-layout ${drawerOpen ? "drawer-open" : ""}`}>
      <div className="chat-panel">
        <div className="chat-topbar">
          <span className="chat-topbar-dot" />
          <span className="chat-topbar-title">AI Copilot</span>
          <span className="chat-topbar-sep" />
          {conversationContext && (
            <div className="context-indicator" title="上下文已激活">
              <span className="context-dot" />
              <span>上下文</span>
            </div>
          )}
          <div className="chat-topbar-pill">
            <Server size={12} />
            <span>{onlineServers} 台在线</span>
          </div>
          <div className="chat-topbar-pill">
            <Bell size={12} />
            <span>{openAlerts} 告警</span>
          </div>
          <div className="chat-topbar-right">
            <button className="chat-icon-btn" type="button" aria-label="上下文">
              <Search size={16} />
            </button>
            <button className={`chat-icon-btn ${drawerOpen ? "active" : ""}`} type="button" aria-label="任务记录" onClick={() => setDrawerOpen(!drawerOpen)}>
              <PanelRight size={16} />
            </button>
            <button className="chat-icon-btn" type="button" aria-label="设置">
              <Settings size={16} />
            </button>
          </div>
        </div>

        <div className="chat-thread" aria-live="polite">
          {messages.map((item) => (
            <div className={`msg-row ${item.role}`} key={item.id}>
              <div className={`msg-avatar ${item.role === "assistant" ? "av-ai" : "av-user"}`}>
                {item.role === "assistant" ? <Bot size={13} /> : "U"}
              </div>
              <div>
                {item.contextRef && (
                  <div className="context-ref">
                    <span>关联: {item.contextRef}</span>
                  </div>
                )}
                <div className={`msg-bubble ${item.role === "assistant" ? "b-ai" : "b-user"}`}>
                  <p>
                    {item.content || (item.streaming ? <span className="thinking-dots"><span /><span /><span /></span> : "")}
                    {item.streaming && item.content ? <span className="typing-cursor" /> : null}
                  </p>

                  {item.role === "assistant" && item.response?.plan && item.response.plan.length > 0 && (
                    <div className="result-card">
                      <div className="result-row" style={{ marginBottom: 8 }}>
                        <span className="result-name" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          意图: {intentLabel(item.response?.intent ?? "")}
                        </span>
                      </div>
                      {item.response.plan.map((step, idx) => (
                        <div className="result-row" key={idx}>
                          <span className={`dot-${item.response?.riskLevel === "high" ? "warn" : "ok"}`} />
                          <span className="result-name">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.role === "assistant" && item.response?.missingParams && item.response.missingParams.length > 0 && (
                    <div className="result-card warning-result-card">
                      <div className="warning-card-header">
                        <AlertTriangle size={14} />
                        <strong style={{ fontSize: 13 }}>缺少以下参数，请补充：</strong>
                      </div>
                      {item.response.missingParams.map((param, i) => (
                        <div className="result-row" key={i}>
                          <span className="dot-warn" />
                          <span className="result-name">{param}</span>
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
                  {item.role === "assistant" ? "AI Copilot" : "你"} · {formatRelativeTime(item.id)}
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
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-inputzone">
          <div className="chips-row">
            {QUICK_COMMANDS.map((cmd) => (
              <button className="chip" key={cmd.label} onClick={() => setMessage(cmd.template)} type="button">
                <cmd.Icon size={13} />
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
          <div className="intent-hints-row">
            <span>支持意图:</span>
            <span style={{ color: "var(--text-secondary)" }}>巡检</span>
            <span style={{ color: "var(--text-secondary)" }}>诊断</span>
            <span style={{ color: "var(--text-secondary)" }}>日志查询</span>
            <span style={{ color: "var(--text-secondary)" }}>指标查询</span>
            <span style={{ color: "var(--text-secondary)" }}>服务重启</span>
            <span style={{ color: "var(--text-secondary)" }}>回滚</span>
          </div>
          <form className="inputbox" onSubmit={sendMessage}>
            <textarea
              onChange={(event) => setMessage(event.target.value)}
              placeholder="描述需求，或输入 / 触发快捷命令…"
              rows={2}
              value={message}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <button className="send-icon-btn" disabled={loading || !message.trim()} type="submit" aria-label="发送">
              <ArrowUp size={15} />
            </button>
          </form>
          {conversationContext && (
            <div className="context-hint">
              <span>上下文已激活：{conversationContext.lastServer ? `当前服务器: ${conversationContext.lastServer}` : conversationContext.lastAction ? `最近操作: ${conversationContext.lastAction}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <aside className="chat-drawer">
          <div className="drawer-header">
            <span className="drawer-title">任务记录</span>
            <button className="chat-icon-btn" type="button" aria-label="关闭" onClick={() => setDrawerOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <div className="drawer-body">
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

            <div className="drawer-section">历史任务</div>
            {historyTasks.length === 0 && <div className="drawer-empty">暂无历史任务</div>}
            {historyTasks.slice(0, 5).map((task) => (
              <div className="task-item" key={task.id}>
                <div className="task-top">
                  <span className="task-name">{task.taskType}</span>
                  <span className={`task-badge ${task.riskLevel === "high" ? "tb-hi" : task.riskLevel === "medium" ? "tb-mid" : "tb-lo"}`}>
                    {task.status === "done" ? "完成" : "失败"}
                  </span>
                </div>
                <div className="task-desc">{task.summary}</div>
                <div className="task-time">{formatRelativeTime(task.createdAt)}</div>
              </div>
            ))}

            <div className="drawer-section">在线资产</div>
            <div className="asset-list">
              {onlineAssets.slice(0, 5).map((server) => (
                <div className="asset-item" key={server.id}>
                  <span className="asset-status online" />
                  <span className="asset-name">{server.hostname}</span>
                  <span className="asset-ip">{server.ip}</span>
                </div>
              ))}
              {onlineAssets.length === 0 && <div className="drawer-empty">暂无在线资产</div>}
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}
