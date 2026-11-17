import { NextRequest, NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";

import {
  getSpaceId,
  getVideoApiName,
  getHfToken,
} from "../../../lib/providers/huggingface";

export const runtime = "nodejs";
export const maxDuration = 300;

type VideoResult = {
  video?: {
    url?: string | null;
    path?: string | null;
    orig_name?: string | null;
  };
  subtitles?: unknown;
};

function getVideoUrl(data: unknown): string | null {
  if (!Array.isArray(data) || !data[0]) {
    return null;
  }

  const output = data[0] as VideoResult;

  return output.video?.url || null;
}

export async function POST(request: NextRequest) {
  try {
    const space = getSpaceId("video");
    const token = getHfToken();

    if (!space) {
      return NextResponse.json(
        { error: "Nincs beállítva a videógeneráló Hugging Face Space." },
        { status: 500 },
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Hiányzik a Hugging Face token. Ellenőrizd a .env.local fájlt.",
        },
        { status: 500 },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const isForm = contentType.includes("multipart/form-data");

    let prompt = "";
    let negativePrompt = "";
    let mode = "text-to-video";
    let duration = 3;

    let imageData: Awaited<ReturnType<typeof handle_file>> | null = null;

    if (isForm) {
      const form = await request.formData();

      prompt = String(form.get("prompt") || "");
      negativePrompt = String(form.get("negativePrompt") || "");
      mode = String(form.get("mode") || "image-to-video");
      duration = Number(form.get("duration") || 3);

      const image = form.get("image");

      if (image instanceof File && image.size > 0) {
        const blob = new Blob([await image.arrayBuffer()], {
          type: image.type || "image/png",
        });

        imageData = await handle_file(blob);
      }
    } else {
      const body = await request.json();

      prompt = String(body.prompt || "");
      negativePrompt = String(body.negativePrompt || "");
      mode = String(body.mode || "text-to-video");
      duration = Number(body.duration || 3);
    }

    if (!prompt.trim()) {
      return NextResponse.json(
        { error: "A prompt megadása kötelező." },
        { status: 400 },
      );
    }

    if (!["text-to-video", "image-to-video"].includes(mode)) {
      return NextResponse.json(
        { error: "Nem támogatott generálási mód." },
        { status: 400 },
      );
    }

    if (mode === "image-to-video" && !imageData) {
      return NextResponse.json(
        {
          error: "Az Image-to-Video módhoz képet is fel kell tölteni.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(duration) || duration < 0.3 || duration > 8.5) {
      return NextResponse.json(
        {
          error: "A videó hossza 0,3 és 8,5 másodperc között lehet.",
        },
        { status: 400 },
      );
    }

    const apiType = mode === "image-to-video" ? "i2v" : "t2v";
    const apiName = getVideoApiName(apiType).replace(/^\/+/, "");

    if (!apiName) {
      return NextResponse.json(
        { error: "Nincs beállítva a videógeneráló API-végpont." },
        { status: 500 },
      );
    }
    const client = await Client.connect(space, {
      token: token as `hf_${string}`,
    });

    // Első tesztekhez biztonságosabb, kisebb felbontás.
    // A Space a képkockákat és a méreteket belül is igazítja.
    const width = 576;
    const height = 320;

    const frames = Math.min(257, Math.max(9, Math.round(duration * 30)));

    const inputs = [
      prompt,
      negativePrompt,
      imageData || null,
      null,
      height,
      width,
      mode,
      duration,
      frames,
      42,
      true,
      3.0,
      false,
      false,
    ];

    const endpoint = `/${apiName}`;

    console.log("Video generation request:", {
      space,
      endpoint,
      mode,
      duration,
      width,
      height,
      frames,
    });

    const result = await client.predict(endpoint, inputs);

    const videoUrl = getVideoUrl(result.data);

    if (!videoUrl) {
      console.error(
        "A Hugging Face válaszában nem található videó URL:",
        result.data,
      );

      return NextResponse.json(
        {
          error: "A Space lefutott, de nem kaptunk használható videó URL-t.",
          outputReceived: Array.isArray(result.data),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      duration,
      mode,
      width,
      height,
    });
  } catch (error) {
    console.error("Video generation error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Ismeretlen videógenerálási hiba.";

    const isQuotaError = /zerogpu|runs limit|quota exceeded|rate limit/i.test(
      message,
    );

    return NextResponse.json(
      {
        error: isQuotaError
          ? "A Hugging Face ZeroGPU kerete jelenleg nem engedélyezi a generálást. Próbáld később újra."
          : message,
      },
      {
        status: isQuotaError ? 429 : 500,
      },
    );
  }
}
