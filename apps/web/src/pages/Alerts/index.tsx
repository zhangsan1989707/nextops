import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  Flame,
  Server,
  ShieldCheck,
  Siren,
  VolumeX,
  Zap,
  ChevronRight,
} from "lucide-react";
import { fetchAlerts, diagnoseAlert, acknowledgeAlert, resolveAlert, escalateAlert, silenceAlert } from "../../api/client";
import type { AlertRecord, DiagnosisReport, AlertStats, AlertGroup } from "../../api/client";
import { useToast } from "../../components/common/Toast";

export type ServerItem = {
  id: string;
  ip: string;
  hostname: string;
  environment: string;
  agentStatus: string;
};

interface AlertsProps {
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

function sourceLabel(s: string): string {
  switch (s) {
    case "server_metrics": return "服务器指标";
    case "logs": return "日志";
    case "agent": return "Agent";
    case "manual": return "手动";
    default: return s;
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#ef4444";
  if (confidence >= 0.6) return "#f59e0b";
  return "#3b82f6";
}

function riskIcon(risk: string) {
  switch (risk) {
    case "high": return <Zap size={14} color="#ef4444" />;
    case "medium": return <AlertTriangle size={14} color="#f59e0b" />;
    default: return <CheckCircle2 size={14} color="#22c55e" />;
  }
}

export function Alerts({ servers, onOpenServer }: AlertsProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisReport | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "groups">("list");
  const toast = useToast();

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const data = await fetchAlerts();
      setAlerts(data.items);
      setStats(data.stats);
      setGroups(data.groups);
      if (!selectedAlert && data.items.length > 0) {
        setSelectedAlert(data.items[0]);
      }
    } catch {
      toast.error("加载告警失败");
    }
  }

