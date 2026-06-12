import type { GeneratedAsset, ProviderConfig } from "@prisma/client";
import type { AssetDTO, GenerationMode, ProviderDTO } from "./types";

function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function providerToDTO(provider: ProviderConfig): ProviderDTO {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    defaultModel: provider.defaultModel,
    supportedModes: parseJSON<GenerationMode[]>(provider.supportedModes, [
      "text-to-image"
    ]),
    enabled: provider.enabled,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString()
  };
}

export function assetToDTO(asset: GeneratedAsset): AssetDTO {
  return {
    id: asset.id,
    taskId: asset.taskId,
    providerId: asset.providerId,
    providerName: asset.providerName,
    imageUrl: asset.imageUrl,
    thumbnailUrl: asset.thumbnailUrl,
    mode: asset.mode,
    model: asset.model,
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    width: asset.width,
    height: asset.height,
    seed: asset.seed,
    tags: parseJSON<string[]>(asset.tags, []),
    favorite: asset.favorite,
    metadata: parseJSON<unknown>(asset.metadata, null),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString()
  };
}
