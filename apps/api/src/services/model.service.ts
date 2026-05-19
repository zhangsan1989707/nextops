import type { AiModelRecord, AiModelRuntimeRecord, AiModelInput } from "../db.js";
import * as db from "../db.js";
import { encrypt, decrypt } from "../crypto.js";

export { getAiModels, getAiModel, getDefaultAiModelForRuntime } from "../db.js";

export async function getAiModelForRuntime(id: string): Promise<AiModelRuntimeRecord | null> {
  const model = await db.getAiModelForRuntime(id);
  if (!model) return null;

  if (model.apiKeySecret) {
    const decrypted = decrypt(model.apiKeySecret);
    if (decrypted) {
      model.apiKeySecret = decrypted;
    }
  }

  return model;
}

export async function getDefaultAiModelRuntime(): Promise<AiModelRuntimeRecord | null> {
  const model = await db.getDefaultAiModelForRuntime();
  if (!model) return null;

  if (model.apiKeySecret) {
    const decrypted = decrypt(model.apiKeySecret);
    if (decrypted) {
      model.apiKeySecret = decrypted;
    }
  }

  return model;
}

export async function createAiModel(input: AiModelInput): Promise<AiModelRecord> {
  const encrypted = { ...input };
  if (encrypted.apiKeySecret) {
    encrypted.apiKeySecret = encrypt(encrypted.apiKeySecret);
  }
  return db.createAiModel(encrypted);
}

export async function updateAiModel(id: string, input: Partial<AiModelInput>): Promise<AiModelRecord | null> {
  const encrypted: Partial<AiModelInput> = { ...input };
  if (encrypted.apiKeySecret) {
    encrypted.apiKeySecret = encrypt(encrypted.apiKeySecret);
  }
  return db.updateAiModel(id, encrypted);
}

export async function setDefaultAiModel(id: string): Promise<AiModelRecord | null> {
  return db.setDefaultAiModel(id);
}

export async function toggleAiModel(id: string): Promise<AiModelRecord | null> {
  return db.toggleAiModel(id);
}

export async function deleteAiModel(id: string): Promise<boolean> {
  return db.deleteAiModel(id);
}

export async function getModelStats() {
  const models = await db.getAiModels();
  return {
    items: models,
    totals: {
      models: models.length,
      enabled: models.filter((m) => m.status === "enabled").length,
      chat: models.filter((m) => m.type === "chat").length,
      embedding: models.filter((m) => m.type === "embedding").length
    }
  };
}