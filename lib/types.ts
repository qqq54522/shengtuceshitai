export type GenerationMode =
  | "text-to-image"
  | "image-to-image"
  | "outpaint"
  | "upscale";

export type ExpandDirection = "top" | "right" | "bottom" | "left";

export type ProviderDTO = {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  supportedModes: GenerationMode[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GenerationRequest = {
  mode: GenerationMode;
  providerId: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed?: number;
  count: number;
  sourceImageId?: string;
  maskImageId?: string;
  expandDirections?: ExpandDirection[];
  upscaleFactor?: 2 | 4;
};

export type AssetDTO = {
  id: string;
  taskId: string | null;
  providerId: string | null;
  providerName: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  mode: string;
  model: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  width: number | null;
  height: number | null;
  seed: number | null;
  tags: string[];
  favorite: boolean;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};
