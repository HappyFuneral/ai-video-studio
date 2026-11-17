import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nem érkezett képfájl." },
        { status: 400 },
      );
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        { error: "Csak JPG, PNG és WebP képek tölthetők fel." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "A kép mérete legfeljebb 12 MB lehet." },
        { status: 400 },
      );
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "production",
    );

    await mkdir(uploadDirectory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const filepath = path.join(uploadDirectory, filename);

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/production/${filename}`,
      filename,
    });
  } catch (error) {
    console.error("Reference upload error:", error);

    return NextResponse.json(
      { error: "A képfeltöltés nem sikerült." },
      { status: 500 },
    );
  }
}
