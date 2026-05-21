import { useState } from "react";
import { Code, FileCode2, Plus, Search, Settings, Terminal } from "lucide-react";

export function Scripts() {
  const [searchQuery, setSearchQuery] = useState("");
  const scripts = [
    { id: "1", name: "backup.sh", description: "数据库备份脚本", tags: ["备份", "定时"], createdAt: "2024-01-15" },
    { id: "2", name: "deploy.sh", description: "应用部署脚本", tags: ["部署", "CI/CD"], createdAt: "2024-01-14" },
    { id: "3", name: "cleanup.sh", description: "日志清理脚本", tags: ["清理", "维护"], createdAt: "2024-01-13" },
  ];

  return (
    <section className="scripts-page">
      <div className="page-header">
        <div>
          <h1>脚本中心</h1>
          <p>管理和执行自动化脚本</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 新建脚本
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="搜索脚本..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="script-grid">
          {scripts.map(script => (
            <div key={script.id} className="script-card">
              <FileCode2 size={24} />
              <h3>{script.name}</h3>
              <p>{script.description}</p>
              <div className="script-tags">
                {script.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <div className="script-actions">
                <button className="text-button" type="button"><Terminal size={14} /> 执行</button>
                <button className="text-button" type="button"><Code size={14} /> 编辑</button>
                <button className="text-button" type="button"><Settings size={14} /> 配置</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
