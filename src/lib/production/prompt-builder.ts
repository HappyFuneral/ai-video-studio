import type { ProductionProject, Scene, Shot } from "./types";

function compact(lines: Array<string | undefined | null>): string {
  return lines.map((line) => line?.trim()).filter((line): line is string => Boolean(line)).join("\n");
}

/** Build a model-independent shot prompt from the Production Bible. */
export function buildShotPrompt(project: ProductionProject, scene: Scene, shot: Shot): string {
  const characters = project.characters.filter((item) => scene.characterIds.includes(item.id));
  const props = project.props.filter((item) => scene.propIds.includes(item.id));
  const location = project.world.locations.find((item) => item.id === scene.locationId);

  const characterBlock = characters.map((character) => compact([
    `${character.name} – ${character.role}`,
    character.appearance,
    character.clothing,
    character.personality,
    ...character.continuityRules.map((rule) => `Continuity: ${rule}`),
  ])).join("\n\n");

  const propBlock = props.map((prop) => compact([
    `${prop.name}: ${prop.description}`,
    prop.visualDetails,
    ...prop.continuityRules.map((rule) => `Continuity: ${rule}`),
  ])).join("\n\n");

  const locationBlock = location ? compact([
    location.name,
    location.description,
    location.timeOfDay ? `Time of day: ${location.timeOfDay}` : "",
    location.atmosphere ? `Atmosphere: ${location.atmosphere}` : "",
    location.visualDetails,
  ]) : "";

  const styleBlock = compact([
    project.style.medium,
    project.style.rendering,
    project.style.texture,
    project.style.colorPalette.length ? `Color palette: ${project.style.colorPalette.join(", ")}` : "",
    project.style.lighting ? `Lighting: ${project.style.lighting}` : "",
    project.style.cameraLanguage ? `Camera language: ${project.style.cameraLanguage}` : "",
    ...project.style.continuityRules.map((rule) => `Style continuity: ${rule}`),
  ]);

  return [
    "[PROJECT]",
    `${project.title}. ${project.description}`,
    `Target frame: ${project.aspectRatio}, ${project.fps} fps.`,
    "",
    "[VISUAL STYLE BIBLE]",
    styleBlock,
    "",
    "[WORLD / LOCATION]",
    compact([project.world.name, locationBlock]),
    "",
    "[CHARACTER BIBLE]",
    characterBlock,
    "",
    "[OBJECT BIBLE]",
    propBlock,
    "",
    "[SCENE]",
    compact([`Scene ${scene.number}: ${scene.title}`, scene.summary]),
    "",
    "[SHOT]",
    compact([
      `Shot ${shot.number}: ${shot.title}`,
      shot.action,
      shot.camera ? `Camera: ${shot.camera}` : "",
      shot.cameraMovement ? `Camera movement: ${shot.cameraMovement}` : "",
      `Intended shot duration: ${shot.durationSeconds} seconds.`,
    ]),
    "",
    "[CONTINUITY REQUIREMENT]",
    "Preserve the approved character, prop, location and visual-style references. Do not redesign established elements between shots.",
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
