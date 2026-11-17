import { NextRequest, NextResponse } from "next/server";

import { getProject, saveProject } from "../../../lib/production/store";

import type { ProductionProject } from "../../../lib/production/types";

export const runtime = "nodejs";

const PROJECT_ID = "lizard-on-the-loose";

export async function GET() {
  try {
    const project = await getProject(PROJECT_ID);

    if (!project) {
      return NextResponse.json(
        { error: "A projekt nem található." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Production project load error:", error);

    return NextResponse.json(
      { error: "Nem sikerült betölteni a projektet." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.project || body.project.id !== PROJECT_ID) {
      return NextResponse.json(
        { error: "Érvénytelen projektadat." },
        { status: 400 },
      );
    }

    const project = body.project as ProductionProject;

    if (
      !Array.isArray(project.characters) ||
      !Array.isArray(project.props) ||
      !project.world ||
      !Array.isArray(project.world.locations) ||
      !project.style ||
      !Array.isArray(project.scenes)
    ) {
      return NextResponse.json(
        { error: "Hiányos projektstruktúra." },
        { status: 400 },
      );
    }

    await saveProject(project);

    return NextResponse.json({
      success: true,
      message: "Projekt sikeresen mentve.",
    });
  } catch (error) {
    console.error("Production project save error:", error);

    return NextResponse.json(
      { error: "Nem sikerült elmenteni a projektet." },
      { status: 500 },
    );
  }
}
