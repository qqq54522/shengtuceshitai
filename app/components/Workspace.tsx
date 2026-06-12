"use client";

import {
  Download,
  Heart,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Wand2
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AssetDTO,
  ExpandDirection,
  GenerationMode,
  GenerationRequest,
  ProviderDTO
} from "@/lib/types";

const MODE_LABELS: Record<GenerationMode, string> = {
  "text-to-image": "文生图",
  "image-to-image": "改图",
  outpaint: "扩图",
  upscale: "高清放大"
};

const DEFAULT_MODES: GenerationMode[] = [
  "text-to-image",
  "image-to-image",
  "outpaint",
  "upscale"
];

const DEFAULT_PROVIDER_FORM = {
  id: "",
  name: "",
  baseUrl: "",
  apiKey: "",
  defaultModel: "",
  supportedModes: DEFAULT_MODES,
  enabled: true
};

const DEFAULT_GENERATION_FORM: GenerationRequest = {
  mode: "text-to-image",
  providerId: "",
  model: "",
  prompt: "",
  negativePrompt: "",
  width: 1024,
  height: 1024,
  count: 1,
  expandDirections: ["left", "right"],
  upscaleFactor: 2
};

type ProviderForm = typeof DEFAULT_PROVIDER_FORM;

function getRequestFromAsset(asset: AssetDTO): GenerationRequest | null {
  const metadata = asset.metadata as { request?: GenerationRequest } | null;
  return metadata?.request ?? null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "请求失败。");
  }

  return data as T;
}

