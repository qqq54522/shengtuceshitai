import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { assetToDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择图片文件。" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "仅支持 PNG、JPG、WEBP 图片。" },
        { status: 400 }
      );
    }

    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const filename = `${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const imageUrl = `/uploads/${filename}`;
    const asset = await prisma.generatedAsset.create({
      data: {
        imageUrl,
        thumbnailUrl: imageUrl,
        mode: "upload",
        tags: JSON.stringify(["source"]),
        metadata: JSON.stringify({
          originalName: file.name,
          mimeType: file.type,
          size: file.size
        })
      }
    });

    return NextResponse.json({ asset: assetToDTO(asset) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败。" },
      { status: 500 }
    );
  }
}
