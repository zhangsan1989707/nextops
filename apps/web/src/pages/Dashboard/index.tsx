import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { fetchDashboard, fetchDashboardFilters } from "../../api/client";
import type { DashboardData, DashboardFilters as DashboardFiltersType } from "../../api/client";
import { useToast } from "../../components/common/Toast";

interface DashboardProps {
  onNavigate?: (path: string) => void;
  onRefresh?: () => void;
}

function severityColor(s: string): string {
  switch (s) {
    case "critical": return "var(--color-critical, #ef4444)";
    case "warning": return "var(--color-warning, #f59e0b)";
    case "info": return "var(--color-info, #3b82f6)";
    default: return "var(--text-muted)";
  }
}

function healthGrade(score: number): { label: string; className: string } {
  if (score >= 90) return { label: "优秀", className: "" };
  if (score >= 70) return { label: "良好", className: "" };
  if (score >= 50) return { label: "一般", className: "" };
  return { label: "需关注", className: "" };
}

export function Dashboard({ onNavigate, onRefresh }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<DashboardFiltersType | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const loadDashboard = useCallback(async (showRefreshToast = false) => {
    try {
      setError(null);
      const result = await fetchDashboard({
        tenant: selectedTenant || undefined,
        environment: selectedEnvironment || undefined,
        team: selectedTeam || undefined,
      });
      setData(result);
      if (showRefreshToast) {
        toast.success("数据已刷新");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
      toast.error(`加载失败: ${message}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTenant, selectedEnvironment, selectedTeam, toast]);

  const loadFilters = useCallback(async () => {
    try {
      const result = await fetchDashboardFilters();
      setFilters(result);
    } catch (err) {
      console.error("Failed to load filters:", err);
    }
  }, []);

  useEffect(() => {
    loadFilters();
    loadDashboard();
    const interval = setInterval(() => loadDashboard(false), 30000);
    return () => clearInterval(interval);
  }, [loadFilters, loadDashboard]);

  useEffect(() => {
    if (loading === false) {
      loadDashboard();
    }
  }, [selectedTenant, selectedEnvironment, selectedTeam]);

  const clearFilters = useCallback(() => {
    setSelectedTenant("");
    setSelectedEnvironment("");
    setSelectedTeam("");
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboard(true);
    onRefresh?.();
  }, [loadDashboard, onRefresh]);

  const handleViewDetails = useCallback(() => {
    toast.info("正在跳转到告警详情...");
    onNavigate?.("/alerts");
  }, [onNavigate, toast]);

  const handleAIDiagnosis = useCallback(() => {
    toast.info("正在跳转到 AI Copilot...");
    onNavigate?.("/chatops");
  }, [onNavigate, toast]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>加载驾驶舱数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-grid">
        <section className="panel error-state-panel">
          <AlertTriangle size={48} style={{ color: "var(--status-critical)", marginBottom: "16px" }} />
          <h2 style={{ marginBottom: "12px" }}>加载失败</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>{error}</p>
          <button className="primary-button" onClick={() => loadDashboard(true)} type="button">
            <RefreshCw size={16} /> 重试
          </button>
        </section>
      </div>
    );
  }

  if (!data) {
    return <div className="table-empty">暂无仪表盘数据</div>;
  }

  const healthScore = data.metrics?.healthScore ?? 0;
  const health = healthGrade(healthScore);
  const criticalAlerts = data.alerts?.critical ?? 0;
  const highRiskServers = data.servers?.highRisk ?? 0;
  const highRiskList = data.servers?.highRiskList ?? [];
  const todayTasks = (data.automation?.scriptsExecuted ?? 0) + (data.automation?.aiDiagnosesToday ?? 0);
  const convergenceRate = data.opsSla?.alertConvergenceRate ?? data.alerts?.alertConvergenceRate ?? 0;
  const avgResponseTime = data.opsSla?.avgResponseTimeMinutes ?? data.metrics?.avgResponseTimeMinutes ?? 0;
  const mttr = data.metrics?.mttrEstimateMinutes ?? 0;
  const aiDiagnoses = data.ai?.aiDiagnosesToday ?? data.automation?.aiDiagnosesToday ?? 0;
  const aiAdoptionRate = data.ai?.aiAdoptionRate ?? 0;
  const timeSaved = data.ai?.estimatedTimeSaved ?? 0;
  const alertTimeline = data.alerts?.alertTimeline ?? [];

  return (
    <div className="content-grid">
      {/* Filter Bar */}
      <div className="dashboard-filter-bar">
        <div className="filter-bar-left">
          <button
            className="filter-toggle-button"
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Filter size={16} />
            筛选
            {(selectedTenant || selectedEnvironment || selectedTeam) && (
              <span className="filter-count">
                {[selectedTenant, selectedEnvironment, selectedTeam].filter(Boolean).length}
              </span>
            )}
          </button>
          {selectedTenant && (
            <span className="filter-chip">
              租户: {selectedTenant}
              <button
                type="button"
                onClick={() => setSelectedTenant("")}
                className="filter-chip-close"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedEnvironment && (
            <span className="filter-chip">
              环境: {selectedEnvironment}
              <button
                type="button"
                onClick={() => setSelectedEnvironment("")}
                className="filter-chip-close"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedTeam && (
            <span className="filter-chip">
              团队: {selectedTeam}
              <button
                type="button"
                onClick={() => setSelectedTeam("")}
                className="filter-chip-close"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {(selectedTenant || selectedEnvironment || selectedTeam) && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              清除全部
            </button>
          )}
        </div>
        <div className="filter-bar-right">
          <button className="secondary-button" type="button" onClick={handleRefresh}>
            <RefreshCw size={16} className={isRefreshing ? "spinning" : ""} /> 刷新
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="filter-panel">
          <div className="filter-section">
            <label className="filter-label">租户</label>
            <select
              className="filter-select"
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
            >
              <option value="">全部</option>
              {filters?.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.name}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-section">
            <label className="filter-label">环境</label>
            <select
              className="filter-select"
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
            >
              <option value="">全部</option>
              {filters?.environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-section">
            <label className="filter-label">团队</label>
            <select
              className="filter-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">全部</option>
              {filters?.teams.map((team) => (
                <option key={team.id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <section className="ai-status-hero">
        <div className="ai-status-badge">
          <div className={`status-indicator ${healthScore >= 70 ? "healthy" : healthScore >= 50 ? "warning" : "critical"}`} />
          <span className="status-label">{health.label}</span>
        </div>
        <div className="ai-status-content">
          <h2>运维驾驶舱</h2>
          <p>系统健康度 {healthScore} 分，{criticalAlerts > 0 ? `存在 ${criticalAlerts} 个严重告警需处理` : "当前运行稳定"}</p>
        </div>
        <div className="ai-actions">
          <button className="primary-button" type="button" onClick={handleViewDetails}>
            <TrendingUp size={16} /> 查看详情
          </button>
          <button className="secondary-button" type="button" onClick={handleAIDiagnosis}>
            <Bot size={16} /> AI 分析
          </button>
        </div>
      </section>

      <div className="metric-grid">
        <article className="metric-card">
          <div className={`metric-icon ${healthScore >= 90 ? "green" : healthScore >= 70 ? "blue" : healthScore >= 50 ? "amber" : "pink"}`}>
            <ShieldCheck size={20} />
          </div>
          <span>健康度分数</span>
          <strong>{healthScore}</strong>
        </article>
        <article className={`metric-card ${criticalAlerts > 0 ? "alert" : ""}`}>
          <div className="metric-icon pink">
            <AlertTriangle size={20} />
          </div>
          <span>严重告警</span>
          <strong>{criticalAlerts}</strong>
        </article>
        <article className={`metric-card ${highRiskServers > 0 ? "alert" : ""}`}>
          <div className="metric-icon amber">
            <Server size={20} />
          </div>
          <span>高风险服务器</span>
          <strong>{highRiskServers}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon blue">
            <Activity size={20} />
          </div>
          <span>今日任务</span>
          <strong>{todayTasks}</strong>
        </article>
      </div>

      {highRiskList.length > 0 && (
        <section className="panel wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">风险</p>
              <h2>高风险服务器</h2>
            </div>
          </div>
          <div className="server-stack">
            {highRiskList.map((server) => (
              <div key={server.id} className="server-health-card">
                <div className="server-health-top">
                  <div className="server-health-status">
                    <div className={`status-indicator ${server.status === "online" ? "warning" : "critical"}`} />
                    <strong>{server.hostname}</strong>
                  </div>
                  <span className={`server-status-badge ${server.status === "online" ? "online" : "offline"}`}>
                    {server.status === "online" ? "在线" : "离线"}
                  </span>
                </div>
                <div className="server-health-metrics">
                  <div className="health-bar-item">
                    <span className="health-bar-label">CPU</span>
                    <div className="health-bar-track">
                      <div
                        className={`health-bar-fill ${server.cpuUsage > 80 ? "critical" : server.cpuUsage > 60 ? "warning" : "ok"}`}
                        style={{ width: `${Math.min(server.cpuUsage, 100)}%` }}
                      />
                    </div>
                    <span className="health-bar-value">{server.cpuUsage}%</span>
                  </div>
                  <div className="health-bar-item">
                    <span className="health-bar-label">内存</span>
                    <div className="health-bar-track">
                      <div
                        className={`health-bar-fill ${server.memoryUsage > 80 ? "critical" : server.memoryUsage > 60 ? "warning" : "ok"}`}
                        style={{ width: `${Math.min(server.memoryUsage, 100)}%` }}
                      />
                    </div>
                    <span className="health-bar-value">{server.memoryUsage}%</span>
                  </div>
                  <div className="health-bar-item">
                    <span className="health-bar-label">磁盘</span>
                    <div className="health-bar-track">
                      <div
                        className={`health-bar-fill ${server.diskUsage > 80 ? "critical" : server.diskUsage > 60 ? "warning" : "ok"}`}
                        style={{ width: `${Math.min(server.diskUsage, 100)}%` }}
                      />
                    </div>
                    <span className="health-bar-value">{server.diskUsage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-two-col">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">效率</p>
              <h2>运维效能</h2>
            </div>
          </div>
          <div className="metric-grid metric-grid-compact">
            <article className="metric-card">
              <div className="metric-icon green">
                <TrendingUp size={20} />
              </div>
              <span>告警收敛率</span>
              <strong>{convergenceRate}%</strong>
            </article>
            <article className="metric-card">
              <div className="metric-icon blue">
                <Clock size={20} />
              </div>
              <span>平均响应</span>
              <strong>{avgResponseTime} min</strong>
            </article>
            <article className="metric-card">
              <div className="metric-icon amber">
                <Zap size={20} />
              </div>
              <span>MTTR 估算</span>
              <strong>{mttr} min</strong>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AI</p>
              <h2>智能化</h2>
            </div>
          </div>
          <div className="metric-grid metric-grid-compact">
            <article className="metric-card">
              <div className="metric-icon blue">
                <Bot size={20} />
              </div>
              <span>AI 诊断次数</span>
              <strong>{aiDiagnoses}</strong>
            </article>
            <article className="metric-card">
              <div className="metric-icon green">
                <Sparkles size={20} />
              </div>
              <span>采纳率</span>
              <strong>{aiAdoptionRate}%</strong>
            </article>
            <article className="metric-card">
              <div className="metric-icon amber">
                <CheckCircle2 size={20} />
              </div>
              <span>节省时间</span>
              <strong>{timeSaved} min</strong>
            </article>
          </div>
        </section>
      </div>

      <section className={`panel wide event-timeline ${criticalAlerts > 0 ? "status-crit" : ""}`}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">操作</p>
            <h2>最近告警时间线</h2>
          </div>
          <span className="timeline-live">
            <span className="live-dot" /> 实时
          </span>
        </div>
        {alertTimeline.length > 0 ? (
          <div className="timeline-list">
            {alertTimeline.map((item, i) => (
              <div key={i} className={`timeline-item ${item.severity}`}>
                <div className="timeline-time">
                  {new Date(item.time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className={`timeline-dot ${item.severity}`} />
                <div className="timeline-content">
                  <strong>{item.title}</strong>
                  <span style={{ color: severityColor(item.severity) }}>
                    {item.severity === "critical" ? "严重" : item.severity === "warning" ? "警告" : "信息"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="timeline-empty">
            暂无告警记录
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;