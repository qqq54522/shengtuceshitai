import type { GenerationMode, GenerationRequest } from "./types";

const MODES: GenerationMode[] = [
  "text-to-image",
  "image-to-image",
  "outpaint",
  "upscale"
];

export function parseSupportedModes(value: unknown): GenerationMode[] {
  if (!Array.isArray(value)) {
    return ["text-to-image"];
  }

  const modes = value.filter((mode): mode is GenerationMode =>
    MODES.includes(mode as GenerationMode)
  );

  return modes.length ? modes : ["text-to-image"];
}

export function parseGenerationRequest(value: unknown): GenerationRequest {
  const input = value as Partial<GenerationRequest>;
  const mode = input.mode;

  if (!mode || !MODES.includes(mode)) {
    throw new Error("请选择有效的生成模式。");
  }

  if (!input.providerId) {
    throw new Error("请选择 Provider。");
  }

  if (!input.model?.trim()) {
    throw new Error("请输入模型名称。");
  }

  if (!input.prompt?.trim() && mode !== "upscale") {
    throw new Error("请输入 prompt。");
  }

  const width = Number(input.width);
  const height = Number(input.height);
  const count = Number(input.count ?? 1);

  if (!Number.isInteger(width) || width < 64 || width > 8192) {
    throw new Error("宽度必须是 64 到 8192 之间的整数。");
  }

  if (!Number.isInteger(height) || height < 64 || height > 8192) {
    throw new Error("高度必须是 64 到 8192 之间的整数。");
  }

  if (!Number.isInteger(count) || count < 1 || count > 8) {
    throw new Error("生成数量必须是 1 到 8 之间的整数。");
  }

  if ((mode === "image-to-image" || mode === "outpaint" || mode === "upscale") && !input.sourceImageId) {
    throw new Error("该模式需要选择一张源图片。");
  }

  return {
    mode,
    providerId: input.providerId,
    model: input.model.trim(),
    prompt: input.prompt?.trim() ?? "",
    negativePrompt: input.negativePrompt?.trim() || undefined,
    width,
    height,
    count,
    seed:
      input.seed === undefined || input.seed === null
        ? undefined
        : Number(input.seed),
    sourceImageId: input.sourceImageId || undefined,
    maskImageId: input.maskImageId || undefined,
    expandDirections: input.expandDirections ?? [],
    upscaleFactor: input.upscaleFactor
  };
}
