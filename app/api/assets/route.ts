import { NextResponse } from "next/server";
import { assetToDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  const model = searchParams.get("model");
  const favorite = searchParams.get("favorite");
  const tag = searchParams.get("tag");

  const assets = await prisma.generatedAsset.findMany({
    where: {
      ...(providerId ? { providerId } : {}),
      ...(model ? { model } : {}),
      ...(favorite === "true" ? { favorite: true } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const filteredAssets = tag
    ? assets.filter((asset) => {
        try {
          const tags = JSON.parse(asset.tags) as unknown;
          return Array.isArray(tags) && tags.includes(tag);
        } catch {
          return false;
        }
      })
    : assets;

  return NextResponse.json({ assets: filteredAssets.map(assetToDTO) });
}
