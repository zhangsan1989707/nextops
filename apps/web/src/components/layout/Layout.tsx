import { useState, useMemo } from "react";
import {
  Bell,
  Brain,
  Building2,
  CheckSquare,
  ChevronDown,
  FileCode2,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  Search,
  Server,
  Shield,
  Terminal,
  Users,
  Users2,
  X,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const navGroups = [
  {
    label: "运维操作",
    items: [
      { path: '/', label: '仪表盘', icon: LayoutDashboard },
      { path: '/chatops', label: 'AI助手', icon: MessageSquareText },
      { path: '/alerts', label: '告警中心', icon: Bell },
      { path: '/servers', label: '服务器', icon: Server },
      { path: '/scripts', label: '脚本中心', icon: FileCode2 },
      { path: '/commands', label: '命令中心', icon: Terminal },
      { path: '/packages', label: '包管理', icon: Package },
      { path: '/files', label: '文件管理', icon: FolderOpen },
    ],
  },
  {
    label: "系统管理",
    items: [
      { path: '/tenants', label: '租户管理', icon: Building2 },
      { path: '/approvals', label: '审批中心', icon: CheckSquare },
      { path: '/models', label: '模型配置', icon: Brain },
      { path: '/members', label: '成员管理', icon: Users },
      { path: '/teams', label: '团队管理', icon: Users2 },
      { path: '/roles', label: '角色管理', icon: Shield },
    ],
  },
];

export function Layout({ children, currentPath, onNavigate, onLogout }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0, 1]));
  const [searchOpen, setSearchOpen] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("nextops_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <strong>NextOps</strong>
              <span>智能运维控制台</span>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            type="button"
          >
            {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        <nav className="nav">
          {navGroups.map((group, gi) => (
            <div className="nav-group" key={group.label}>
              {!sidebarCollapsed && (
                <button
                  className="nav-group-header"
                  onClick={() => toggleGroup(gi)}
                  type="button"
                >
                  {group.label}
                  <ChevronDown
                    size={14}
                    className={`nav-group-chevron ${expandedGroups.has(gi) ? "" : "collapsed"}`}
                  />
                </button>
              )}
              <div className={`nav-group-items ${expandedGroups.has(gi) ? "expanded" : "collapsed"}`}>
                {group.items.map((route) => (
                  <button
                    key={route.path}
                    className={`nav-item ${currentPath === route.path ? "active" : ""}`}
                    onClick={() => onNavigate(route.path)}
                    type="button"
                    title={sidebarCollapsed ? route.label : undefined}
                  >
                    <route.icon size={18} />
                    <span>{route.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--sidebar-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
            <div className="user-avatar">{(user.name || "U").charAt(0)}</div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{user.name || "用户"}</div>
                <div style={{ fontSize: 11, color: "var(--sidebar-text-muted)" }}>{user.role || ""}</div>
              </div>
            )}
            <button className="logout-btn" onClick={onLogout} type="button" title="退出登录">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px", border: "1px solid var(--border-input)",
                borderRadius: "var(--radius-md)", background: "var(--bg-card)",
                cursor: "pointer", color: "var(--text-muted)", fontSize: 13,
              }}
              onClick={() => setSearchOpen(!searchOpen)}
              type="button"
            >
              <Search size={16} />
              <span>搜索...</span>
            </button>
            {searchOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="搜索资源、命令、告警..."
                  style={{
                    padding: "6px 12px 6px 32px", border: "1px solid var(--border-input)",
                    borderRadius: "var(--radius-md)", background: "var(--bg-input)",
                    fontSize: 13, width: 280, outline: "none",
                  }}
                />
              </div>
            )}
          </div>
          <div className="header-actions">
            <button
              style={{
                display: "grid", placeItems: "center", width: 34, height: 34,
                border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
                background: "var(--bg-card)", cursor: "pointer", color: "var(--text-secondary)",
              }}
              type="button"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
