import { useState } from "react";
import { ArrowRight, Command, Plus, Search } from "lucide-react";

export function Commands() {
  const [searchQuery, setSearchQuery] = useState("");
  const commands = [
    { id: "1", name: "/deploy", description: "部署应用", usage: "/deploy <app> <env>", category: "部署" },
    { id: "2", name: "/ssh", description: "SSH 连接", usage: "/ssh <server>", category: "远程" },
    { id: "3", name: "/check", description: "健康检查", usage: "/check [server]", category: "监控" },
    { id: "4", name: "/logs", description: "查看日志", usage: "/logs <server> [lines]", category: "日志" },
    { id: "5", name: "/restart", description: "重启服务", usage: "/restart <service>", category: "运维" },
    { id: "6", name: "/rollback", description: "回滚版本", usage: "/rollback <app>", category: "部署" },
  ];

  const categories = [...new Set(commands.map(c => c.category))];

  return (
    <section className="commands-page">
      <div className="page-header">
        <div>
          <h1>命令中心</h1>
          <p>管理快捷命令和操作</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 添加命令
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="搜索命令..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="command-list">
          {categories.map(category => (
            <div key={category} className="command-section">
              <h3>{category}</h3>
              {commands.filter(c => c.category === category).map(cmd => (
                <div key={cmd.id} className="command-item">
                  <Command size={16} />
                  <div className="command-info">
                    <code>{cmd.name}</code>
                    <span>{cmd.description}</span>
                  </div>
                  <code className="command-usage">{cmd.usage}</code>
                  <button className="text-button" type="button">
                    使用 <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
