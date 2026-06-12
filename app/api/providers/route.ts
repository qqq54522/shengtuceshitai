import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { providerToDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { parseSupportedModes } from "@/lib/validation";

export async function GET() {
  const providers = await prisma.providerConfig.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    providers: providers.map(providerToDTO)
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "请输入 Provider 名称。" }, { status: 400 });
    }

    if (!body.baseUrl?.trim()) {
      return NextResponse.json({ error: "请输入 base URL。" }, { status: 400 });
    }

    if (!body.apiKey?.trim()) {
      return NextResponse.json({ error: "请输入 API key。" }, { status: 400 });
    }

    if (!body.defaultModel?.trim()) {
      return NextResponse.json({ error: "请输入默认模型。" }, { status: 400 });
    }

    const provider = await prisma.providerConfig.create({
      data: {
        name: body.name.trim(),
        baseUrl: body.baseUrl.trim(),
        apiKeyEncrypted: encryptSecret(body.apiKey.trim()),
        defaultModel: body.defaultModel.trim(),
        supportedModes: JSON.stringify(parseSupportedModes(body.supportedModes)),
        enabled: body.enabled ?? true
      }
    });

    return NextResponse.json({ provider: providerToDTO(provider) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建 Provider 失败。" },
      { status: 500 }
    );
  }
}
