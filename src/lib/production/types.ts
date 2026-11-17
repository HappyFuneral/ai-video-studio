export type ReferenceKind =
  | "character"
  | "object"
  | "location"
  | "style"
  | "keyframe"
  | "other";

export interface ReferenceAsset {
  id: string;
  name: string;
  kind: ReferenceKind;
  filePath: string;
  notes: string;
  createdAt: string;
}

export interface CharacterBibleEntry {
  id: string;
  name: string;
  role: string;
  appearance: string;
  clothing: string;
  personality: string;
  continuityRules: string[];
  references: ReferenceAsset[];
}

export interface PropBibleEntry {
  id: string;
  name: string;
  description: string;
  visualDetails: string;
  continuityRules: string[];
  references: ReferenceAsset[];
}

export interface LocationBibleEntry {
  id: string;
  name: string;
  description: string;
  timeOfDay: string;
  atmosphere: string;
  visualDetails: string;
  references: ReferenceAsset[];
}

export interface WorldBible {
  name: string;
  description: string;
  locations: LocationBibleEntry[];
}

export interface StyleBible {
  medium: string;
  rendering: string;
  colorPalette: string[];
  lighting: string;
  cameraLanguage: string;
  texture: string;
  continuityRules: string[];
  references: ReferenceAsset[];
}

export type ShotStatus =
  | "draft"
  | "ready"
  | "generating"
  | "generated"
  | "approved"
  | "failed";

export interface Keyframe {
  id: string;
  timeSeconds: number;
  image: string;
  description: string;
}

export interface GeneratedClip {
  id: string;
  provider: string;
  model: string;
  videoPath: string;
  videoUrl: string;
  durationSeconds: number;
  createdAt: string;
  status: "generated" | "approved" | "rejected";
  notes: string;
}

export interface Shot {
  id: string;
  number: number;
  title: string;
  durationSeconds: number;
  camera: string;
  cameraMovement: string;
  action: string;
  prompt: string;
  negativePrompt: string;
  referenceIds: string[];
  references: ReferenceAsset[];
  keyframes: Keyframe[];
  status: ShotStatus;
  generatedClips: GeneratedClip[];
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  startSeconds: number;
  endSeconds: number;
  summary: string;
  locationId: string | null;
  characterIds: string[];
  propIds: string[];
  shots: Shot[];
}

export interface ProductionProject {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  fps: number;
  aspectRatio: string;
  masterResolution: string;
  musicBpm: number | null;
  characters: CharacterBibleEntry[];
  props: PropBibleEntry[];
  world: WorldBible;
  style: StyleBible;
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
}
