import { Plus, Search, User } from "lucide-react";

export function Members() {
  const members = [
    { id: "1", name: "张三", email: "zhang@example.com", role: "管理员", status: "active" },
    { id: "2", name: "李四", email: "li@example.com", role: "运维工程师", status: "active" },
    { id: "3", name: "王五", email: "wang@example.com", role: "开发工程师", status: "inactive" },
  ];

  return (
    <section className="members-page">
      <div className="page-header">
        <div>
          <h1>成员管理</h1>
          <p>管理团队成员</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 邀请成员
        </button>
      </div>

      <div className="panel">
        <div className="member-table">
          <table>
            <thead>
              <tr>
                <th>成员</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td>
                    <User size={18} />
                    <span>{member.name}</span>
                  </td>
                  <td>{member.email}</td>
                  <td><span className="role-tag">{member.role}</span></td>
                  <td><span className={`status-tag ${member.status}`}>{member.status === "active" ? "活跃" : "非活跃"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
