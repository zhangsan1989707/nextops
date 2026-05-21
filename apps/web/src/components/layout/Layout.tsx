import { useState } from "react";
import {
  Bell,
  Brain,
  Building2,
  CheckSquare,
  FileCode2,
  FolderOpen,
  LayoutDashboard,
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
}

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/chatops', label: 'AI助手', icon: MessageSquareText },
  { path: '/alerts', label: '告警中心', icon: Bell },
  { path: '/servers', label: '服务器', icon: Server },
  { path: '/scripts', label: '脚本中心', icon: FileCode2 },
  { path: '/commands', label: '命令中心', icon: Terminal },
  { path: '/packages', label: '包管理', icon: Package },
  { path: '/files', label: '文件管理', icon: FolderOpen },
];

const adminItems = [
  { path: '/tenants', label: '租户管理', icon: Building2 },
  { path: '/approvals', label: '审批中心', icon: CheckSquare },
  { path: '/models', label: '模型配置', icon: Brain },
  { path: '/members', label: '成员管理', icon: Users },
  { path: '/teams', label: '团队管理', icon: Users2 },
  { path: '/roles', label: '角色管理', icon: Shield },
];

export function Layout({ children, currentPath, onNavigate }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className={`layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">N</div>
            {!sidebarCollapsed && <span className="logo-text">NextOps</span>}
          </div>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} type="button">
            {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <p className="nav-section">运维操作</p>
          {navItems.map((route) => (
            <button
              key={route.path}
              className={`nav-item ${currentPath === route.path ? "active" : ""}`}
              onClick={() => onNavigate(route.path)}
              type="button"
              title={sidebarCollapsed ? route.label : undefined}
            >
              <route.icon size={18} />
              {!sidebarCollapsed && <span>{route.label}</span>}
            </button>
          ))}
          
          <p className="nav-section">系统管理</p>
          {adminItems.map((route) => (
            <button
              key={route.path}
              className={`nav-item ${currentPath === route.path ? "active" : ""}`}
              onClick={() => onNavigate(route.path)}
              type="button"
              title={sidebarCollapsed ? route.label : undefined}
            >
              <route.icon size={18} />
              {!sidebarCollapsed && <span>{route.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">U</div>
            {!sidebarCollapsed && (
              <div className="user-details">
                <span className="user-name">管理员</span>
                <span className="user-role">系统管理员</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <header className="header">
        <button className="search-toggle" onClick={() => setSearchOpen(!searchOpen)} type="button">
          <Search size={18} />
          <span>搜索...</span>
        </button>
        
        {searchOpen && (
          <div className="header-search">
            <Search size={16} />
            <input type="text" placeholder="搜索资源、命令、告警..." />
            <kbd>/</kbd>
          </div>
        )}

        <div className="header-right">
          <button className="notification-button" type="button">
            <Bell size={18} />
          </button>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
