import { Router } from "express";
import { getAlert } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

type KnowledgeCategory = "incident" | "runbook" | "command" | "inspection" | "deploy" | "emergency";

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  source: string;
  relatedAlertId?: string;
  relatedServerId?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

const articles = new Map<string, KnowledgeArticle>();

function generateId(): string {
  return `kb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const validCategories: KnowledgeCategory[] = ["incident", "runbook", "command", "inspection", "deploy", "emergency"];

router.get("/", asyncHandler(async (req, res) => {
  const category = req.query.category as string | undefined;
  const tag = req.query.tag as string | undefined;
  const search = req.query.search as string | undefined;

  let items = Array.from(articles.values());

  if (category && validCategories.includes(category as KnowledgeCategory)) {
    items = items.filter((a) => a.category === category);
  }
  if (tag) {
    items = items.filter((a) => a.tags.includes(tag));
  }
  if (search) {
    const lower = search.toLowerCase();
    items = items.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.content.toLowerCase().includes(lower) ||
        a.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ items, total: items.length });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const article = articles.get(String(req.params.id));
  if (!article) {
    res.status(404).json({ message: "Knowledge article not found" });
    return;
  }
  res.json(article);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { title, content, category, tags, source, relatedAlertId, relatedServerId } = req.body ?? {};

  if (!title || !content || !category) {
    res.status(400).json({ message: "title, content, category are required" });
    return;
  }

  if (!validCategories.includes(category)) {
    res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(", ")}` });
    return;
  }

  const now = new Date().toISOString();
  const article: KnowledgeArticle = {
    id: generateId(),
    title: String(title),
    content: String(content),
    category: category as KnowledgeCategory,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    source: String(source ?? "manual"),
    relatedAlertId: relatedAlertId ? String(relatedAlertId) : undefined,
    relatedServerId: relatedServerId ? String(relatedServerId) : undefined,
    author: getActor(res),
    createdAt: now,
    updatedAt: now
  };

  articles.set(article.id, article);
  res.status(201).json(article);
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const existing = articles.get(String(req.params.id));
  if (!existing) {
    res.status(404).json({ message: "Knowledge article not found" });
    return;
  }

  const { title, content, category, tags, source, relatedAlertId, relatedServerId } = req.body ?? {};

  if (category && !validCategories.includes(category)) {
    res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(", ")}` });
    return;
  }

  const updated: KnowledgeArticle = {
    ...existing,
    title: title !== undefined ? String(title) : existing.title,
    content: content !== undefined ? String(content) : existing.content,
    category: category !== undefined ? (category as KnowledgeCategory) : existing.category,
    tags: tags !== undefined ? (Array.isArray(tags) ? tags.map(String) : existing.tags) : existing.tags,
    source: source !== undefined ? String(source) : existing.source,
    relatedAlertId: relatedAlertId !== undefined ? (relatedAlertId ? String(relatedAlertId) : undefined) : existing.relatedAlertId,
    relatedServerId: relatedServerId !== undefined ? (relatedServerId ? String(relatedServerId) : undefined) : existing.relatedServerId,
    updatedAt: new Date().toISOString()
  };

  articles.set(updated.id, updated);
  res.json(updated);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (!articles.has(id)) {
    res.status(404).json({ message: "Knowledge article not found" });
    return;
  }
  articles.delete(id);
  res.json({ message: "Knowledge article deleted", id });
}));

router.post("/from-alert/:alertId", asyncHandler(async (req, res) => {
  const alert = await getAlert(String(req.params.alertId));
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }

  const now = new Date().toISOString();
  const content = `# ${alert.title} 复盘报告

## 告警信息
- **告警ID**: ${alert.id}
- **告警标题**: ${alert.title}
- **严重级别**: ${alert.severity}
- **来源**: ${alert.source}
- **关联服务器**: ${alert.serverId}
- **触发时间**: ${alert.triggeredAt}

## 故障现象
(请补充故障具体现象)

## 根因分析
(请补充根因分析过程)

## 处理过程
(请补充处理步骤和操作记录)

## 修复方案
(请补充修复方案和验证方法)

## 预防措施
(请补充后续预防和优化建议)

## 时间线
| 时间 | 事件 |
|------|------|
| ${alert.triggeredAt} | 告警触发 |
| | |
| | |

---
*本文由 NextOps 从告警 ${alert.id} 自动生成*`;

  const article: KnowledgeArticle = {
    id: generateId(),
    title: `[复盘] ${alert.title}`,
    content,
    category: "incident",
    tags: ["auto-generated", "postmortem", alert.severity, `alert-${alert.id}`],
    source: "alert",
    relatedAlertId: alert.id,
    relatedServerId: alert.serverId,
    author: getActor(res),
    createdAt: now,
    updatedAt: now
  };

  articles.set(article.id, article);
  res.status(201).json(article);
}));

export default router;