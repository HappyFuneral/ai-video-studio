import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@gradio/client";
import { NextRequest, NextResponse } from "next/server";

import { getProject, saveProject } from "../../../../lib/production/store";

import { buildShotPrompt } from "../../../../lib/production/prompt-builder";

import {
  getHfToken,
  getSpaceId,
  getVideoApiName,
} from "../../../../lib/providers/huggingface";

import type { GeneratedClip, Shot } from "../../../../lib/production/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RequestBody {
  projectId?: string;
  sceneId?: string;
  shotId?: string;
}

interface GradioVideoFile {
  path?: string;
  url?: string;
  orig_name?: string;
  mime_type?: string;
}

interface GradioVideoOutput {
  video?: GradioVideoFile;
  subtitles?: unknown;
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "item";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ismeretlen Hugging Face generálási hiba.";
}

export async function POST(request: NextRequest) {
  let projectId = "";
  let sceneId = "";
  let shotId = "";

  try {
    const body = (await request.json()) as RequestBody;

    projectId = typeof body.projectId === "string" ? body.projectId : "";
    sceneId = typeof body.sceneId === "string" ? body.sceneId : "";
    shotId = typeof body.shotId === "string" ? body.shotId : "";

    if (!projectId || !sceneId || !shotId) {
      return NextResponse.json(
        { error: "Hiányzó projekt-, jelenet- vagy snittazonosító." },
        { status: 400 },
      );
    }

    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "A projekt nem található." },
        { status: 404 },
      );
    }

    const scene = project.scenes.find((item) => item.id === sceneId);
    const shot = scene?.shots.find((item) => item.id === shotId);

    if (!scene || !shot) {
      return NextResponse.json(
        { error: "A jelenet vagy a snitt nem található." },
        { status: 404 },
      );
    }

    const prompt = shot.prompt.trim() || buildShotPrompt(project, scene, shot);

    if (!prompt) {
      return NextResponse.json(
        { error: "A snitt promptja üres." },
        { status: 400 },
      );
    }

    const spaceId = getSpaceId("video");
    const token = getHfToken();

    console.log("[Production] Connecting to Hugging Face Space:", spaceId);

    const client = token
      ? await Client.connect(spaceId, {
          token: token as `hf_${string}`,
        })
      : await Client.connect(spaceId);

    const apiName = getVideoApiName("t2v").replace(/^\//, "");

    console.log("[Production] Calling Gradio endpoint:", apiName);

    const result = await client.predict(`/${apiName}`, [
      prompt,
      shot.negativePrompt?.trim() ||
        "worst quality, inconsistent motion, blurry, jittery, distorted",
      null,
      null,
      480,
      640,
      "text-to-video",
      Math.min(2.0, Math.max(0.3, shot.durationSeconds || 5)),
      9,
      42,
      true,
      1.0,
      false,
      false,
    ]);

    console.log("[Production] Gradio response received.");

    const responseData = result.data as unknown as GradioVideoOutput[];
    const videoFile = responseData[0]?.video;

    if (!videoFile?.url && !videoFile?.path) {
      throw new Error(
        "A Hugging Face válaszában nem található videó-URL vagy fájlútvonal.",
      );
    }

    const remoteUrl = videoFile.url
      ? videoFile.url.startsWith("http")
        ? videoFile.url
        : `https://${spaceId.replace("/", "-")}.hf.space${
            videoFile.url.startsWith("/") ? "" : "/"
          }${videoFile.url}`
      : `https://${spaceId.replace("/", "-")}.hf.space/gradio_api/file=${videoFile.path}`;

    console.log("[Production] Downloading generated video.");

    const videoResponse = await fetch(remoteUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!videoResponse.ok) {
      throw new Error(
        `A videó letöltése sikertelen (HTTP ${videoResponse.status}).`,
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    if (videoBuffer.byteLength < 1024) {
      throw new Error("A visszakapott videófájl üresnek tűnik.");
    }

    const clipId = randomUUID();

    const relativeDirectory = path.join(
      "generated",
      "production",
      safeSegment(projectId),
    );

    const publicDirectory = path.join(
      process.cwd(),
      "public",
      relativeDirectory,
    );

    await mkdir(publicDirectory, { recursive: true });

    const filename = `${safeSegment(shotId)}-${clipId}.mp4`;

    await writeFile(path.join(publicDirectory, filename), videoBuffer);

    const videoUrl = `/${relativeDirectory
      .split(path.sep)
      .join("/")}/${filename}`;

    const clip: GeneratedClip = {
      id: clipId,
      provider: "Hugging Face Spaces / Gradio",
      model: spaceId,
      videoPath: path
        .join(relativeDirectory, filename)
        .split(path.sep)
        .join("/"),
      videoUrl,
      durationSeconds: shot.durationSeconds,
      createdAt: new Date().toISOString(),
      status: "generated",
      notes: "Text-to-video generálás LTX Video ZeroGPU Space használatával.",
    };

    const updatedShot: Shot = {
      ...shot,
      prompt,
      status: "generated",
      generatedClips: [...shot.generatedClips, clip],
    };

    const updatedProject = {
      ...project,
      scenes: project.scenes.map((item) =>
        item.id !== sceneId
          ? item
          : {
              ...item,
              shots: item.shots.map((itemShot) =>
                itemShot.id === shotId ? updatedShot : itemShot,
              ),
            },
      ),
    };

    await saveProject(updatedProject);

    console.log("[Production] Video saved successfully:", videoUrl);

    return NextResponse.json({
      success: true,
      project: updatedProject,
      clip,
    });
  } catch (error) {
    console.error("Production video generation error:", error);

    if (projectId && sceneId && shotId) {
      try {
        const project = await getProject(projectId);
        const scene = project?.scenes.find((item) => item.id === sceneId);
        const shot = scene?.shots.find((item) => item.id === shotId);

        if (project && scene && shot) {
          await saveProject({
            ...project,
            scenes: project.scenes.map((item) =>
              item.id !== sceneId
                ? item
                : {
                    ...item,
                    shots: item.shots.map((itemShot) =>
                      itemShot.id === shotId
                        ? { ...itemShot, status: "failed" }
                        : itemShot,
                    ),
                  },
            ),
          });
        }
      } catch (saveError) {
        console.error("Could not save failed shot status:", saveError);
      }
    }

    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}
