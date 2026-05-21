import { useState } from "react";
import { Package, Plus, Search, Settings } from "lucide-react";

export function Packages() {
  const [searchQuery, setSearchQuery] = useState("");
  const packages = [
    { id: "1", name: "nginx", version: "1.24.0", description: "Web 服务器", type: "deb", createdAt: "2024-01-15" },
    { id: "2", name: "redis", version: "7.2.3", description: "缓存服务", type: "deb", createdAt: "2024-01-14" },
    { id: "3", name: "mysql", version: "8.0.35", description: "数据库", type: "deb", createdAt: "2024-01-13" },
  ];

  return (
    <section className="packages-page">
      <div className="page-header">
        <div>
          <h1>包管理</h1>
          <p>管理软件包和依赖</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 上传包
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="搜索包..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="package-table">
          <table>
            <thead>
              <tr>
                <th>包名</th>
                <th>版本</th>
                <th>类型</th>
                <th>描述</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.id}>
                  <td>
                    <Package size={16} />
                    <span>{pkg.name}</span>
                  </td>
                  <td>{pkg.version}</td>
                  <td><span className="type-tag">{pkg.type}</span></td>
                  <td>{pkg.description}</td>
                  <td>{pkg.createdAt}</td>
                  <td>
                    <button className="table-btn" type="button"><Settings size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
