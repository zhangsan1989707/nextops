import { useState, useMemo } from "react";
import {
  Bell,
  Bot,
  Boxes,
  ChevronRight,
  Clock,
  FileCode2,
  FileText,
  Gauge,
  MessageSquareText,
  Terminal,
} from "lucide-react";
import { LineChart } from "../../components/charts/LineChart";
import { ServerHealth } from "../../components/common/ServerHealth";
import { CopilotDrawer } from "../../components/common/CopilotDrawer";

export type DashboardSummary = {
  servers: { total: number; online: number; warning: number; offline: number };
  alerts: { total: number; critical: number; open: number };
  automation: { slashCommands: number; scripts: number; aiDiagnosesToday: number };
  trends: Array<{ label: string; cpu: number; memory: number; alerts: number }>;
};

export type ServerItem = {
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

import type { Server, Alert } from "../../api";

interface DashboardProps {
  servers: Server[];
  alerts: Alert[];
}

export function Dashboard({ servers, alerts }: DashboardProps) {
  const primaryServer = servers[0];
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  const handleQuickAction = (_action: string) => {};

  const aiStatus = useMemo(() => {
    const onlineServers = servers.filter(s => s.agentStatus === 'online').length;
    const totalServers = servers.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const openAlerts = alerts.filter(a => a.status === 'open').length;
    const avgCpu = servers.length > 0 
      ? Math.round(servers.reduce((sum, s) => sum + s.cpuUsage, 0) / servers.length)
      : 0;
    const highCpuServers = servers.filter(s => s.cpuUsage > 80).length;

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
  }, [servers, alerts]);

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
      event: `完成 0 次自动诊断`,
      action: '系统健康检查完成'
    });
    
    events.push({
      time: new Date(now.getTime() - 30 * 60000).toISOString(),
      type: 'info',
      event: `${aiStatus.onlineServers}/${aiStatus.totalServers} 台服务器在线`,
      action: 'Agent 心跳正常'
    });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [aiStatus]);

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

  const todaySummary = useMemo(() => ({
    serversOnline: `${aiStatus.onlineServers}/${aiStatus.totalServers}`,
    criticalAlerts: aiStatus.criticalAlerts,
    openAlerts: aiStatus.openAlerts,
    aiDiagnoses: 0,
    avgCpu: aiStatus.avgCpu,
    avgMemory: servers.length > 0 
      ? Math.round(servers.reduce((sum, s) => sum + s.memoryUsage, 0) / servers.length)
      : 0,
    agentOnline: aiStatus.onlineServers,
  }), [aiStatus, servers]);

  return (
    <>
      <CopilotDrawer 
        open={copilotOpen} 
        onClose={() => setCopilotOpen(false)}
        message={copilotMessage}
        setMessage={setCopilotMessage}
        loading={copilotLoading}
        onSend={(msg) => {
          handleQuickAction(msg);
        }}
      />

      <div className="content-grid">
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
            <button className="primary-button" onClick={() => handleQuickAction('执行系统巡检')}>
              <Gauge size={16} /> 查看分析
            </button>
            <button className="secondary-button" onClick={() => handleQuickAction('执行巡检')}>
              <Bot size={16} /> 执行巡检
            </button>
            <button className="secondary-button" onClick={() => handleQuickAction('生成今日运维日报')}>
              <FileText size={16} /> 生成日报
            </button>
          </div>
          <button className="copilot-trigger" onClick={() => setCopilotOpen(true)}>
            <MessageSquareText size={18} />
            <span>AI 助手</span>
          </button>
        </section>

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

        <section className="panel wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">实时态势</p>
              <h2>性能趋势</h2>
            </div>
            <div className="trend-header">
              {servers.length > 0 && (
                <>
                  <span className="trend-current cpu">CPU {servers[0].cpuUsage}%</span>
                  <span className="trend-current mem">内存 {servers[0].memoryUsage}%</span>
                </>
              )}
              <button className="text-button" type="button">
                查看监控 <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>暂无趋势数据</div>
        </section>

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
                onClick={() => handleQuickAction(action.action)}
              >
                <action.icon size={20} />
                <span>{action.label}</span>
                {action.priority === 'high' && <span className="priority-badge">紧急</span>}
              </button>
            ))}
          </div>
        </section>

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
                      onClick={() => handleQuickAction(item.action)}
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
