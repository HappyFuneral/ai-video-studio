import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    imageSpace: process.env.HF_IMAGE_SPACE || "mrfakename/Z-Image-Turbo",
    imageApiConfigured: Boolean(process.env.HF_IMAGE_API_NAME),
    video: {
      enabled: false,
      configured: Boolean(process.env.HF_VIDEO_SPACE),
      message:
        "A videógenerálás csak ellenőrzött, ingyenes Space API-val kapcsolható be.",
    },
    maxVideoSeconds: Number(process.env.MAX_VIDEO_SECONDS || 180),
    imageBatchSize: Math.min(4, Number(process.env.IMAGE_BATCH_SIZE || 4)),
    imageTargetSeconds: Number(process.env.IMAGE_TARGET_SECONDS || 30),
  });
}
