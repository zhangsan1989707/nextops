import { Plus, Users } from "lucide-react";

export function Teams() {
  const teams = [
    { id: "1", name: "运维团队", description: "负责系统运维", members: 5 },
    { id: "2", name: "研发团队", description: "负责开发工作", members: 12 },
    { id: "3", name: "测试团队", description: "负责质量保证", members: 3 },
  ];

  return (
    <section className="teams-page">
      <div className="page-header">
        <div>
          <h1>团队管理</h1>
          <p>管理团队和权限</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 创建团队
        </button>
      </div>

      <div className="panel">
        <div className="team-grid">
          {teams.map(team => (
            <div key={team.id} className="team-card">
              <Users size={24} />
              <h3>{team.name}</h3>
              <p>{team.description}</p>
              <span>{team.members} 成员</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
