import { Brain, Plus, Search } from "lucide-react";

export function Models() {
  const models = [
    { id: "1", name: "DeepSeek", type: "llm", status: "active", apiKey: "***" },
    { id: "2", name: "Ollama", type: "local", status: "active", apiKey: "-" },
    { id: "3", name: "OpenAI", type: "llm", status: "inactive", apiKey: "***" },
  ];

  return (
    <section className="models-page">
      <div className="page-header">
        <div>
          <h1>模型配置</h1>
          <p>管理 AI 模型配置</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} /> 添加模型
        </button>
      </div>

      <div className="panel">
        <div className="model-grid">
          {models.map(model => (
            <div key={model.id} className={`model-card ${model.status}`}>
              <Brain size={24} />
              <h3>{model.name}</h3>
              <span className="model-type">{model.type.toUpperCase()}</span>
              <span className={`model-status ${model.status}`}>
                {model.status === "active" ? "已启用" : "已禁用"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
