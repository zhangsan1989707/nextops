import { Building2, Plus, Search, Users } from "lucide-react";

export function Tenants() {
  const tenants = [
    { id: "1", name: "默认租户", description: "系统默认租户", members: 5, status: "active" },
    { id: "2", name: "研发部", description: "研发部门租户", members: 12, status: "active" },
    { id: "3", name: "运维部", description: "运维部门租户", members: 8, status: "active" },
  ];

  return (
    <section className="tenants-page">
      <div className="page-header">
        <div>
          <h1>租户管理</h1>
          <p>管理多租户资源</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 创建租户
        </button>
      </div>

      <div className="panel">
        <div className="tenant-grid">
          {tenants.map(tenant => (
            <div key={tenant.id} className="tenant-card">
              <Building2 size={24} />
              <h3>{tenant.name}</h3>
              <p>{tenant.description}</p>
              <div className="tenant-meta">
                <Users size={14} />
                <span>{tenant.members} 成员</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
