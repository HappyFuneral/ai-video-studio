import { NextRequest, NextResponse } from "next/server";
import { getProject, saveProject } from "../../../../../lib/production/store";
import type { ProductionProject } from "../../../../../lib/production/types";

export const runtime = "nodejs";

interface RouteContext {
  params: { projectId: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const project = await getProject(params.projectId);
    if (!project) {
      return NextResponse.json({ error: "A projekt nem található." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Production Bible GET error:", error);
    return NextResponse.json(
      { error: "Nem sikerült betölteni a Production Bible projektet." },
      { status: 500 },
    );
  }
}

function isProject(value: unknown, projectId: string): value is ProductionProject {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProductionProject>;
  return (
    candidate.id === projectId &&
    typeof candidate.title === "string" &&
    typeof candidate.durationSeconds === "number" &&
    Array.isArray(candidate.characters) &&
    Array.isArray(candidate.props) &&
    Array.isArray(candidate.scenes) &&
    !!candidate.world &&
    Array.isArray(candidate.world.locations) &&
    !!candidate.style
  );
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const body: unknown = await request.json();
    const candidate =
      body && typeof body === "object" && "project" in body
        ? (body as { project: unknown }).project
        : body;

    if (!isProject(candidate, params.projectId)) {
      return NextResponse.json(
        { error: "A mentendő projekt adatai hiányosak vagy érvénytelenek." },
        { status: 400 },
      );
    }

    const project = await saveProject(candidate);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Production Bible PUT error:", error);
    return NextResponse.json(
      { error: "Nem sikerült elmenteni a Production Bible projektet." },
      { status: 500 },
    );
  }
}
