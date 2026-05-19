import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  Circle,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ModelItem = {
  id: string;
  name: string;
  provider: string;
  type: string;
  status: string;
  isDefault: boolean;
  contextWindow: string;
  latencyMs: number;
  costLevel: string;
  capabilities: string[];
  endpoint: string;
  apiKeyConfigured: boolean;
};

type ModelSummary = {
  items: ModelItem[];
  totals: {
    models: number;
    enabled: number;
    chat: number;
    embedding: number;
  };
};

type ModelDraft = {
  name: string;
  id: string;
  provider: string;
  type: string;
  endpoint: string;
  apiKey: string;
  contextWindow: string;
  costLevel: string;
  setDefault: boolean;
};

type ModelTestResult = {
  modelId: string;
  ok: boolean;
  status: string;
  latencyMs: number;
  checkedAt: string;
  checks: string[];
  warnings: string[];
};

// 供应商配置
const PROVIDER_CONFIG: Record<string, { color: string; icon: string }> = {
  "Zhipu AI (智谱)": { color: "#4F46E5", icon: "Z" },
  "Zhipu AI": { color: "#4F46E5", icon: "Z" },
  "OpenAI": { color: "#10A37F", icon: "O" },
  "OpenAI Compatible": { color: "#10A37F", icon: "O" },
  "Deepseek": { color: "#0066FF", icon: "D" },
  "Anthropic": { color: "#D97706", icon: "A" },
  "Local": { color: "#059669", icon: "L" },
  "Google": { color: "#4285F4", icon: "G" },
  "Azure": { color: "#0078D4", icon: "M" },
};

function getProviderConfig(provider: string) {
  return PROVIDER_CONFIG[provider] || { color: "#6B7280", icon: provider[0]?.toUpperCase() || "?" };
}

function getCostColor(costLevel: string) {
  switch (costLevel) {
    case "low": return { bg: "#DCFCE7", text: "#166534", label: "低成本" };
    case "medium": return { bg: "#FEF3C7", text: "#92400E", label: "中等成本" };
    case "high": return { bg: "#FEE2E2", text: "#991B1B", label: "高成本" };
    default: return { bg: "#F3F4F6", text: "#374151", label: costLevel };
  }
}

function getStatusConfig(status: string, isDefault: boolean) {
  if (isDefault) return { color: "#10A37F", bg: "#DCFCE7", label: "默认", icon: CheckCircle2 };
  if (status === "enabled") return { color: "#10A37F", bg: "#DCFCE7", label: "在线", icon: Circle };
  return { color: "#6B7280", bg: "#F3F4F6", label: "离线", icon: Circle };
}

function formatContextWindow(window: string) {
  if (window.includes("k")) return window.toUpperCase();
  if (window.includes("m") || window.includes("M")) return window.toUpperCase();
  return window;
}

function formatLatency(ms: number) {
  if (ms < 100) return `${ms}ms ⚡`;
  if (ms < 500) return `${ms}ms`;
  return `${ms}ms 🐢`;
}

// API helpers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("nextops_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

// 模型模板
const MODEL_TEMPLATES: Record<string, ModelDraft> = {
  "zhipu": {
    name: "智谱 GLM-4",
    id: "glm-4",
    provider: "Zhipu AI (智谱)",
    type: "chat",
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: "",
    contextWindow: "128k",
    costLevel: "low",
    setDefault: false
  },
  "deepseek": {
    name: "Deepseek V3",
    id: "deepseek-v3",
    provider: "Deepseek",
    type: "chat",
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "",
    contextWindow: "64k",
    costLevel: "low",
    setDefault: false
  },
  "openai": {
    name: "GPT-4o",
    id: "gpt-4o",
    provider: "OpenAI",
    type: "chat",
    endpoint: "https://api.openai.com/v1",
    apiKey: "",
    contextWindow: "128k",
    costLevel: "high",
    setDefault: false
  },
  "local": {
    name: "本地 Ollama",
    id: "local-ollama",
    provider: "Local",
    type: "chat",
    endpoint: "http://localhost:11434/v1",
    apiKey: "",
    contextWindow: "32k",
    costLevel: "low",
    setDefault: false
  },
  "azure": {
    name: "Azure OpenAI",
    id: "azure-gpt-4",
    provider: "Azure",
    type: "chat",
    endpoint: "https://YOUR_RESOURCE.openai.azure.com",
    apiKey: "",
    contextWindow: "128k",
    costLevel: "high",
    setDefault: false
  },
};

