import { useState, useEffect, useCallback } from "react";
import { Plus, Search, User, RefreshCw, Clock, FileText, Settings, UserCheck, Shield } from "lucide-react";
import { fetchMembers, fetchAuditLogs } from "../../api/client";
import type { MemberRecord, AuditLogRecord } from "../../api/client";
import { useToast } from "../../components/common/Toast";

export function Members() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "activity">("list");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMembers();
      setMembers(data.items);
    } catch {
      toast.error("加载成员数据失败");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await fetchAuditLogs(50);
      setAuditLogs(data.items);
    } catch {
      toast.error("加载操作记录失败");
    } finally {
      setAuditLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    loadAuditLogs();
  }, [loadData, loadAuditLogs]);

  const handleRefresh = useCallback(() => {
    if (activeTab === "list") {
      loadData();
    } else {
      loadAuditLogs();
    }
  }, [activeTab, loadData, loadAuditLogs]);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionIcon = (action: string) => {
    if (action.includes("login") || action.includes("登录")) return <User size={14} />;
    if (action.includes("script") || action.includes("脚本")) return <FileText size={14} />;
    if (action.includes("server") || action.includes("服务器")) return <Settings size={14} />;
    if (action.includes("member") || action.includes("成员")) return <UserCheck size={14} />;
    if (action.includes("role") || action.includes("权限")) return <Shield size={14} />;
    return <Clock size={14} />;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes("create") || action.includes("创建")) return "badge-create";
    if (action.includes("update") || action.includes("修改")) return "badge-update";
    if (action.includes("delete") || action.includes("删除")) return "badge-delete";
    if (action.includes("login") || action.includes("登录")) return "badge-login";
    return "badge-default";
  };

  return (
    <section className="members-page">
      <div className="page-header">
        <div>
          <h1>成员管理</h1>
          <p>管理团队成员和查看操作记录</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 邀请成员
        </button>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "list" ? "active" : ""}`}
            onClick={() => setActiveTab("list")}
            type="button"
          >
            <User size={16} />
            成员列表
            <span className="tab-count">{members.length}</span>
          </button>
          <button
            className={`tab-button ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
            type="button"
          >
            <Clock size={16} />
            操作记录
            <span className="tab-count">{auditLogs.length}</span>
          </button>
        </div>
        <button className="secondary-button refresh-btn" onClick={handleRefresh} disabled={loading || auditLoading} type="button">
          <RefreshCw size={16} className={(loading || auditLoading) ? "spinning" : ""} />
        </button>
      </div>

      {activeTab === "list" && (
        <>
          <div className="panel">
            <div className="panel-header">
              <div className="search-bar">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="搜索成员..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <RefreshCw size={24} className="spinning" />
                <span>加载中...</span>
              </div>
            ) : (
              <div className="member-table">
                <table>
                  <thead>
                    <tr>
                      <th>成员</th>
                      <th>邮箱</th>
                      <th>角色</th>
                      <th>团队</th>
                      <th>状态</th>
                      <th>最后活跃</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(member => (
                      <tr key={member.id}>
                        <td>
                          <div className="member-info">
                            <div className="member-avatar">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="member-name">{member.name}</span>
                          </div>
                        </td>
                        <td className="email-cell">{member.email}</td>
                        <td><span className="role-tag">{member.role}</span></td>
                        <td><span className="team-tag">{member.team}</span></td>
                        <td>
                          <span className={`status-tag ${member.status}`}>
                            {member.status === "active" ? "活跃" : member.status === "pending" ? "待激活" : "禁用"}
                          </span>
                        </td>
                        <td className="last-seen">
                          {member.lastSeenAt ? formatTime(member.lastSeenAt) : "从未登录"}
                        </td>
                        <td>
                          <button className="table-btn" onClick={() => setSelectedMember(member)} type="button">
                            <Settings size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMembers.length === 0 && (
                  <div className="table-empty">
                    {searchQuery ? "未找到匹配的成员" : "暂无成员数据"}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "activity" && (
        <div className="panel activity-panel">
          <div className="activity-header">
            <h3>操作历史</h3>
            <span className="activity-count">{auditLogs.length} 条记录</span>
          </div>

          {auditLoading ? (
            <div className="loading-state">
              <RefreshCw size={24} className="spinning" />
              <span>加载中...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="empty-activity">
              <Clock size={48} />
              <p>暂无操作记录</p>
              <span>成员的操作将在此显示</span>
            </div>
          ) : (
            <div className="activity-list">
              {auditLogs.map(log => (
                <div key={log.id} className="activity-item">
                  <div className="activity-icon">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-main">
                      <span className={`activity-badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="activity-actor">{log.actor}</span>
                      <span className="activity-target">
                        {log.resourceType}: {log.resourceId}
                      </span>
                    </div>
                    <div className="activity-summary">{log.summary}</div>
                  </div>
                  <div className="activity-time">
                    {formatTime(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal member-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <User size={18} />
                <span>{selectedMember.name}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedMember(null)} type="button">×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>基本信息</h4>
                <div className="detail-grid">
                  <div>
                    <dt>邮箱</dt>
                    <dd>{selectedMember.email}</dd>
                  </div>
                  <div>
                    <dt>角色</dt>
                    <dd>{selectedMember.role}</dd>
                  </div>
                  <div>
                    <dt>团队</dt>
                    <dd>{selectedMember.team}</dd>
                  </div>
                  <div>
                    <dt>状态</dt>
                    <dd>
                      <span className={`status-tag ${selectedMember.status}`}>
                        {selectedMember.status === "active" ? "活跃" : selectedMember.status === "pending" ? "待激活" : "禁用"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>最后活跃</dt>
                    <dd>{selectedMember.lastSeenAt ? formatTime(selectedMember.lastSeenAt) : "从未登录"}</dd>
                  </div>
                </div>
              </div>

              {selectedMember.permissions && selectedMember.permissions.length > 0 && (
                <div className="detail-section">
                  <h4>权限列表</h4>
                  <div className="permissions-grid">
                    {selectedMember.permissions.map(perm => (
                      <span key={perm} className="permission-tag">{perm}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="member-actions">
                <button className="secondary-button" type="button">
                  <Shield size={16} /> 修改角色
                </button>
                <button className="secondary-button" type="button">
                  <UserCheck size={16} /> {selectedMember.status === "active" ? "禁用账号" : "启用账号"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
