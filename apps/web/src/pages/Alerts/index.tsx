import { useState, useEffect } from "react";
import {
  Activity,
  Bell,
  Bot,
  CheckCircle2,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

export type AlertItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  serverId: string;
  triggeredAt: string;
};

export type ServerItem = {
  id: string;
  ip: string;
  hostname: string;
  environment: string;
  agentStatus: string;
};

export type AlertRule = {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  duration: number;
  severity: string;
  enabled: boolean;
  serverId?: string;
  notificationChannels: string[];
};

export type AlertDiagnosisReport = {
  alertId: string;
  serverId: string;
  summary: string;
  impact: string;
  timeline: Array<{ time: string; event: string }>;
  evidence: string[];
  possibleCauses: string[];
  repairPlan: string[];
};

interface AlertsProps {
  alerts: AlertItem[];
  servers: ServerItem[];
  onOpenServer: (serverId: string) => void;
}

function severityLabel(s: string): string {
  switch (s) {
    case "critical": return "严重";
    case "warning": return "警告";
    case "info": return "信息";
    default: return s;
  }
}

function alertStatusLabel(s: string): string {
  switch (s) {
    case "open": return "待处理";
    case "acknowledged": return "处理中";
    case "resolved": return "已解决";
    default: return s;
  }
}

function sourceLabel(s: string): string {
  switch (s) {
    case "server_metrics": return "服务器指标";
    case "logs": return "日志";
    case "agent": return "Agent";
    case "manual": return "手动";
    default: return s;
  }
}

const METRIC_OPTIONS = [
  { value: "cpu", label: "CPU 使用率" },
  { value: "memory", label: "内存使用率" },
  { value: "disk", label: "磁盘使用率" },
  { value: "load", label: "系统负载" },
  { value: "network_in", label: "网络入流量" },
  { value: "network_out", label: "网络出流量" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "严重", color: "#ef4444" },
  { value: "warning", label: "警告", color: "#f59e0b" },
  { value: "info", label: "信息", color: "#3b82f6" },
];

const CHANNEL_OPTIONS = [
  { value: "email", label: "邮件" },
  { value: "webhook", label: "Webhook" },
  { value: "slack", label: "Slack" },
  { value: "dingtalk", label: "钉钉" },
];

export function Alerts({ alerts, servers, onOpenServer }: AlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(alerts[0] ?? null);
  const [diagnosis, setDiagnosis] = useState<AlertDiagnosisReport | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [rules, setRules] = useState<AlertRule[]>([
    { id: "rule-001", name: "CPU 高负载告警", metric: "cpu", threshold: 80, duration: 5, severity: "warning", enabled: true, notificationChannels: ["email", "webhook"] },
    { id: "rule-002", name: "内存不足告警", metric: "memory", threshold: 85, duration: 10, severity: "warning", enabled: true, notificationChannels: ["email"] },
    { id: "rule-003", name: "磁盘空间告警", metric: "disk", threshold: 90, duration: 5, severity: "critical", enabled: true, notificationChannels: ["email", "slack"] },
    { id: "rule-004", name: "系统负载过高", metric: "load", threshold: 4, duration: 15, severity: "critical", enabled: false, notificationChannels: ["webhook"] },
  ]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  useEffect(() => {
    if (!selectedAlert && alerts.length > 0) {
      setSelectedAlert(alerts[0]);
    }
  }, [alerts, selectedAlert]);

  const filtered = alerts.filter((alert) => {
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (searchQuery && !alert.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const openCount = alerts.filter((alert) => alert.status === "open").length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === "acknowledged").length;

  async function diagnose(alert: AlertItem) {
    setSelectedAlert(alert);
    setLoadingDiagnosis(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDiagnosis({
        alertId: alert.id,
        serverId: alert.serverId,
        summary: `检测到 ${servers.find(s => s.id === alert.serverId)?.hostname || '未知服务器'} 发生 ${severityLabel(alert.severity)} 级别告警`,
        impact: "当前服务响应可能出现延迟，建议立即检查",
        timeline: [
          { time: new Date().toISOString(), event: "告警触发" },
          { time: new Date(Date.now() - 300000).toISOString(), event: "指标异常开始" },
          { time: new Date(Date.now() - 600000).toISOString(), event: "正常" },
        ],
        evidence: [
          `CPU 使用率峰值达到 92%`,
          `内存使用率持续在 85% 以上`,
          `负载平均值超过阈值 3 倍`,
        ],
        possibleCauses: [
          "运行中的批处理任务占用大量资源",
          "内存泄漏导致可用内存逐渐减少",
          "磁盘 I/O 瓶颈",
        ],
        repairPlan: [
          "检查并终止高占用进程",
          "清理不必要的缓存和临时文件",
          "考虑扩容或优化应用配置",
          "添加监控告警以便及时发现",
        ],
      });
    } finally {
      setLoadingDiagnosis(false);
    }
  }

  function serverName(serverId: string) {
    return servers.find((server) => server.id === serverId)?.hostname ?? serverId;
  }

  function saveRule(rule: AlertRule) {
    if (editingRule) {
      setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
    } else {
      setRules(prev => [...prev, { ...rule, id: `rule-${Date.now()}` }]);
    }
    setShowRuleModal(false);
    setEditingRule(null);
  }

  function deleteRule(ruleId: string) {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }

  function toggleRule(ruleId: string) {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
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
            <div className="header-actions">
              <button className="secondary-button" onClick={() => setShowRuleModal(true)} type="button">
                <Settings size={16} /> 规则配置
              </button>
            </div>
          </div>
          <div className="search-bar">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="搜索告警..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
            {diagnosis.timeline.map((item, idx) => (
              <div key={idx}>
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

      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>告警规则配置</h3>
              <button className="icon-button" onClick={() => setShowRuleModal(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="rules-list">
                {rules.map((rule) => (
                  <div key={rule.id} className={`rule-item ${rule.enabled ? '' : 'disabled'}`}>
                    <div className="rule-header">
                      <span className={`rule-severity ${rule.severity}`}>
                        {SEVERITY_OPTIONS.find(s => s.value === rule.severity)?.label}
                      </span>
                      <strong>{rule.name}</strong>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="rule-details">
                      <span>{METRIC_OPTIONS.find(m => m.value === rule.metric)?.label} &gt; {rule.threshold}%</span>
                      <span>持续 {rule.duration} 分钟</span>
                      <span>通知: {rule.notificationChannels.join(', ')}</span>
                    </div>
                    <div className="rule-actions">
                      <button className="text-button" onClick={() => { setEditingRule(rule); setShowRuleModal(true); }} type="button">
                        编辑
                      </button>
                      <button className="text-button danger" onClick={() => deleteRule(rule.id)} type="button">
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="secondary-button full-width" onClick={() => { setEditingRule(null); }} type="button">
                <Plus size={16} /> 新建规则
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="list-block">
      <strong>{title}</strong>
      <ul>
        {items.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    </div>
  );
}
