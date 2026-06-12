import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { assetToDTO } from "@/lib/dto";
import {
  buildOpenAIImagePayload,
  callOpenAICompatibleImageAPI,
  extractImageUrls
} from "@/lib/openai-image";
import { prisma } from "@/lib/prisma";
import { parseGenerationRequest } from "@/lib/validation";

export async function POST(request: Request) {
  const startedAt = Date.now();
  let taskId: string | null = null;

  try {
    const generationRequest = parseGenerationRequest(await request.json());
    const provider = await prisma.providerConfig.findUnique({
      where: { id: generationRequest.providerId }
    });

    if (!provider || !provider.enabled) {
      return NextResponse.json(
        { error: "Provider 不存在或已禁用。" },
        { status: 404 }
      );
    }

    const [sourceAsset, maskAsset] = await Promise.all([
      generationRequest.sourceImageId
        ? prisma.generatedAsset.findUnique({
            where: { id: generationRequest.sourceImageId }
          })
        : Promise.resolve(null),
      generationRequest.maskImageId
        ? prisma.generatedAsset.findUnique({
            where: { id: generationRequest.maskImageId }
          })
        : Promise.resolve(null)
    ]);

    const providerWithKey = {
      ...provider,
      apiKey: decryptSecret(provider.apiKeyEncrypted)
    };
    const requestPayload = buildOpenAIImagePayload({
      provider: providerWithKey,
      request: generationRequest,
      sourceAsset,
      maskAsset
    });

    const task = await prisma.generationTask.create({
      data: {
        mode: generationRequest.mode,
        providerId: provider.id,
        providerName: provider.name,
        model: generationRequest.model,
        prompt: generationRequest.prompt,
        negativePrompt: generationRequest.negativePrompt,
        width: generationRequest.width,
        height: generationRequest.height,
        seed: generationRequest.seed,
        count: generationRequest.count,
        sourceImageId: generationRequest.sourceImageId,
        maskImageId: generationRequest.maskImageId,
        expandDirections: JSON.stringify(generationRequest.expandDirections ?? []),
        upscaleFactor: generationRequest.upscaleFactor,
        requestPayload: JSON.stringify(requestPayload)
      }
    });
    taskId = task.id;

    const result = await callOpenAICompatibleImageAPI({
      provider: providerWithKey,
      request: generationRequest,
      sourceAsset,
      maskAsset
    });
    const imageUrls = extractImageUrls(result.data);

    if (!imageUrls.length) {
      throw new Error("第三方接口返回成功，但没有找到图片 URL 或 b64_json。");
    }

    const assets = await prisma.$transaction(
      imageUrls.map((imageUrl) =>
        prisma.generatedAsset.create({
          data: {
            taskId: task.id,
            providerId: provider.id,
            providerName: provider.name,
            imageUrl,
            thumbnailUrl: imageUrl,
            mode: generationRequest.mode,
            model: generationRequest.model,
            prompt: generationRequest.prompt,
            negativePrompt: generationRequest.negativePrompt,
            width: generationRequest.width,
            height: generationRequest.height,
            seed: generationRequest.seed,
            tags: JSON.stringify([]),
            metadata: JSON.stringify({
              request: generationRequest,
              endpoint: result.endpoint
            })
          }
        })
      )
    );

    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: "success",
        responsePayload: JSON.stringify(result.data),
        durationMs: Date.now() - startedAt
      }
    });

    return NextResponse.json({
      taskId: task.id,
      assets: assets.map(assetToDTO)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败。";

    if (taskId) {
      await prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: message,
          durationMs: Date.now() - startedAt
        }
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
