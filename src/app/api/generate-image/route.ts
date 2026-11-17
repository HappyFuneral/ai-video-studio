import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 300;

const SPACE = "mrfakename/Z-Image-Turbo";

const allowedSizes = {
  "1:1": [1024, 1024],
  "16:9": [1024, 576],
  "9:16": [576, 1024],
  "4:3": [1024, 768],
} as const;

type AspectRatio = keyof typeof allowedSizes;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const prompt = String(body.prompt || "").trim();
    const negativePrompt = String(body.negativePrompt || "").trim();
    const aspectRatio = (body.aspectRatio || "1:1") as AspectRatio;
    const count = Math.min(4, Math.max(1, Number(body.count) || 1));

    if (!prompt) {
      return NextResponse.json(
        { error: "Írd be a képgenerálási promptot!" },
        { status: 400 },
      );
    }

    if (!(aspectRatio in allowedSizes)) {
      return NextResponse.json(
        { error: "Érvénytelen képarány." },
        { status: 400 },
      );
    }

    const [height, width] = allowedSizes[aspectRatio];

    const token = process.env.HF_TOKEN;

    const client = await Client.connect(
      SPACE,
      token ? { hf_token: token as `hf_${string}` } : undefined,
    );

    const images: string[] = [];
    const seeds: number[] = [];

    for (let i = 0; i < count; i++) {
      const result = await client.predict("/generate_image", {
        prompt: negativePrompt
          ? `${prompt}\n\nNegative prompt: ${negativePrompt}`
          : prompt,
        height,
        width,
        num_inference_steps: 9,
        seed: Math.floor(Math.random() * 2147483647),
        randomize_seed: true,
      });

      const output = result.data as any[];

      const imageData = output?.[0];
      const usedSeed = output?.[1];

      const imageUrl =
        typeof imageData === "string" ? imageData : imageData?.url;

      if (!imageUrl) {
        throw new Error("A Space nem adott vissza képelérési címet.");
      }

      images.push(imageUrl);

      if (typeof usedSeed === "number") {
        seeds.push(usedSeed);
      }
    }

    return NextResponse.json({
      success: true,
      images,
      seeds,
      message: `${images.length} kép sikeresen elkészült.`,
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ismeretlen képgenerálási hiba.",
      },
      { status: 502 },
    );
  }
}
