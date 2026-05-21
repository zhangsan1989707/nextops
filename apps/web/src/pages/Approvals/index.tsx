import { CheckCircle, Clock, Plus, XCircle } from "lucide-react";

export function Approvals() {
  const approvals = [
    { id: "1", type: "部署", description: "部署应用到生产环境", requester: "张三", status: "pending", created: "2024-01-15 10:30" },
    { id: "2", type: "脚本执行", description: "执行数据库清理脚本", requester: "李四", status: "approved", created: "2024-01-15 09:15" },
    { id: "3", type: "权限变更", description: "申请管理员权限", requester: "王五", status: "rejected", created: "2024-01-14 16:45" },
  ];

  return (
    <section className="approvals-page">
      <div className="page-header">
        <div>
          <h1>审批中心</h1>
          <p>管理审批流程</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 发起审批
        </button>
      </div>

      <div className="approval-list">
        {approvals.map(item => (
          <div key={item.id} className={`approval-item ${item.status}`}>
            <div className="approval-icon">
              {item.status === "approved" ? <CheckCircle size={20} /> : item.status === "rejected" ? <XCircle size={20} /> : <Clock size={20} />}
            </div>
            <div className="approval-info">
              <span className="approval-type">{item.type}</span>
              <p>{item.description}</p>
              <span>{item.requester} · {item.created}</span>
            </div>
            {item.status === "pending" && (
              <div className="approval-actions">
                <button className="approve-btn" type="button">批准</button>
                <button className="reject-btn" type="button">拒绝</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
