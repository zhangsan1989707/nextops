import { Activity, HardDrive, Server } from "lucide-react";

interface ServerItem {
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
}

interface ServerHealthProps {
  server: ServerItem;
}

export function ServerHealth({ server }: ServerHealthProps) {
  const maxUsage = Math.max(server.cpuUsage, server.memoryUsage, server.diskUsage);
  const severity = maxUsage >= 90 ? "critical" : maxUsage >= 75 ? "warning" : "healthy";
  
  return (
    <article className={`server-health ${severity}`}>
      <div className="server-health-header">
        <div className="server-health-info">
          <Server size={14} />
          <strong>{server.hostname}</strong>
          <span>{server.ip}</span>
        </div>
        <span className={`status-badge ${server.agentStatus}`}>
          {server.agentStatus === 'online' ? '在线' : '离线'}
        </span>
      </div>
      <div className="server-metrics">
        <div className="metric-mini">
          <Activity size={12} />
          <span>CPU</span>
          <strong className={server.cpuUsage > 80 ? 'danger' : ''}>{server.cpuUsage}%</strong>
        </div>
        <div className="metric-mini">
          <HardDrive size={12} />
          <span>内存</span>
          <strong className={server.memoryUsage > 80 ? 'danger' : ''}>{server.memoryUsage}%</strong>
        </div>
        <div className="metric-mini">
          <HardDrive size={12} />
          <span>磁盘</span>
          <strong className={server.diskUsage > 80 ? 'danger' : ''}>{server.diskUsage}%</strong>
        </div>
      </div>
      <div className="server-health-bar">
        <div 
          className={`health-fill ${severity}`} 
          style={{ width: `${maxUsage}%` }}
        />
      </div>
      <div className="server-tags">
        {server.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
        {server.environment && (
          <span className={`env-badge ${server.environment}`}>{server.environment}</span>
        )}
      </div>
    </article>
  );
}
