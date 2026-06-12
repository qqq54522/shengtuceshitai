import type { GeneratedAsset, ProviderConfig } from "@prisma/client";
import type { GenerationRequest } from "./types";

type ProviderWithKey = ProviderConfig & {
  apiKey: string;
};

type BuildPayloadInput = {
  provider: ProviderWithKey;
  request: GenerationRequest;
  sourceAsset?: GeneratedAsset | null;
  maskAsset?: GeneratedAsset | null;
};

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function buildOpenAIImagePayload({
  request,
  sourceAsset,
  maskAsset
}: BuildPayloadInput) {
  const common = {
    model: request.model,
    prompt: request.prompt,
    n: request.count,
    size: `${request.width}x${request.height}`,
    response_format: "url",
    ...(request.seed !== undefined ? { seed: request.seed } : {}),
    ...(request.negativePrompt ? { negative_prompt: request.negativePrompt } : {})
  };

  if (request.mode === "text-to-image") {
    return common;
  }

  if (request.mode === "image-to-image") {
    return {
      ...common,
      image: sourceAsset?.imageUrl,
      mask: maskAsset?.imageUrl
    };
  }

  if (request.mode === "outpaint") {
    return {
      ...common,
      image: sourceAsset?.imageUrl,
      mask: maskAsset?.imageUrl,
      expand_directions: request.expandDirections ?? []
    };
  }

  return {
    model: request.model,
    image: sourceAsset?.imageUrl,
    prompt: request.prompt,
    upscale_factor: request.upscaleFactor ?? 2,
    response_format: "url"
  };
}

export function getEndpoint(provider: ProviderWithKey, mode: GenerationRequest["mode"]) {
  const baseUrl = normalizeBaseUrl(provider.baseUrl);

  if (mode === "text-to-image") {
    return `${baseUrl}/images/generations`;
  }

  if (mode === "upscale") {
    return `${baseUrl}/images/upscale`;
  }

  return `${baseUrl}/images/edits`;
}

export async function callOpenAICompatibleImageAPI(input: BuildPayloadInput) {
  const endpoint = getEndpoint(input.provider, input.request.mode);
  const payload = buildOpenAIImagePayload(input);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.provider.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data: unknown = text;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : text || `HTTP ${response.status}`;
    throw new Error(`第三方接口失败：${message}`);
  }

  return {
    endpoint,
    payload,
    data
  };
}

export function extractImageUrls(data: unknown) {
  if (!data || typeof data !== "object") {
    return [];
  }

  const maybeData = data as {
    data?: Array<{ url?: string; b64_json?: string }>;
    images?: Array<{ url?: string; b64_json?: string } | string>;
    output?: Array<string>;
    url?: string;
  };

  const urls: string[] = [];

  for (const item of maybeData.data ?? []) {
    if (item.url) urls.push(item.url);
    if (item.b64_json) urls.push(`data:image/png;base64,${item.b64_json}`);
  }

  for (const item of maybeData.images ?? []) {
    if (typeof item === "string") {
      urls.push(item);
    } else {
      if (item.url) urls.push(item.url);
      if (item.b64_json) urls.push(`data:image/png;base64,${item.b64_json}`);
    }
  }

  for (const item of maybeData.output ?? []) {
    urls.push(item);
  }

  if (maybeData.url) {
    urls.push(maybeData.url);
  }

  return urls;
}