  const filtered = alerts.filter((alert) => {
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (searchQuery && !alert.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stormGroups = groups.filter((g) => g.isStorm);

  async function handleDiagnose(alert: AlertRecord) {
    setSelectedAlert(alert);
    setLoadingDiagnosis(true);
    try {
      const report = await diagnoseAlert(alert.id);
      setDiagnosis(report);
      toast.success("AI 诊断完成");
    } catch {
      toast.error("AI 诊断失败");
    } finally {
      setLoadingDiagnosis(false);
    }
  }

  async function handleAcknowledge(alert: AlertRecord) {
    setLoadingAction(alert.id);
    try {
      await acknowledgeAlert(alert.id);
      toast.success("告警已认领");
      await loadAlerts();
    } catch {
      toast.error("操作失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleResolve(alert: AlertRecord) {
    setLoadingAction(alert.id);
    try {
      await resolveAlert(alert.id);
      toast.success("告警已解决");
      await loadAlerts();
    } catch {
      toast.error("操作失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleEscalate(alert: AlertRecord) {
    setLoadingAction(alert.id);
    try {
      await escalateAlert(alert.id);
      toast.success("告警已升级");
      await loadAlerts();
    } catch {
      toast.error("操作失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSilence(alert: AlertRecord) {
    setLoadingAction(alert.id);
    try {
      await silenceAlert(alert.id);
      toast.success("告警已静默");
      await loadAlerts();
    } catch {
      toast.error("操作失败");
    } finally {
      setLoadingAction(null);
    }
  }

  function serverName(serverId: string) {
    return servers.find((s) => s.id === serverId)?.hostname ?? serverId;
  }

  return (
    <section className="alerts-page">
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon amber"><Bell size={20} /></div>
          <span>告警总数</span>
          <strong>{stats?.total ?? alerts.length}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon pink"><Flame size={20} /></div>
          <span>严重告警</span>
          <strong>{stats?.critical ?? 0}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon blue"><Activity size={20} /></div>
          <span>待处理</span>
          <strong>{stats?.open ?? 0}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon green"><ShieldCheck size={20} /></div>
          <span>已解决</span>
          <strong>{stats?.resolved ?? 0}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon orange"><Siren size={20} /></div>
          <span>已升级</span>
          <strong>{stats?.escalated ?? 0}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon purple"><VolumeX size={20} /></div>
          <span>已静默</span>
          <strong>{stats?.silenced ?? 0}</strong>
        </article>
      </div>

      {stormGroups.length > 0 && (
        <article className="panel storm-warning">
          <div className="panel-header">
            <div>
              <p className="eyebrow">告警风暴</p>
              <h2><Flame size={18} /> 检测到 {stormGroups.length} 个告警风暴</h2>
            </div>
          </div>
          <div className="storm-list">
            {stormGroups.map((group) => (
              <div key={group.fingerprint} className="storm-item">
                <span className="storm-count">{group.count}条</span>
                <span className="storm-title">{group.title}</span>
                <span className="storm-server">{serverName(group.alerts[0]?.serverId)}</span>
                <button className="text-button" onClick={() => { setSelectedAlert(group.alerts[0]); setViewMode("list"); }} type="button">
                  查看详情 <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </article>
      )}

      <div className="alerts-layout">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">事件</p>
              <h2>告警列表</h2>
            </div>
            <div className="header-actions">
              <button
                className={`filter-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                type="button"
              >
                列表
              </button>
              <button
                className={`filter-btn ${viewMode === "groups" ? "active" : ""}`}
                onClick={() => setViewMode("groups")}
                type="button"
              >
                聚合视图 {groups.length > 0 && <span className="count">{groups.length}</span>}
              </button>
            </div>
          </div>

          {viewMode === "list" ? (
            <>
              <div className="filter-bar">
                <button className={`filter-btn ${filterSeverity === "all" ? "active" : ""}`} onClick={() => setFilterSeverity("all")} type="button">
                  全部
                </button>
                <button className={`filter-btn ${filterSeverity === "critical" ? "active" : ""}`} onClick={() => setFilterSeverity("critical")} type="button">
                  严重
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
                  待处理
                </button>
                <button className={`filter-btn ${filterStatus === "acknowledged" ? "active" : ""}`} onClick={() => setFilterStatus("acknowledged")} type="button">
                  处理中
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
                  >
                    <div className={`alert-color-bar ${alert.severity}`} />
                    <span className={`severity ${alert.severity}`}>{severityLabel(alert.severity)}</span>
                    <strong>{alert.title}</strong>
                    <small>{serverName(alert.serverId)} · {sourceLabel(alert.source)}</small>
                    <em>{STATUS_LABELS[alert.status] ?? alert.status}</em>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="alert-list">
              {groups.map((group) => (
                <button
                  className="alert-item"
                  key={group.fingerprint}
                  onClick={() => {
                    setViewMode("list");
                    setSelectedAlert(group.alerts[0]);
                  }}
                  type="button"
                >
                  <div className={`alert-color-bar ${group.isStorm ? "critical" : "warning"}`} />
                  {group.isStorm && <span className="severity critical">风暴</span>}
                  <strong>{group.title}</strong>
                  <small>{group.count} 条告警 · {group.severities.join(", ")}</small>
                  <em>{serverName(group.alerts[0]?.serverId)}</em>
                </button>
              ))}
            </div>
          )}
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
                <div><dt>状态</dt><dd>{STATUS_LABELS[selectedAlert.status] ?? selectedAlert.status}</dd></div>
                <div><dt>关联资源</dt><dd>{serverName(selectedAlert.serverId)}</dd></div>
                <div><dt>事件 ID</dt><dd>{selectedAlert.id}</dd></div>
              </dl>
              <div className="detail-actions">
                {selectedAlert.status === "open" && (
                  <>
                    <button className="secondary-button" onClick={() => handleAcknowledge(selectedAlert)} disabled={loadingAction === selectedAlert.id} type="button">
                      <CheckCircle2 size={16} /> 认领
                    </button>
                    <button className="secondary-button" onClick={() => handleEscalate(selectedAlert)} disabled={loadingAction === selectedAlert.id} type="button">
                      <Siren size={16} /> 升级
                    </button>
                    <button className="secondary-button" onClick={() => handleSilence(selectedAlert)} disabled={loadingAction === selectedAlert.id} type="button">
                      <VolumeX size={16} /> 静默
                    </button>
                  </>
                )}
                {(selectedAlert.status === "open" || selectedAlert.status === "acknowledged") && (
                  <button className="secondary-button" onClick={() => handleResolve(selectedAlert)} disabled={loadingAction === selectedAlert.id} type="button">
                    <CheckCircle2 size={16} /> 解决
                  </button>
                )}
                <button className="secondary-button" onClick={() => onOpenServer(selectedAlert.serverId)} type="button">
                  <Server size={16} /> 查看资源
                </button>
                <button
                  className="primary-button"
                  disabled={loadingDiagnosis}
                  onClick={() => handleDiagnose(selectedAlert)}
                  type="button"
                >
                  <Bot size={16} /> {loadingDiagnosis ? "诊断中..." : "AI 诊断"}
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
              <h2>智能诊断报告</h2>
            </div>
            <span className="status">{diagnosis.model.name} · {diagnosis.mode === "model" ? "AI 模型" : "本地规则"}</span>
          </div>

          <div className="diagnosis-hero">
            <p className="diagnosis-summary">{diagnosis.summary}</p>
            <p className="diagnosis-impact">
              <AlertTriangle size={14} /> {diagnosis.impact}
            </p>
          </div>

          {diagnosis.timeline.length > 0 && (
            <div className="diagnosis-section">
              <h4><Clock size={14} /> 时间线</h4>
              <div className="timeline">
                {diagnosis.timeline.map((item, idx) => (
                  <div key={idx} className="timeline-item">
                    <span className="timeline-time">{new Date(item.time).toLocaleTimeString("zh-CN")}</span>
                    <div className="timeline-dot" />
                    <span className="timeline-event">{item.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="diagnosis-section">
            <h4>证据链</h4>
            <div className="evidence-list">
              {diagnosis.evidence.map((ev, idx) => (
                <div key={idx} className={`evidence-item ${ev.weight}`}>
                  <span className="evidence-index">{idx + 1}</span>
                  <div className="evidence-body">
                    <span className="evidence-source">{ev.source}</span>
                    <p>{ev.content}</p>
                  </div>
                  <span className={`evidence-weight ${ev.weight}`}>{ev.weight === "high" ? "高" : ev.weight === "medium" ? "中" : "低"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="diagnosis-section">
            <h4>可能原因</h4>
            <div className="causes-list">
              {diagnosis.possibleCauses.map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <div className="cause-header">
                    <span className="cause-index">#{idx + 1}</span>
                    <span className="cause-text">{cause.cause}</span>
                    <span className="cause-confidence" style={{ color: confidenceColor(cause.confidence) }}>
                      置信度 {(cause.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {cause.evidenceRefs.length > 0 && (
                    <div className="cause-refs">
                      依据: 证据 {cause.evidenceRefs.map((r) => `#${r + 1}`).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="diagnosis-section">
            <h4>修复方案</h4>
            <div className="repair-list">
              {diagnosis.repairPlan.map((rp, idx) => (
                <div key={idx} className="repair-item">
                  <div className="repair-header">
                    <span className="repair-step">步骤 {rp.step}</span>
                    {riskIcon(rp.risk)}
                    <span className="repair-estimate">{rp.estimatedTime}</span>
                  </div>
                  <p className="repair-action">{rp.action}</p>
                  <p className="repair-rollback">回滚: {rp.rollback}</p>
                </div>
              ))}
            </div>
          </div>

          {diagnosis.riskWarnings.length > 0 && (
            <div className="diagnosis-section">
              <h4>风险警告</h4>
              <div className="warnings-list">
                {diagnosis.riskWarnings.map((w, idx) => (
                  <div key={idx} className="warning-item">
                    <AlertTriangle size={14} color="#f59e0b" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {diagnosis.nextObservations.length > 0 && (
            <div className="diagnosis-section">
              <h4>后续观察</h4>
              <div className="observations-list">
                {diagnosis.nextObservations.map((obs, idx) => (
                  <div key={idx} className="observation-item">
                    <Clock size={14} />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {diagnosis.relatedEvents.length > 0 && (
            <div className="diagnosis-section">
              <h4>相似历史事件</h4>
              <div className="related-events">
                {diagnosis.relatedEvents.map((ev, idx) => (
                  <div key={idx} className="related-event-item">
                    <span className="related-title">{ev.title}</span>
                    <span className="related-similarity">相似度 {(ev.similarity * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      )}
    </section>
  );
}

const STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  acknowledged: "处理中",
  escalated: "已升级",
  silenced: "已静默",
  resolved: "已解决",
};

export default Alerts;