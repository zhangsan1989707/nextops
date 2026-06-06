import { useState, useCallback, useEffect } from "react";
import {
  Activity,
  Cloud,
  Filter,
  HardDrive,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Server as ServerType } from "../../api";
import { useToast } from "../../components/common/Toast";
import { fetchServer, type ServerDetail } from "../../api/client";
import { LineChart } from "../../components/charts/LineChart";

interface ServersProps {
  servers: ServerType[];
  onRefresh?: () => void;
}

// Feature Flag: 启用服务器详情页图表优化
const ENABLE_SERVER_DETAIL_CHARTS = import.meta.env.VITE_ENABLE_SERVER_DETAIL_CHARTS !== 'false';

export function Servers({ servers, onRefresh }: ServersProps) {
  const [filterEnv, setFilterEnv] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServer, setSelectedServer] = useState<ServerType | null>(null);
  const [serverDetail, setServerDetail] = useState<ServerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    toast.info("正在刷新服务器列表...");
    onRefresh?.();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("服务器列表已刷新");
    }, 500);
  }, [onRefresh, toast]);

  const handleSelectServer = useCallback(async (server: ServerType) => {
    setSelectedServer(server);
    if (ENABLE_SERVER_DETAIL_CHARTS) {
      setLoadingDetail(true);
      try {
        const detail = await fetchServer(server.id);
        setServerDetail(detail);
      } catch (err) {
        console.error('Failed to load server detail:', err);
        toast.error('加载服务器详情失败');
      } finally {
        setLoadingDetail(false);
      }
    }
  }, [toast]);

  const environments = [...new Set(servers.map(s => s.environment))];
  const filtered = servers.filter(server => {
    if (filterEnv !== "all" && server.environment !== filterEnv) return false;
    if (filterStatus !== "all" && server.agentStatus !== filterStatus) return false;
    if (searchQuery && !server.hostname.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const onlineCount = servers.filter(s => s.agentStatus === "online").length;
  const totalCpu = servers.reduce((sum, s) => sum + s.cpuUsage, 0) / servers.length || 0;
  const totalMemory = servers.reduce((sum, s) => sum + s.memoryUsage, 0) / servers.length || 0;

  return (
    <section className="servers-page">
      <div className="page-header">
        <div>
          <h1>服务器管理</h1>
          <p>管理和监控所有服务器资源</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" type="button" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? "spinning" : ""} /> 刷新
          </button>
          <button className="primary-button" type="button">
            <Plus size={16} /> 添加服务器
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <Server size={20} />
          <span>总服务器</span>
          <strong>{servers.length}</strong>
        </div>
        <div className="stat-card">
          <Activity size={20} />
          <span>在线</span>
          <strong>{onlineCount}</strong>
        </div>
        <div className="stat-card">
          <Zap size={20} />
          <span>平均 CPU</span>
          <strong>{totalCpu.toFixed(1)}%</strong>
        </div>
        <div className="stat-card">
          <HardDrive size={20} />
          <span>平均内存</span>
          <strong>{totalMemory.toFixed(1)}%</strong>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="搜索服务器..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="filter-row">
            <Filter size={14} />
            <select value={filterEnv} onChange={(e) => setFilterEnv(e.target.value)}>
              <option value="all">所有环境</option>
              {environments.map(env => <option key={env} value={env}>{env}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">所有状态</option>
              <option value="online">在线</option>
              <option value="offline">离线</option>
            </select>
          </div>
        </div>

        <div className="server-table">
          <table>
            <thead>
              <tr>
                <th>服务器</th>
                <th>环境</th>
                <th>状态</th>
                <th>CPU</th>
                <th>内存</th>
                <th>磁盘</th>
                <th>负载</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(server => (
                <tr key={server.id} className={server.agentStatus === "online" ? "" : "offline"}>
                  <td>
                    <div className="server-info">
                      <Server size={14} />
                      <div>
                        <strong>{server.hostname}</strong>
                        <span>{server.ip}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`env-tag ${server.environment}`}>{server.environment}</span></td>
                  <td>
                    <span className={`status-tag ${server.agentStatus}`}>
                      {server.agentStatus === "online" ? "在线" : "离线"}
                    </span>
                  </td>
                  <td>
                    <div className="progress-mini">
                      <div className="progress-fill" style={{ width: `${server.cpuUsage}%`, background: server.cpuUsage > 80 ? "#ef4444" : "#10b981" }} />
                      <span>{server.cpuUsage}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="progress-mini">
                      <div className="progress-fill" style={{ width: `${server.memoryUsage}%`, background: server.memoryUsage > 80 ? "#ef4444" : "#3b82f6" }} />
                      <span>{server.memoryUsage}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="progress-mini">
                      <div className="progress-fill" style={{ width: `${server.diskUsage}%`, background: server.diskUsage > 80 ? "#ef4444" : "#8b5cf6" }} />
                      <span>{server.diskUsage}%</span>
                    </div>
                  </td>
                  <td>{server.loadAvg.toFixed(2)}</td>
                  <td>
                    <button className="table-btn" onClick={() => handleSelectServer(server)} type="button">
                      <Settings size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="table-empty">暂无服务器数据</div>
          )}
        </div>
      </div>

      {selectedServer && (
        <div className="modal-overlay" onClick={() => { setSelectedServer(null); setServerDetail(null); }}>
          <div className="modal server-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <Server size={18} />
                <span>{selectedServer.hostname}</span>
              </div>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div>
                  <dt>IP 地址</dt>
                  <dd>{selectedServer.ip}</dd>
                </div>
                <div>
                  <dt>端口</dt>
                  <dd>{selectedServer.port}</dd>
                </div>
                <div>
                  <dt>操作系统</dt>
                  <dd>{selectedServer.os}</dd>
                </div>
                <div>
                  <dt>环境</dt>
                  <dd>{selectedServer.environment}</dd>
                </div>
                <div>
                  <dt>类型</dt>
                  <dd>{selectedServer.type}</dd>
                </div>
                <div>
                  <dt>标签</dt>
                  <dd>{selectedServer.tags.join(", ")}</dd>
                </div>
              </div>

              {ENABLE_SERVER_DETAIL_CHARTS && (
                <div className="charts-section">
                  <h4>指标趋势图</h4>
                  {loadingDetail ? (
                    <div className="loading-container">
                      <div className="loading-spinner" />
                      <span>加载指标数据中...</span>
                    </div>
                  ) : serverDetail && serverDetail.realtime.length > 0 ? (
                    <LineChart data={serverDetail.realtime} />
                  ) : (
                    <div className="table-empty">暂无指标数据</div>
                  )}
                </div>
              )}

              <div className="metrics-section">
                <h4>实时指标</h4>
                <div className="metric-item">
                  <Activity size={16} />
                  <span>CPU</span>
                  <div className="progress-bar">
                    <div style={{ width: `${selectedServer.cpuUsage}%` }} />
                  </div>
                  <span>{selectedServer.cpuUsage}%</span>
                </div>
                <div className="metric-item">
                  <HardDrive size={16} />
                  <span>内存</span>
                  <div className="progress-bar">
                    <div style={{ width: `${selectedServer.memoryUsage}%` }} />
                  </div>
                  <span>{selectedServer.memoryUsage}%</span>
                </div>
                <div className="metric-item">
                  <Cloud size={16} />
                  <span>磁盘</span>
                  <div className="progress-bar">
                    <div style={{ width: `${selectedServer.diskUsage}%` }} />
                  </div>
                  <span>{selectedServer.diskUsage}%</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-button" onClick={() => { setSelectedServer(null); setServerDetail(null); }} type="button">关闭</button>
              <button className="primary-button" type="button">
                <TrendingUp size={16} /> 查看监控
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