interface ModelsProps {
  summary: ModelSummary | null;
}

export default function Models({ summary }: ModelsProps) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [modelDraft, setModelDraft] = useState<ModelDraft>({
    name: "",
    id: "",
    provider: "Zhipu AI (智谱)",
    type: "chat",
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: "",
    contextWindow: "128k",
    costLevel: "low",
    setDefault: false
  });

  useEffect(() => {
    const items = summary?.items ?? [];
    setModels(items);
    if (items.length > 0 && !selectedModel) {
      setSelectedModel(items[0]);
    }
  }, [summary]);

  // 获取所有供应商
  const providers = useMemo(() => {
    const set = new Set(models.map(m => m.provider));
    return Array.from(set);
  }, [models]);

  // 筛选后的模型
  const filteredModels = useMemo(() => {
    return models.filter(model => {
      const matchesSearch = searchQuery === "" ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = filterProvider === "all" || model.provider === filterProvider;
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "enabled" && model.status === "enabled") ||
        (filterStatus === "disabled" && model.status !== "enabled") ||
        (filterStatus === "default" && model.isDefault);
      return matchesSearch && matchesProvider && matchesStatus;
    });
  }, [models, searchQuery, filterProvider, filterStatus]);

  // 按供应商分组
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelItem[]> = {};
    filteredModels.forEach(model => {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    });
    return groups;
  }, [filteredModels]);

  const totals = useMemo(() => ({
    models: models.length,
    enabled: models.filter(m => m.status === "enabled").length,
    chat: models.filter(m => m.type === "chat").length,
    embedding: models.filter(m => m.type === "embedding").length,
    default: models.filter(m => m.isDefault).length,
  }), [models]);

  async function setDefault(modelId: string) {
    setSubmittingId(modelId);
    try {
      const updated = await postJson<ModelItem>(`/api/models/${modelId}/default`, {});
      setModels(current => current.map(m => ({ ...m, isDefault: m.id === updated.id })));
      setSelectedModel(updated);
    } finally {
      setSubmittingId(null);
    }
  }

  async function toggleModel(modelId: string) {
    setSubmittingId(modelId);
    try {
      const updated = await postJson<ModelItem>(`/api/models/${modelId}/toggle`, {});
      setModels(current => {
        const next = current.map(m => m.id === updated.id ? updated : m);
        if (!next.some(m => m.isDefault) && next.some(m => m.status === "enabled")) {
          const fallback = next.find(m => m.status === "enabled");
          return next.map(m => ({ ...m, isDefault: m.id === fallback?.id }));
        }
        return next;
      });
      if (selectedModel?.id === modelId) {
        setSelectedModel(updated);
      }
    } finally {
      setSubmittingId(null);
    }
  }

  async function testModel(modelId: string) {
    setSubmittingId(modelId);
    setTestResult(null);
    try {
      const result = await postJson<ModelTestResult>(`/api/models/${modelId}/test`, {});
      setTestResult(result);
    } finally {
      setSubmittingId(null);
    }
  }

  async function deleteModel(modelId: string) {
    if (!confirm("确定要删除该模型吗？")) return;
    setSubmittingId(modelId);
    try {
      await fetch(`/api/models/${modelId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      setModels(current => {
        const next = current.filter(m => m.id !== modelId);
        if (selectedModel?.id === modelId) {
          setSelectedModel(next[0] ?? null);
        }
        return next;
      });
    } finally {
      setSubmittingId(null);
    }
  }

  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);
  const [editDraft, setEditDraft] = useState<ModelDraft | null>(null);

  function startEdit(model: ModelItem) {
    setEditingModel(model);
    setEditDraft({
      name: model.name,
      id: model.id,
      provider: model.provider,
      type: model.type,
      endpoint: model.endpoint,
      apiKey: "",
      contextWindow: model.contextWindow,
      costLevel: model.costLevel,
      setDefault: model.isDefault
    });
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingModel || !editDraft) return;
    setSubmittingId(editingModel.id);
    try {
      const body: Record<string, unknown> = {
        name: editDraft.name,
        provider: editDraft.provider,
        type: editDraft.type,
        endpoint: editDraft.endpoint,
        contextWindow: editDraft.contextWindow,
        costLevel: editDraft.costLevel
      };
      if (editDraft.apiKey) body.apiKey = editDraft.apiKey;
      const updated = await postJson<ModelItem>(`/api/models/${editingModel.id}`, body);
      // Use PUT for update
      const res = await fetch(`/api/models/${editingModel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const updatedModel = await res.json() as ModelItem;
      setModels(current => current.map(m => m.id === updatedModel.id ? updatedModel : m));
      setSelectedModel(updatedModel);
      setEditingModel(null);
      setEditDraft(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmittingId(null);
    }
  }

  function applyTemplate(templateKey: string) {
    const template = MODEL_TEMPLATES[templateKey];
    if (template) {
      setModelDraft({ ...template, id: `${templateKey}-${Date.now()}` });
    }
  }

  function updateDraft<K extends keyof ModelDraft>(key: K, value: ModelDraft[K]) {
    setModelDraft(current => ({ ...current, [key]: value }));
  }

  async function createModel(event: FormEvent) {
    event.preventDefault();
    setSavingModel(true);
    try {
      const created = await postJson<ModelItem>("/api/models", {
        ...modelDraft,
        capabilities: modelDraft.provider.includes("Local")
          ? ["内网知识问答", "脚本生成", "日志诊断"]
          : ["ChatOps", "日志诊断", "修复方案生成"]
      });
      setModels(current => {
        const next = modelDraft.setDefault
          ? current.map(m => ({ ...m, isDefault: false }))
          : current;
        return [...next, created];
      });
      setSelectedModel(created);
      setShowAddModal(false);
      setModelDraft({
        name: "", id: "", provider: "Zhipu AI (智谱)",
        type: "chat", endpoint: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: "", contextWindow: "128k", costLevel: "low", setDefault: false
      });
    } finally {
      setSavingModel(false);
    }
  }

  return (
    <div className="models-v2">
      {/* 顶部统计卡片 */}
      <div className="models-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#EEF2FF" }}>
            <Bot size={20} color="#4F46E5" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totals.models}</span>
            <span className="stat-label">全部模型</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#DCFCE7" }}>
            <CheckCircle2 size={20} color="#16A34A" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totals.enabled}</span>
            <span className="stat-label">在线</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#FEF3C7" }}>
            <Sparkles size={20} color="#D97706" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totals.chat}</span>
            <span className="stat-label">对话模型</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#FCE7F3" }}>
            <ShieldCheck size={20} color="#DB2777" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totals.default}</span>
            <span className="stat-label">默认模型</span>
          </div>
        </div>
      </div>

      <div className="models-main">
        {/* 左侧：模型列表 */}
        <div className="models-sidebar">
          {/* 搜索和筛选 */}
          <div className="models-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="搜索模型..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-model-btn" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              添加模型
            </button>
          </div>

          <div className="filter-row">
            <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
              <option value="all">全部供应商</option>
              {providers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">全部状态</option>
              <option value="enabled">在线</option>
              <option value="disabled">离线</option>
              <option value="default">默认</option>
            </select>
          </div>

          {/* 模型列表 */}
          <div className="models-list">
            {Object.entries(groupedModels).map(([provider, providerModels]) => {
              const config = getProviderConfig(provider);
              return (
                <div key={provider} className="model-group">
                  <div className="group-header">
                    <span className="provider-badge" style={{ background: config.color }}>
                      {config.icon}
                    </span>
                    <span className="provider-name">{provider}</span>
                    <span className="provider-count">{providerModels.length}</span>
                  </div>
                  {providerModels.map(model => {
                    const status = getStatusConfig(model.status, model.isDefault);
                    return (
                      <button
                        key={model.id}
                        className={`model-card ${selectedModel?.id === model.id ? 'active' : ''}`}
                        onClick={() => setSelectedModel(model)}
                      >
                        <div className="model-card-header">
                          <span className="model-name">{model.name}</span>
                          <span
                            className="status-badge"
                            style={{ background: status.bg, color: status.color }}
                          >
                            {model.isDefault && <CheckCircle2 size={12} />}
                            {status.label}
                          </span>
                        </div>
                        <div className="model-card-meta">
                          <span className="model-id">{model.id}</span>
                          <span className="model-context">{formatContextWindow(model.contextWindow)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {filteredModels.length === 0 && (
              <div className="empty-state">
                <Bot size={48} strokeWidth={1} />
                <p>暂无模型</p>
                <button onClick={() => setShowAddModal(true)}>添加第一个模型</button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：模型详情 */}
        <div className="models-detail">
          {selectedModel ? (
            <>
              <div className="detail-header">
                <div className="detail-title">
                  <span className="provider-icon" style={{ background: getProviderConfig(selectedModel.provider).color }}>
                    {getProviderConfig(selectedModel.provider).icon}
                  </span>
                  <div>
                    <h2>{selectedModel.name}</h2>
                    <span className="detail-provider">{selectedModel.provider}</span>
                  </div>
                </div>
                <div className="detail-tags">
                  <span className="type-tag">
                    <MessageSquareText size={14} />
                    {selectedModel.type === "chat" ? "对话" : "向量"}
                  </span>
                  <span className="cost-tag" style={{ background: getCostColor(selectedModel.costLevel).bg, color: getCostColor(selectedModel.costLevel).text }}>
                    {getCostColor(selectedModel.costLevel).label}
                  </span>
                  {selectedModel.isDefault && (
                    <span className="default-tag">
                      <ShieldCheck size={14} />
                      默认模型
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">模型 ID</span>
                  <span className="detail-value">{selectedModel.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">上下文窗口</span>
                  <span className="detail-value">{formatContextWindow(selectedModel.contextWindow)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">响应延迟</span>
                  <span className="detail-value">{formatLatency(selectedModel.latencyMs)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">API 密钥</span>
                  <span className="detail-value" style={{ color: selectedModel.apiKeyConfigured ? "#16A34A" : "#DC2626" }}>
                    {selectedModel.apiKeyConfigured ? "已配置" : "未配置"}
                  </span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Endpoint</span>
                  <a href={selectedModel.endpoint} target="_blank" rel="noopener noreferrer" className="endpoint-link">
                    {selectedModel.endpoint}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="capabilities-section">
                <h3>能力标签</h3>
                <div className="capabilities-list">
                  {selectedModel.capabilities.map(cap => (
                    <span key={cap} className="capability-tag">{cap}</span>
                  ))}
                </div>
              </div>

              <div className="detail-actions">
                <button
                  className="action-btn primary"
                  disabled={submittingId === selectedModel.id || selectedModel.isDefault}
                  onClick={() => setDefault(selectedModel.id)}
                >
                  <ShieldCheck size={16} />
                  设为默认
                </button>
                <button
                  className="action-btn"
                  disabled={submittingId === selectedModel.id}
                  onClick={() => toggleModel(selectedModel.id)}
                >
                  {selectedModel.status === "enabled" ? <EyeOff size={16} /> : <Eye size={16} />}
                  {selectedModel.status === "enabled" ? "停用" : "启用"}
                </button>
                <button
                  className="action-btn"
                  disabled={submittingId === selectedModel.id}
                  onClick={() => testModel(selectedModel.id)}
                >
                  <Activity size={16} />
                  测试连接
                </button>
                <button
                  className="action-btn"
                  disabled={submittingId === selectedModel.id}
                  onClick={() => startEdit(selectedModel)}
                >
                  <Settings size={16} />
                  编辑
                </button>
                <button
                  className="action-btn danger"
                  disabled={submittingId === selectedModel.id}
                  onClick={() => deleteModel(selectedModel.id)}
                  style={{ color: "#DC2626" }}
                >
                  <Trash2 size={16} />
                  删除
                </button>
              </div>

              {testResult && testResult.modelId === selectedModel.id && (
                <div className={`test-result ${testResult.ok ? 'success' : 'error'}`}>
                  <div className="test-result-header">
                    {testResult.ok ? <CheckCircle2 size={20} /> : <X size={20} />}
                    <span>{testResult.ok ? "连接成功" : "连接失败"}</span>
                    <span className="test-latency">{testResult.latencyMs}ms</span>
                  </div>
                  <div className="test-result-time">
                    检测时间: {new Date(testResult.checkedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <Bot size={64} strokeWidth={1} />
              <p>选择一个模型查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 添加模型模态框 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>添加模型</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="template-section">
                <h3>快速模板</h3>
                <div className="template-grid">
                  {Object.entries(MODEL_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      className="template-card"
                      onClick={() => applyTemplate(key)}
                    >
                      <span className="template-icon" style={{ background: getProviderConfig(template.provider).color }}>
                        {getProviderConfig(template.provider).icon}
                      </span>
                      <span className="template-name">{template.name}</span>
                      <span className="template-provider">{template.provider}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={createModel} className="model-form-v2">
                <div className="form-row">
                  <label className="form-field">
                    <span>模型名称</span>
                    <input
                      type="text"
                      value={modelDraft.name}
                      onChange={e => updateDraft("name", e.target.value)}
                      placeholder="如：智谱 GLM-4"
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>模型 ID</span>
                    <input
                      type="text"
                      value={modelDraft.id}
                      onChange={e => updateDraft("id", e.target.value)}
                      placeholder="如：glm-4"
                      required
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="form-field">
                    <span>供应商</span>
                    <select
                      value={modelDraft.provider}
                      onChange={e => updateDraft("provider", e.target.value)}
                    >
                      <option value="Zhipu AI (智谱)">智谱 AI</option>
                      <option value="OpenAI">OpenAI</option>
                      <option value="Deepseek">Deepseek</option>
                      <option value="Anthropic">Anthropic</option>
                      <option value="Azure">Azure</option>
                      <option value="Local">本地</option>
                      <option value="OpenAI Compatible">OpenAI 兼容</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>上下文窗口</span>
                    <select
                      value={modelDraft.contextWindow}
                      onChange={e => updateDraft("contextWindow", e.target.value)}
                    >
                      <option value="8k">8K</option>
                      <option value="32k">32K</option>
                      <option value="64k">64K</option>
                      <option value="128k">128K</option>
                      <option value="256k">256K</option>
                      <option value="1m">1M</option>
                    </select>
                  </label>
                </div>

                <label className="form-field full">
                  <span>API Endpoint</span>
                  <input
                    type="url"
                    value={modelDraft.endpoint}
                    onChange={e => updateDraft("endpoint", e.target.value)}
                    placeholder="https://api.example.com/v1"
                    required
                  />
                </label>

                <label className="form-field full">
                  <span>API Key</span>
                  <div className="input-with-toggle">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={modelDraft.apiKey}
                      onChange={e => updateDraft("apiKey", e.target.value)}
                      placeholder="sk-..."
                    />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="form-field">
                  <span>成本等级</span>
                  <select
                    value={modelDraft.costLevel}
                    onChange={e => updateDraft("costLevel", e.target.value)}
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </label>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={modelDraft.setDefault}
                    onChange={e => updateDraft("setDefault", e.target.checked)}
                  />
                  <span>设为默认模型</span>
                </label>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={createModel} disabled={savingModel}>
                {savingModel ? "添加中..." : "添加模型"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模型模态框 */}
      {editingModel && editDraft && (
        <div className="modal-overlay" onClick={() => { setEditingModel(null); setEditDraft(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>编辑模型</h2>
              <button className="modal-close" onClick={() => { setEditingModel(null); setEditDraft(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={submitEdit} className="model-form-v2">
                <div className="form-row">
                  <label className="form-field">
                    <span>模型名称</span>
                    <input type="text" value={editDraft.name} onChange={e => setEditDraft(d => d ? { ...d, name: e.target.value } : d)} required />
                  </label>
                  <label className="form-field">
                    <span>模型 ID</span>
                    <input type="text" value={editDraft.id} disabled style={{ opacity: 0.6 }} />
                  </label>
                </div>
                <div className="form-row">
                  <label className="form-field">
                    <span>供应商</span>
                    <input type="text" value={editDraft.provider} onChange={e => setEditDraft(d => d ? { ...d, provider: e.target.value } : d)} required />
                  </label>
                  <label className="form-field">
                    <span>上下文窗口</span>
                    <input type="text" value={editDraft.contextWindow} onChange={e => setEditDraft(d => d ? { ...d, contextWindow: e.target.value } : d)} />
                  </label>
                </div>
                <label className="form-field full">
                  <span>Endpoint</span>
                  <input type="url" value={editDraft.endpoint} onChange={e => setEditDraft(d => d ? { ...d, endpoint: e.target.value } : d)} required />
                </label>
                <div className="form-row">
                  <label className="form-field">
                    <span>API Key（留空不修改）</span>
                    <input type="password" value={editDraft.apiKey} onChange={e => setEditDraft(d => d ? { ...d, apiKey: e.target.value } : d)} placeholder="不修改请留空" />
                  </label>
                  <label className="form-field">
                    <span>成本级别</span>
                    <select value={editDraft.costLevel} onChange={e => setEditDraft(d => d ? { ...d, costLevel: e.target.value } : d)}>
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </label>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => { setEditingModel(null); setEditDraft(null); }}>取消</button>
              <button type="button" className="btn-primary" disabled={submittingId === editingModel.id} onClick={submitEdit}>
                {submittingId === editingModel.id ? "保存中..." : "保存修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ModelItem, ModelSummary, ModelDraft, ModelTestResult };
