export interface RouteConfig {
  path: string;
  label: string;
  icon: string;
  component: string;
}

export const routes: RouteConfig[] = [
  { path: '/', label: '仪表盘', icon: 'LayoutDashboard', component: 'Dashboard' },
  { path: '/chatops', label: 'AI助手', icon: 'MessageSquareText', component: 'ChatOps' },
  { path: '/alerts', label: '告警中心', icon: 'Bell', component: 'Alerts' },
  { path: '/servers', label: '服务器', icon: 'Server', component: 'Servers' },
  { path: '/scripts', label: '脚本中心', icon: 'FileCode2', component: 'Scripts' },
  { path: '/commands', label: '命令中心', icon: 'Terminal', component: 'Commands' },
  { path: '/packages', label: '包管理', icon: 'Package', component: 'Packages' },
  { path: '/files', label: '文件管理', icon: 'FolderOpen', component: 'Files' },
];

export const adminRoutes: RouteConfig[] = [
  { path: '/tenants', label: '租户管理', icon: 'Building2', component: 'Tenants' },
  { path: '/approvals', label: '审批中心', icon: 'CheckSquare', component: 'Approvals' },
  { path: '/models', label: '模型配置', icon: 'Brain', component: 'Models' },
  { path: '/members', label: '成员管理', icon: 'Users', component: 'Members' },
  { path: '/teams', label: '团队管理', icon: 'Users2', component: 'Teams' },
  { path: '/roles', label: '角色管理', icon: 'Shield', component: 'Roles' },
];

export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return [...routes, ...adminRoutes].find(r => r.path === path);
};
