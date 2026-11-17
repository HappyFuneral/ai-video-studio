import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInitialProject } from "./seed";
import type { ProductionProject } from "./types";

const dataDirectory = process.env.PRODUCTION_DATA_DIR
  ? path.resolve(process.env.PRODUCTION_DATA_DIR)
  : path.join(process.cwd(), ".local-data");
const dataFile = path.join(dataDirectory, "production-projects.json");

async function writeProjects(projects: ProductionProject[]): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(projects, null, 2), "utf8");
  await rename(temporaryFile, dataFile);
}

export async function getProjects(): Promise<ProductionProject[]> {
  try {
    const content = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error("A Production Bible adatfájl formátuma érvénytelen.");
    }
    return parsed as ProductionProject[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const initialProject = createInitialProject();
    await writeProjects([initialProject]);
    return [initialProject];
  }
}

export async function getProject(projectId: string): Promise<ProductionProject | null> {
  const projects = await getProjects();
  return projects.find((project) => project.id === projectId) ?? null;
}

export async function saveProject(
  project: ProductionProject,
): Promise<ProductionProject> {
  const projects = await getProjects();
  const updatedProject: ProductionProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  const index = projects.findIndex((item) => item.id === project.id);

  if (index >= 0) {
    projects[index] = updatedProject;
  } else {
    projects.push(updatedProject);
  }

  await writeProjects(projects);
  return updatedProject;
}