export function Workspace() {
  const [providers, setProviders] = useState<ProviderDTO[]>([]);
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [resultAssets, setResultAssets] = useState<AssetDTO[]>([]);
  const [providerForm, setProviderForm] = useState<ProviderForm>(
    DEFAULT_PROVIDER_FORM
  );
  const [generationForm, setGenerationForm] = useState<GenerationRequest>(
    DEFAULT_GENERATION_FORM
  );
  const [filters, setFilters] = useState({
    providerId: "",
    model: "",
    tag: "",
    favorite: false
  });
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const selectedProvider = providers.find(
    (provider) => provider.id === generationForm.providerId
  );

  const sourceCandidates = useMemo(
    () => assets.filter((asset) => asset.imageUrl),
    [assets]
  );

  async function loadProviders() {
    const data = await parseResponse<{ providers: ProviderDTO[] }>(
      await fetch("/api/providers")
    );
    setProviders(data.providers);

    if (!generationForm.providerId && data.providers[0]) {
      setGenerationForm((current) => ({
        ...current,
        providerId: data.providers[0].id,
        model: data.providers[0].defaultModel
      }));
    }
  }

  async function loadAssets(nextFilters = filters) {
    const query = new URLSearchParams();
    if (nextFilters.providerId) query.set("providerId", nextFilters.providerId);
    if (nextFilters.model) query.set("model", nextFilters.model);
    if (nextFilters.tag) query.set("tag", nextFilters.tag);
    if (nextFilters.favorite) query.set("favorite", "true");

    const data = await parseResponse<{ assets: AssetDTO[] }>(
      await fetch(`/api/assets?${query.toString()}`)
    );
    setAssets(data.assets);
  }

  useEffect(() => {
    loadProviders().catch((reason) => setError(String(reason)));
    loadAssets().catch((reason) => setError(String(reason)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateGeneration<K extends keyof GenerationRequest>(
    key: K,
    value: GenerationRequest[K]
  ) {
    setGenerationForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateProvider<K extends keyof ProviderForm>(
    key: K,
    value: ProviderForm[K]
  ) {
    setProviderForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleSupportedMode(mode: GenerationMode) {
    setProviderForm((current) => {
      const exists = current.supportedModes.includes(mode);
      const supportedModes = exists
        ? current.supportedModes.filter((item) => item !== mode)
        : [...current.supportedModes, mode];

      return {
        ...current,
        supportedModes: supportedModes.length ? supportedModes : [mode]
      };
    });
  }

  function toggleExpandDirection(direction: ExpandDirection) {
    setGenerationForm((current) => {
      const currentDirections = current.expandDirections ?? [];
      return {
        ...current,
        expandDirections: currentDirections.includes(direction)
          ? currentDirections.filter((item) => item !== direction)
          : [...currentDirections, direction]
      };
    });
  }

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSavingProvider(true);

    try {
      const isEdit = Boolean(providerForm.id);
      const response = await fetch(
        isEdit ? `/api/providers/${providerForm.id}` : "/api/providers",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(providerForm)
        }
      );
      const data = await parseResponse<{ provider: ProviderDTO }>(response);
      setStatus(isEdit ? "Provider 已更新。" : "Provider 已创建。");
      setProviderForm(DEFAULT_PROVIDER_FORM);
      await loadProviders();
      setGenerationForm((current) => ({
        ...current,
        providerId: data.provider.id,
        model: data.provider.defaultModel
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存 Provider 失败。");
    } finally {
      setIsSavingProvider(false);
    }
  }

  async function testProvider(providerId: string) {
    setError("");
    setStatus("正在测试连接...");

    try {
      const data = await parseResponse<{ ok: boolean; error?: string }>(
        await fetch(`/api/providers/${providerId}/test`, { method: "POST" })
      );

      setStatus(data.ok ? "连接成功。" : `连接失败：${data.error}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "测试连接失败。");
    }
  }

  async function toggleProvider(provider: ProviderDTO) {
    await parseResponse<{ provider: ProviderDTO }>(
      await fetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !provider.enabled })
      })
    );
    await loadProviders();
  }

  async function deleteProvider(providerId: string) {
    await parseResponse<{ ok: boolean }>(
      await fetch(`/api/providers/${providerId}`, { method: "DELETE" })
    );
    await loadProviders();
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setStatus("");
    setIsUploading(true);

    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: data
      });
      const result = await parseResponse<{ asset: AssetDTO }>(response);
      setStatus("图片已上传，可作为源图或蒙版使用。");
      setGenerationForm((current) => ({
        ...current,
        sourceImageId: result.asset.id
      }));
      await loadAssets();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "上传失败。");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function prepareGenerationPayload(
    form: GenerationRequest = generationForm
  ): GenerationRequest {
    return {
      ...form,
      width: Number(form.width),
      height: Number(form.height),
      count: Number(form.count),
      seed:
        form.seed === undefined || form.seed === null || Number.isNaN(Number(form.seed))
          ? undefined
          : Number(form.seed),
      upscaleFactor: form.upscaleFactor === 4 ? 4 : 2
    };
  }

  async function submitGeneration(form = generationForm) {
    setError("");
    setStatus("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepareGenerationPayload(form))
      });
      const data = await parseResponse<{ taskId: string; assets: AssetDTO[] }>(
        response
      );
      setResultAssets(data.assets);
      setStatus(`生成完成，任务 ${data.taskId} 已保存。`);
      await loadAssets();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  function copyAssetParams(asset: AssetDTO) {
    const request = getRequestFromAsset(asset);
    if (!request) {
      setError("这张图片没有可复用的生成参数。");
      return;
    }

    setGenerationForm(request);
    setStatus("参数已复制到工作台。");
  }

  async function rerunAsset(asset: AssetDTO) {
    const request = getRequestFromAsset(asset);
    if (!request) {
      setError("这张图片没有可重新生成的参数。");
      return;
    }

    setGenerationForm(request);
    await submitGeneration(request);
  }

  async function updateAsset(assetId: string, patch: Partial<AssetDTO>) {
    await parseResponse<{ asset: AssetDTO }>(
      await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      })
    );
    await loadAssets();
  }

  async function deleteAsset(assetId: string) {
    await parseResponse<{ ok: boolean }>(
      await fetch(`/api/assets/${assetId}`, { method: "DELETE" })
    );
    await loadAssets();
  }

  async function applyFilters() {
    await loadAssets(filters);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Internal Image Lab</p>
          <h1>多 API 生图测试台</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => loadAssets()}>
            <RefreshCw size={16} />
            刷新资产
          </button>
        </div>
      </header>

      {(status || error) && (
        <div className={`notice ${error ? "notice-error" : "notice-ok"}`}>
          {error || status}
        </div>
      )}

      <section className="workspace-grid">
        <aside className="control-panel">
          <section className="panel-section">
            <div className="section-title">
              <Settings2 size={18} />
              <h2>Provider</h2>
            </div>

            <form className="stack" onSubmit={saveProvider}>
              <label>
                名称
                <input
                  value={providerForm.name}
                  onChange={(event) => updateProvider("name", event.target.value)}
                  placeholder="例如：Fal / Replicate / 自建网关"
                />
              </label>
              <label>
                Base URL
                <input
                  value={providerForm.baseUrl}
                  onChange={(event) =>
                    updateProvider("baseUrl", event.target.value)
                  }
                  placeholder="https://api.example.com/v1"
                />
              </label>
              <label>
                API Key
                <input
                  value={providerForm.apiKey}
                  onChange={(event) => updateProvider("apiKey", event.target.value)}
                  placeholder={providerForm.id ? "留空则不修改" : "sk-..."}
                  type="password"
                />
              </label>
              <label>
                默认模型
                <input
                  value={providerForm.defaultModel}
                  onChange={(event) =>
                    updateProvider("defaultModel", event.target.value)
                  }
                  placeholder="imagen-4 / flux / gpt-image-1"
                />
              </label>

              <div className="mode-row">
                {DEFAULT_MODES.map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    className={
                      providerForm.supportedModes.includes(mode)
                        ? "chip chip-active"
                        : "chip"
                    }
                    onClick={() => toggleSupportedMode(mode)}
                  >
                    {MODE_LABELS[mode]}
                  </button>
                ))}
              </div>

              <div className="split-row">
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={providerForm.enabled}
                    onChange={(event) =>
                      updateProvider("enabled", event.target.checked)
                    }
                  />
                  启用
                </label>
                <button className="primary-button" disabled={isSavingProvider}>
                  {isSavingProvider ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                  {providerForm.id ? "更新" : "新增"}
                </button>
              </div>
            </form>

            <div className="provider-list">
              {providers.map((provider) => (
                <div className="provider-item" key={provider.id}>
                  <button
                    className="provider-main"
                    onClick={() => {
                      setGenerationForm((current) => ({
                        ...current,
                        providerId: provider.id,
                        model: provider.defaultModel
                      }));
                      setProviderForm({
                        id: provider.id,
                        name: provider.name,
                        baseUrl: provider.baseUrl,
                        apiKey: "",
                        defaultModel: provider.defaultModel,
                        supportedModes: provider.supportedModes,
                        enabled: provider.enabled
                      });
                    }}
                  >
                    <span>{provider.name}</span>
                    <small>{provider.defaultModel}</small>
                  </button>
                  <button
                    className={provider.enabled ? "mini-button active" : "mini-button"}
                    onClick={() => toggleProvider(provider)}
                  >
                    {provider.enabled ? "ON" : "OFF"}
                  </button>
                  <button
                    className="icon-button"
                    title="测试连接"
                    onClick={() => testProvider(provider.id)}
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    className="icon-button danger"
                    title="删除"
                    onClick={() => deleteProvider(provider.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">
              <Wand2 size={18} />
              <h2>生成参数</h2>
            </div>

            <div className="stack">
              <label>
                模式
                <select
                  value={generationForm.mode}
                  onChange={(event) =>
                    updateGeneration("mode", event.target.value as GenerationMode)
                  }
                >
                  {DEFAULT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {MODE_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Provider
                <select
                  value={generationForm.providerId}
                  onChange={(event) => {
                    const provider = providers.find(
                      (item) => item.id === event.target.value
                    );
                    setGenerationForm((current) => ({
                      ...current,
                      providerId: event.target.value,
                      model: provider?.defaultModel ?? current.model
                    }));
                  }}
                >
                  <option value="">请选择</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                模型
                <input
                  value={generationForm.model}
                  onChange={(event) => updateGeneration("model", event.target.value)}
                  placeholder={selectedProvider?.defaultModel ?? "model-name"}
                />
              </label>

              <label>
                Prompt
                <textarea
                  rows={5}
                  value={generationForm.prompt}
                  onChange={(event) =>
                    updateGeneration("prompt", event.target.value)
                  }
                  placeholder="描述你想生成或编辑的画面"
                />
              </label>

              <label>
                Negative Prompt
                <textarea
                  rows={3}
                  value={generationForm.negativePrompt}
                  onChange={(event) =>
                    updateGeneration("negativePrompt", event.target.value)
                  }
                  placeholder="不想出现的内容"
                />
              </label>

              <div className="input-grid">
                <label>
                  宽
                  <input
                    type="number"
                    value={generationForm.width}
                    onChange={(event) =>
                      updateGeneration("width", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  高
                  <input
                    type="number"
                    value={generationForm.height}
                    onChange={(event) =>
                      updateGeneration("height", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  数量
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={generationForm.count}
                    onChange={(event) =>
                      updateGeneration("count", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Seed
                  <input
                    type="number"
                    value={generationForm.seed ?? ""}
                    onChange={(event) =>
                      updateGeneration(
                        "seed",
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                    placeholder="随机"
                  />
                </label>
              </div>

              {generationForm.mode !== "text-to-image" && (
                <div className="asset-picker">
                  <div className="split-row">
                    <span>源图</span>
                    <label className="upload-button">
                      <Upload size={15} />
                      {isUploading ? "上传中" : "上传图片"}
                      <input type="file" accept="image/*" onChange={uploadImage} />
                    </label>
                  </div>
                  <select
                    value={generationForm.sourceImageId ?? ""}
                    onChange={(event) =>
                      updateGeneration("sourceImageId", event.target.value)
                    }
                  >
                    <option value="">选择源图</option>
                    {sourceCandidates.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.prompt?.slice(0, 40) || asset.imageUrl}
                      </option>
                    ))}
                  </select>

                  {(generationForm.mode === "image-to-image" ||
                    generationForm.mode === "outpaint") && (
                    <select
                      value={generationForm.maskImageId ?? ""}
                      onChange={(event) =>
                        updateGeneration("maskImageId", event.target.value)
                      }
                    >
                      <option value="">可选蒙版</option>
                      {sourceCandidates.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.prompt?.slice(0, 40) || asset.imageUrl}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {generationForm.mode === "outpaint" && (
                <div>
                  <span className="field-label">扩充方向</span>
                  <div className="mode-row">
                    {[
                      ["top", "上"],
                      ["right", "右"],
                      ["bottom", "下"],
                      ["left", "左"]
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={
                          generationForm.expandDirections?.includes(
                            value as ExpandDirection
                          )
                            ? "chip chip-active"
                            : "chip"
                        }
                        onClick={() =>
                          toggleExpandDirection(value as ExpandDirection)
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {generationForm.mode === "upscale" && (
                <label>
                  放大倍率
                  <select
                    value={generationForm.upscaleFactor}
                    onChange={(event) =>
                      updateGeneration(
                        "upscaleFactor",
                        Number(event.target.value) as 2 | 4
                      )
                    }
                  >
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </label>
              )}

              <button
                className="generate-button"
                onClick={() => submitGeneration()}
                disabled={isGenerating || !providers.length}
              >
                {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                开始生成
              </button>
            </div>
          </section>
        </aside>

        <section className="result-panel">
          <div className="result-header">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>本次结果</h2>
            </div>
            <button className="ghost-button" onClick={() => setResultAssets([])}>
              清空预览
            </button>
          </div>

          {resultAssets.length ? (
            <div className="result-grid">
              {resultAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  compact={false}
                  tagDraft={tagDrafts[asset.id] ?? asset.tags.join(", ")}
                  onTagDraft={(value) =>
                    setTagDrafts((current) => ({ ...current, [asset.id]: value }))
                  }
                  onSaveTags={() =>
                    updateAsset(asset.id, {
                      tags: (tagDrafts[asset.id] ?? asset.tags.join(","))
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                    } as Partial<AssetDTO>)
                  }
                  onFavorite={() =>
                    updateAsset(asset.id, { favorite: !asset.favorite })
                  }
                  onCopy={() => copyAssetParams(asset)}
                  onRerun={() => rerunAsset(asset)}
                  onDelete={() => deleteAsset(asset.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ImagePlus size={42} />
              <p>生成结果会显示在这里。</p>
            </div>
          )}
        </section>
      </section>

      <section className="asset-library">
        <div className="library-header">
          <div>
            <p className="eyebrow">Library</p>
            <h2>资产库</h2>
          </div>
          <div className="filter-row">
            <select
              value={filters.providerId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  providerId: event.target.value
                }))
              }
            >
              <option value="">全部 Provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <input
              value={filters.model}
              onChange={(event) =>
                setFilters((current) => ({ ...current, model: event.target.value }))
              }
              placeholder="模型"
            />
            <input
              value={filters.tag}
              onChange={(event) =>
                setFilters((current) => ({ ...current, tag: event.target.value }))
              }
              placeholder="标签"
            />
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={filters.favorite}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    favorite: event.target.checked
                  }))
                }
              />
              收藏
            </label>
            <button className="ghost-button" onClick={applyFilters}>
              筛选
            </button>
          </div>
        </div>

        <div className="asset-grid">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              compact
              tagDraft={tagDrafts[asset.id] ?? asset.tags.join(", ")}
              onTagDraft={(value) =>
                setTagDrafts((current) => ({ ...current, [asset.id]: value }))
              }
              onSaveTags={() =>
                updateAsset(asset.id, {
                  tags: (tagDrafts[asset.id] ?? asset.tags.join(","))
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                } as Partial<AssetDTO>)
              }
              onFavorite={() => updateAsset(asset.id, { favorite: !asset.favorite })}
              onCopy={() => copyAssetParams(asset)}
              onRerun={() => rerunAsset(asset)}
              onDelete={() => deleteAsset(asset.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function AssetCard({
  asset,
  compact,
  tagDraft,
  onTagDraft,
  onSaveTags,
  onFavorite,
  onCopy,
  onRerun,
  onDelete
}: {
  asset: AssetDTO;
  compact: boolean;
  tagDraft: string;
  onTagDraft: (value: string) => void;
  onSaveTags: () => void;
  onFavorite: () => void;
  onCopy: () => void;
  onRerun: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={compact ? "asset-card compact" : "asset-card"}>
      <div className="asset-image-wrap">
        <img src={asset.thumbnailUrl || asset.imageUrl} alt={asset.prompt ?? "生成图片"} />
      </div>
      <div className="asset-body">
        <div className="asset-meta">
          <span>{asset.providerName ?? "Local"}</span>
          <span>{asset.model ?? asset.mode}</span>
          <span>
            {asset.width && asset.height ? `${asset.width}x${asset.height}` : "source"}
          </span>
        </div>
        {!compact && asset.prompt && <p className="asset-prompt">{asset.prompt}</p>}
        <div className="tag-row">
          {asset.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="tag-editor">
          <input
            value={tagDraft}
            onChange={(event) => onTagDraft(event.target.value)}
            placeholder="标签，用逗号分隔"
          />
          <button className="mini-button" onClick={onSaveTags}>
            保存
          </button>
        </div>
        <div className="asset-actions">
          <button className="icon-button" title="收藏" onClick={onFavorite}>
            <Heart size={15} fill={asset.favorite ? "currentColor" : "none"} />
          </button>
          <button className="icon-button" title="复制参数" onClick={onCopy}>
            <Plus size={15} />
          </button>
          <button className="icon-button" title="重新生成" onClick={onRerun}>
            <Play size={15} />
          </button>
          <a className="icon-button" href={asset.imageUrl} download title="下载">
            <Download size={15} />
          </a>
          <button className="icon-button danger" title="删除" onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
