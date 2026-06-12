import { NextResponse } from "next/server";
import { assetToDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const asset = await prisma.generatedAsset.update({
      where: { id },
      data: {
        ...(typeof body.favorite === "boolean" ? { favorite: body.favorite } : {}),
        ...(Array.isArray(body.tags)
          ? {
              tags: JSON.stringify(
                body.tags
                  .map((tag: unknown) => String(tag).trim())
                  .filter(Boolean)
              )
            }
          : {})
      }
    });

    return NextResponse.json({ asset: assetToDTO(asset) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新资产失败。" },
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
    await prisma.generatedAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除资产失败。" },
      { status: 500 }
    );
  }
}
