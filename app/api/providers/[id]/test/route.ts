import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { normalizeBaseUrl } from "@/lib/openai-image";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const provider = await prisma.providerConfig.findUnique({ where: { id } });

    if (!provider) {
      return NextResponse.json({ error: "Provider 不存在。" }, { status: 404 });
    }

    const response = await fetch(`${normalizeBaseUrl(provider.baseUrl)}/models`, {
      headers: {
        Authorization: `Bearer ${decryptSecret(provider.apiKeyEncrypted)}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          ok: false,
          error: text || `连接失败，HTTP ${response.status}`
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "测试连接失败。"
    });
  }
}
