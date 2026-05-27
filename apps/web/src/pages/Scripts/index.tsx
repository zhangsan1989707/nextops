import { useState, useEffect, useRef } from "react";
import { Code, FileCode2, Plus, Search, Settings, Terminal, X, CheckCircle2 } from "lucide-react";

interface Script {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  content: string;
  targetServers: string[];
}

export function Scripts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewScript, setPreviewScript] = useState<Script | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scripts: Script[] = [
    { 
      id: "1", 
      name: "backup.sh", 
      description: "数据库备份脚本", 
      tags: ["备份", "定时"], 
      createdAt: "2024-01-15",
      content: "#!/bin/bash\n# 数据库备份脚本\necho \"开始备份数据库...\nmysqldump -u root -p123456 mydb > backup_$(date +%Y%m%d).sql\necho \"备份完成！\"",
      targetServers: ["db-prod-01", "db-prod-02"]
    },
    { 
      id: "2", 
      name: "deploy.sh", 
      description: "应用部署脚本", 
      tags: ["部署", "CI/CD"], 
      createdAt: "2024-01-14",
      content: "#!/bin/bash\n# 应用部署脚本\necho \"开始部署应用...\ncd /var/www/myapp\ngit pull origin main\nnpm install\npm run build\nsystemctl restart myapp\necho \"部署完成！\"",
      targetServers: ["web-prod-01", "web-prod-02"]
    },
    { 
      id: "3", 
      name: "cleanup.sh", 
      description: "日志清理脚本", 
      tags: ["清理", "维护"], 
      createdAt: "2024-01-13",
      content: "#!/bin/bash\n# 日志清理脚本\necho \"开始清理旧日志...\nfind /var/log -type f -mtime +30 -delete\necho \"清理完成！释放了磁盘空间",
      targetServers: ["all"]
    },
  ];

  const filteredScripts = scripts.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExecuteClick = (script: Script) => {
    setPreviewScript(script);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleConfirmExecute = async () => {
    if (!previewScript) return;
    
    setIsExecuting(true);
    // 模拟执行
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsExecuting(false);
    setShowSuccess(true);
    
    // 3秒后关闭成功提示并重置
    timeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
      setPreviewScript(null);
      timeoutRef.current = null;
    }, 3000);
  };

  const handleClosePreview = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowSuccess(false);
    setPreviewScript(null);
  };

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
          {filteredScripts.map(script => (
            <div key={script.id} className="script-card">
              <FileCode2 size={24} />
              <h3>{script.name}</h3>
              <p>{script.description}</p>
              <div className="script-tags">
                {script.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <div className="script-actions">
                <button 
                  className="text-button" 
                  type="button" 
                  onClick={() => handleExecuteClick(script)}
                >
                  <Terminal size={14} /> 执行
                </button>
                <button className="text-button" type="button"><Code size={14} /> 编辑</button>
                <button className="text-button" type="button"><Settings size={14} /> 配置</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 脚本执行预览模态框 */}
      {previewScript && (
        <div className="script-preview-overlay">
          <div className="script-preview-modal">
            <div className="script-preview-header">
              <h3>执行脚本确认</h3>
              <button 
                className="chat-icon-btn" 
                type="button" 
                onClick={handleClosePreview}
                disabled={isExecuting}
              >
                <X size={16} />
              </button>
            </div>
            
            {showSuccess ? (
              <div className="script-preview-success">
                <CheckCircle2 size={48} className="success-icon" />
                <h4>执行成功！</h4>
                <p>脚本 {previewScript.name} 已成功执行</p>
              </div>
            ) : (
              <>
                <div className="script-preview-info">
                  <div className="script-preview-section">
                    <span className="script-preview-label">脚本名称</span>
                    <span className="script-preview-value">{previewScript.name}</span>
                  </div>
                  <div className="script-preview-section">
                    <span className="script-preview-label">目标服务器</span>
                    <div className="script-preview-servers">
                      {previewScript.targetServers.map((server, idx) => (
                        <span key={idx} className="tag">{server}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="script-preview-content">
                  <div className="script-preview-label">脚本内容</div>
                  <pre className="script-preview-code">{previewScript.content}</pre>
                </div>

                <div className="script-preview-warning">
                  <span className="warning-text">⚠️ 请确认脚本内容无误后再执行</span>
                </div>

                <div className="script-preview-actions">
                  <button 
                    className="secondary-button" 
                    type="button" 
                    onClick={handleClosePreview}
                    disabled={isExecuting}
                  >
                    取消
                  </button>
                  <button 
                    className="primary-button" 
                    type="button" 
                    onClick={handleConfirmExecute}
                    disabled={isExecuting}
                  >
                    {isExecuting ? (
                      <>
                        <div className="loading-spinner-small" />
                        执行中...
                      </>
                    ) : (
                      <>
                        <Terminal size={14} />
                        确认执行
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
