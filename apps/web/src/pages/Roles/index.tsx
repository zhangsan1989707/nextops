import { Plus, Shield } from "lucide-react";

export function Roles() {
  const roles = [
    { id: "1", name: "超级管理员", permissions: ["全部权限"], users: 1 },
    { id: "2", name: "管理员", permissions: ["服务器管理", "告警管理", "脚本管理"], users: 2 },
    { id: "3", name: "运维工程师", permissions: ["服务器查看", "脚本执行"], users: 5 },
    { id: "4", name: "查看用户", permissions: ["查看权限"], users: 10 },
  ];

  return (
    <section className="roles-page">
      <div className="page-header">
        <div>
          <h1>角色管理</h1>
          <p>管理角色和权限</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 创建角色
        </button>
      </div>

      <div className="panel">
        <div className="role-list">
          {roles.map(role => (
            <div key={role.id} className="role-card">
              <Shield size={24} />
              <div className="role-info">
                <h3>{role.name}</h3>
                <div className="role-permissions">
                  {role.permissions.map((perm, i) => (
                    <span key={i} className="perm-tag">{perm}</span>
                  ))}
                </div>
              </div>
              <span className="role-users">{role.users} 用户</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
