import { useState } from "react";
import { File, Folder, FolderOpen, Plus, Search } from "lucide-react";

export function Files() {
  const [searchQuery, setSearchQuery] = useState("");
  const files = [
    { id: "1", name: "config", type: "folder", size: "-", modified: "2024-01-15" },
    { id: "2", name: "logs", type: "folder", size: "-", modified: "2024-01-15" },
    { id: "3", name: "backup.tar.gz", type: "file", size: "156 MB", modified: "2024-01-14" },
    { id: "4", name: "deploy.sh", type: "file", size: "2 KB", modified: "2024-01-13" },
  ];

  return (
    <section className="files-page">
      <div className="page-header">
        <div>
          <h1>文件管理</h1>
          <p>管理服务器文件</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 上传文件
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="搜索文件..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="file-grid">
          {files.map(item => (
            <div key={item.id} className="file-card">
              {item.type === "folder" ? <FolderOpen size={32} /> : <File size={32} />}
              <span>{item.name}</span>
              <span className="file-meta">{item.size} · {item.modified}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
