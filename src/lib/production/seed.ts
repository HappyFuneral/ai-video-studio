import type { ProductionProject, Scene } from "./types";

const sceneDefinitions: Array<{ title: string; start: number; end: number }> = [
  { title: "Ignition", start: 0, end: 14 },
  { title: "The Drop", start: 14, end: 36 },
  { title: "Trash-Can Ollies and Kickflip", start: 36, end: 47 },
  { title: "Stairs and Rail", start: 47, end: 57 },
  { title: "Neighborhood Wakes", start: 57, end: 76 },
  { title: "Neon Alleys", start: 76, end: 95 },
  { title: "Underpass", start: 95, end: 104 },
  { title: "Rooftop Solo", start: 104, end: 121 },
  { title: "The Cellar", start: 121, end: 140 },
  { title: "The Pit", start: 140, end: 162 },
  { title: "Launch", start: 162, end: 176 },
  { title: "Landing and Title", start: 176, end: 185 },
];

const scenes: Scene[] = sceneDefinitions.map((scene, index) => ({
  id: `scene-${String(index + 1).padStart(2, "0")}`,
  number: index + 1,
  title: scene.title,
  startSeconds: scene.start,
  endSeconds: scene.end,
  summary: "",
  locationId: null,
  characterIds: ["lizard-main"],
  propIds: [],
  shots: [],
}));

export function createInitialProject(): ProductionProject {
  const now = new Date().toISOString();

  return {
    id: "lizard-on-the-loose",
    title: "Lizard on the Loose",
    description:
      "3:05 perces, stylized 3D punk animációs videóklip egy zöld, antropomorf gyík gördeszkás-gitáros főszereplésével.",
    durationSeconds: 185,
    fps: 24,
    aspectRatio: "16:9",
    masterResolution: "1920x1080",
    musicBpm: 180,
    characters: [
      {
        id: "lizard-main",
        name: "Lizard",
        role: "Főszereplő – gördeszkás gitáros",
        appearance: "Zöld, antropomorf gyík. A pontos karakterjegyeket a karakter-referenciaképek és a későbbi karakterlap rögzíti.",
        clothing: "Nincs még részletesen rögzítve.",
        personality: "Punk, energikus, vagány előadásmód.",
        continuityRules: [
          "A karakter külső megjelenése minden snittben maradjon következetes.",
          "A végleges színeket, arányokat és ruházatot a jóváhagyott karakter-referencia rögzíti.",
        ],
        references: [],
      },
    ],
    props: [
      {
        id: "black-kramer-guitar",
        name: "Fekete Kramer-stílusú gitár",
        description: "A főszereplő elektromos gitárja.",
        visualDetails: "Fekete Kramer-stílusú elektromos gitár; a pontos formai részleteket referencia rögzíti.",
        continuityRules: ["A gitár formája és színe snittről snittre maradjon azonos."],
        references: [],
      },
      {
        id: "purple-skateboard",
        name: "Lila gördeszka",
        description: "A főszereplő gördeszkája.",
        visualDetails: "Lila gördeszka; a pontos grafika és alkatrészek később rögzíthetők.",
        continuityRules: ["A deszka színe és kialakítása maradjon következetes."],
        references: [],
      },
    ],
    world: {
      name: "Rust Row",
      description: "A klip stilizált, urbánus punk világa.",
      locations: [
        { id: "kessler-avenue", name: "Kessler Avenue", description: "", timeOfDay: "", atmosphere: "", visualDetails: "", references: [] },
        { id: "needle-alley", name: "Needle Alley", description: "", timeOfDay: "", atmosphere: "", visualDetails: "", references: [] },
        { id: "the-underpass", name: "The Underpass", description: "", timeOfDay: "", atmosphere: "", visualDetails: "", references: [] },
        { id: "the-foundry-roof", name: "The Foundry roof", description: "", timeOfDay: "", atmosphere: "", visualDetails: "", references: [] },
        { id: "the-cellar", name: "The Cellar", description: "", timeOfDay: "", atmosphere: "", visualDetails: "", references: [] },
        { id: "the-pit", name: "The Pit", description: "", timeOfDay: "", atmosphere: "", visualDetails: "", references: [] },
      ],
    },
    style: {
      medium: "Stylized 3D animation",
      rendering: "Hand-painted comic texture, vastag fekete kontúrok",
      colorPalette: ["neon magenta", "teal", "acid yellow"],
      lighting: "Filmes, kontrasztos fényelés",
      cameraLanguage: "Anamorf képi világ, sekély mélységélesség",
      texture: "Gritty urban realism, képregényes felületi textúrák",
      continuityRules: [
        "A vizuális stílus minden jelenetben maradjon egységes.",
        "A karakter- és tárgyreferenciák elsőbbséget élveznek a szabad szöveges prompttal szemben.",
      ],
      references: [],
    },
    scenes,
    createdAt: now,
    updatedAt: now,
  };
}
