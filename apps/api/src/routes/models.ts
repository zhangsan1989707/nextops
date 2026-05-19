import { Router } from "express";
import { getAiModels, getAiModel, getAiModelForRuntime, createAiModel, setDefaultAiModel, toggleAiModel, deleteAiModel, updateAiModel } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";
import { testModelConnectivity } from "../ai.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const models = await getAiModels();
  res.json({
    items: models,
    totals: {
      models: models.length,
      enabled: models.filter((model) => model.status === "enabled").length,
      chat: models.filter((model) => model.type === "chat").length,
      embedding: models.filter((model) => model.type === "embedding").length
    }
  });
}));

router.post("/", asyncHandler(async (req, res) => {
  const body = req.body;
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const endpoint = String(body.endpoint ?? "").trim();
  const provider = String(body.provider ?? "OpenAI Compatible").trim();
  const type = String(body.type ?? "chat").trim();

  if (!id || !name || !endpoint) {
    res.status(400).json({ message: "id, name and endpoint are required" });
    return;
  }

  if (await getAiModel(id)) {
    res.status(409).json({ message: "Model id already exists" });
    return;
  }

  const nextModel: any = {
    id,
    name,
    provider,
    type,
    status: "enabled",
    isDefault: Boolean(body.setDefault),
    contextWindow: String(body.contextWindow ?? "32k").trim() || "32k",
    latencyMs: provider.toLowerCase().includes("local") ? 180 : 650,
    costLevel: String(body.costLevel ?? "medium").trim() || "medium",
    capabilities: Array.isArray(body.capabilities) && body.capabilities.length > 0
      ? body.capabilities.map(String).map((item: string) => item.trim()).filter(Boolean)
      : ["ChatOps", "日志诊断", "修复方案生成"],
    endpoint
  };

  const apiKey = String(body.apiKey ?? "").trim();
  if (apiKey) {
    nextModel.apiKeySecret = apiKey;
  }

  res.status(201).json(await createAiModel(nextModel));
}));

router.post("/:id/default", asyncHandler(async (req, res) => {
  const model = await setDefaultAiModel(String(req.params.id));
  if (!model) {
    res.status(404).json({ message: "Model not found" });
    return;
  }
  res.json(model);
}));

router.post("/:id/toggle", asyncHandler(async (req, res) => {
  const model = await toggleAiModel(String(req.params.id));
  if (!model) {
    res.status(404).json({ message: "Model not found" });
    return;
  }
  res.json(model);
}));

router.post("/:id/test", asyncHandler(async (req, res) => {
  const model = await getAiModelForRuntime(String(req.params.id));
  if (!model) {
    res.status(404).json({ message: "Model not found" });
    return;
  }

  const startedAt = Date.now();
  const result = await testModelConnectivity({ model, timeoutMs: 10000 });
  res.json({
    modelId: model.id,
    ok: result.ok,
    status: result.status,
    latencyMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
    checks: result.checks,
    warnings: result.warnings
  });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const deleted = await deleteAiModel(String(req.params.id));
  if (!deleted) {
    res.status(404).json({ message: "Model not found" });
    return;
  }
  res.json({ message: "Model deleted" });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const body = req.body;
  const input: Record<string, unknown> = {};

  if (body.name !== undefined) input.name = String(body.name).trim();
  if (body.provider !== undefined) input.provider = String(body.provider).trim();
  if (body.type !== undefined) input.type = String(body.type).trim();
  if (body.endpoint !== undefined) input.endpoint = String(body.endpoint).trim();
  if (body.contextWindow !== undefined) input.contextWindow = String(body.contextWindow).trim();
  if (body.costLevel !== undefined) input.costLevel = String(body.costLevel).trim();
  if (body.capabilities !== undefined && Array.isArray(body.capabilities)) {
    input.capabilities = body.capabilities.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (body.apiKey !== undefined && String(body.apiKey).trim()) {
    input.apiKeySecret = String(body.apiKey).trim();
  }

  const updated = await updateAiModel(String(req.params.id), input);
  if (!updated) {
    res.status(404).json({ message: "Model not found" });
    return;
  }
  res.json(updated);
}));

export default router;
