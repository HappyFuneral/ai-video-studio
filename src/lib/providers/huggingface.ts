export function getSpaceId(type: "image" | "video"): string {
  if (type === "image") {
    return process.env.HF_IMAGE_SPACE || "mrfakename/Z-Image-Turbo";
  }

  return process.env.HF_VIDEO_SPACE || "DeepRat/LTX-Video-ZeroGPU-Optimized";
}

export function getVideoApiName(type: "t2v" | "i2v"): string {
  if (type === "t2v") {
    return process.env.HF_VIDEO_T2V_API || "text_to_video";
  }

  return process.env.HF_VIDEO_I2V_API || "image_to_video";
}

/** Hugging Face token. Kizárólag szerveroldali kódból használd! */
export function getHfToken(): string | undefined {
  const token = process.env.HF_TOKEN?.trim();
  return token || undefined;
}
