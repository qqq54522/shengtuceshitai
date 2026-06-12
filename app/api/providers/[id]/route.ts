import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { providerToDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { parseSupportedModes } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data: {
      name?: string;
      baseUrl?: string;
      apiKeyEncrypted?: string;
      defaultModel?: string;
      supportedModes?: string;
      enabled?: boolean;
    } = {};

    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.baseUrl === "string") data.baseUrl = body.baseUrl.trim();
    if (typeof body.defaultModel === "string") data.defaultModel = body.defaultModel.trim();
    if (typeof body.apiKey === "string" && body.apiKey.trim()) {
      data.apiKeyEncrypted = encryptSecret(body.apiKey.trim());
    }
    if (Array.isArray(body.supportedModes)) {
      data.supportedModes = JSON.stringify(parseSupportedModes(body.supportedModes));
    }
    if (typeof body.enabled === "boolean") data.enabled = body.enabled;

    const provider = await prisma.providerConfig.update({
      where: { id },
      data
    });

    return NextResponse.json({ provider: providerToDTO(provider) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新 Provider 失败。" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.providerConfig.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除 Provider 失败。" },
      { status: 500 }
    );
  }
}
