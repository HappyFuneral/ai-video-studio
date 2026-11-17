"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImagePlus,
  Trash2,
  Save,
  LoaderCircle,
  Film,
  Camera,
  Clock,
} from "lucide-react";

import type {
  ProductionProject,
  ReferenceAsset,
  ReferenceKind,
  Keyframe,
} from "../../../lib/production/types";

import "./references.css";

type TargetType = "character" | "object" | "location" | "shot";
type AssetMode = "reference" | "keyframe";

interface ReferenceTarget {
  id: string;
  name: string;
}

export default function ReferencesPage() {
  const [project, setProject] = useState<ProductionProject | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("character");
  const [targetId, setTargetId] = useState("");
  const [assetMode, setAssetMode] = useState<AssetMode>("reference");
  const [keyframeTime, setKeyframeTime] = useState(0);
  const [keyframeDescription, setKeyframeDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/production");

        if (!response.ok) {
          throw new Error("Nem sikerült betölteni a projektet.");
        }

        const data = await response.json();
        const loadedProject = data.project as ProductionProject;

        if (!loadedProject) {
          throw new Error("A projekt adatai nem találhatók.");
        }

        setProject(loadedProject);

        const firstCharacter = loadedProject.characters?.[0];

        if (firstCharacter) {
          setTargetId(firstCharacter.id);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Betöltési hiba.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const targets = useMemo<ReferenceTarget[]>(() => {
    if (!project) return [];

    if (targetType === "character") {
      return project.characters.map((item) => ({
        id: item.id,
        name: item.name,
      }));
    }

    if (targetType === "object") {
      return project.props.map((item) => ({
        id: item.id,
        name: item.name,
      }));
    }

    if (targetType === "location") {
      return project.world.locations.map((item) => ({
        id: item.id,
        name: item.name,
      }));
    }

    return project.scenes.flatMap((scene) =>
      scene.shots.map((shot) => ({
        id: shot.id,
        name: `${scene.title} / ${shot.title}`,
      })),
    );
  }, [project, targetType]);

  const selectedShot =
    targetType === "shot" && project
      ? project.scenes
          .flatMap((scene) => scene.shots)
          .find((shot) => shot.id === targetId)
      : undefined;

  const selectedEntity = project
    ? targetType === "character"
      ? project.characters.find((item) => item.id === targetId)
      : targetType === "object"
        ? project.props.find((item) => item.id === targetId)
        : targetType === "location"
          ? project.world.locations.find((item) => item.id === targetId)
          : selectedShot
    : undefined;

  const references: ReferenceAsset[] = selectedEntity?.references ?? [];

  const keyframes: Keyframe[] = selectedShot?.keyframes ?? [];

  function changeTargetType(value: TargetType) {
    setTargetType(value);
    setAssetMode("reference");

    if (!project) {
      setTargetId("");
      return;
    }

    const nextTargets =
      value === "character"
        ? project.characters
        : value === "object"
          ? project.props
          : value === "location"
            ? project.world.locations
            : project.scenes.flatMap((scene) => scene.shots);

    setTargetId(nextTargets[0]?.id || "");
  }

  function getReferenceKind(): ReferenceKind {
    if (targetType === "character") return "character";
    if (targetType === "object") return "object";
    if (targetType === "location") return "location";
    return "other";
  }

  function addReference(url: string, filename: string) {
    const reference: ReferenceAsset = {
      id: `reference-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: filename,
      kind: getReferenceKind(),
      filePath: url,
      notes: "",
      createdAt: new Date().toISOString(),
    };

    setProject((current) => {
      if (!current) return current;

      if (targetType === "character") {
        return {
          ...current,
          characters: current.characters.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  references: [...(item.references ?? []), reference],
                }
              : item,
          ),
        };
      }

      if (targetType === "object") {
        return {
          ...current,
          props: current.props.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  references: [...(item.references ?? []), reference],
                }
              : item,
          ),
        };
      }

      if (targetType === "location") {
        return {
          ...current,
          world: {
            ...current.world,
            locations: current.world.locations.map((item) =>
              item.id === targetId
                ? {
                    ...item,
                    references: [...(item.references ?? []), reference],
                  }
                : item,
            ),
          },
        };
      }

      return {
        ...current,
        scenes: current.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) =>
            shot.id === targetId
              ? {
                  ...shot,
                  references: [...(shot.references ?? []), reference],
                }
              : shot,
          ),
        })),
      };
    });
  }

  function addKeyframe(url: string) {
    const keyframe: Keyframe = {
      id: `keyframe-${Date.now()}`,
      timeSeconds: Math.max(0, keyframeTime),
      image: url,
      description: keyframeDescription,
    };

    setProject((current) => {
      if (!current) return current;

      return {
        ...current,
        scenes: current.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) =>
            shot.id === targetId
              ? {
                  ...shot,
                  keyframes: [...(shot.keyframes ?? []), keyframe].sort(
                    (a, b) => a.timeSeconds - b.timeSeconds,
                  ),
                }
              : shot,
          ),
        })),
      };
    });

    setKeyframeDescription("");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/production/references", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Feltöltési hiba.");
      }

      if (!data.url) {
        throw new Error("A feltöltés nem adott vissza kép-URL-t.");
      }

      if (assetMode === "keyframe") {
        addKeyframe(data.url);
        setMessage("A keyframe hozzáadva.");
      } else {
        addReference(data.url, data.filename || file.name);
        setMessage("A referencia hozzáadva.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Feltöltési hiba.");
    } finally {
      setUploading(false);
    }
  }

  function removeReference(index: number) {
    setProject((current) => {
      if (!current) return current;

      if (targetType === "character") {
        return {
          ...current,
          characters: current.characters.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  references: (item.references ?? []).filter(
                    (_, i) => i !== index,
                  ),
                }
              : item,
          ),
        };
      }

      if (targetType === "object") {
        return {
          ...current,
          props: current.props.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  references: (item.references ?? []).filter(
                    (_, i) => i !== index,
                  ),
                }
              : item,
          ),
        };
      }

      if (targetType === "location") {
        return {
          ...current,
          world: {
            ...current.world,
            locations: current.world.locations.map((item) =>
              item.id === targetId
                ? {
                    ...item,
                    references: (item.references ?? []).filter(
                      (_, i) => i !== index,
                    ),
                  }
                : item,
            ),
          },
        };
      }

      return {
        ...current,
        scenes: current.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) =>
            shot.id === targetId
              ? {
                  ...shot,
                  references: (shot.references ?? []).filter(
                    (_, i) => i !== index,
                  ),
                }
              : shot,
          ),
        })),
      };
    });
  }

  function removeKeyframe(id: string) {
    setProject((current) => {
      if (!current) return current;

      return {
        ...current,
        scenes: current.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) =>
            shot.id === targetId
              ? {
                  ...shot,
                  keyframes: (shot.keyframes ?? []).filter(
                    (item) => item.id !== id,
                  ),
                }
              : shot,
          ),
        })),
      };
    });
  }

  async function saveProject() {
    if (!project) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/production", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Mentési hiba.");
      }

      setMessage("A referenciák és keyframe-ek elmentve.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mentési hiba.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="references-page">
        <LoaderCircle className="production-spin" />
        <p>Reference Manager betöltése...</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="references-page">
        <p>{message || "Nem található projekt."}</p>
      </main>
    );
  }

  return (
    <main className="references-page">
      <header className="references-header">
        <div>
          <Link href="/production" className="references-back">
            <ArrowLeft size={16} />
            Vissza a Production Bible oldalra
          </Link>

          <div className="references-eyebrow">
            <Camera size={15} />
            AI VIDEO STUDIO / REFERENCES
          </div>

          <h1>Reference Manager</h1>
          <p>Referenciaképek és időzített keyframe-ek kezelése.</p>
        </div>

        <button
          className="production-save"
          onClick={saveProject}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle className="production-spin" size={17} />
          ) : (
            <Save size={17} />
          )}
          {saving ? "Mentés..." : "Mentés"}
        </button>
      </header>

      {message && (
        <div className="production-message" role="status">
          {message}
        </div>
      )}

      <section className="references-panel">
        <h2>1. Válaszd ki, mihez rendelsz képet</h2>

        <div className="references-controls">
          <div>
            <label>Elem típusa</label>
            <select
              value={targetType}
              onChange={(e) => changeTargetType(e.target.value as TargetType)}
            >
              <option value="character">Karakter</option>
              <option value="object">Tárgy</option>
              <option value="location">Helyszín</option>
              <option value="shot">Snitt</option>
            </select>
          </div>

          <div>
            <label>Elem</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!targets.length && (
          <p className="references-empty">
            Ehhez a kategóriához még nincs elem. Előbb hozz létre egy snittet
            vagy egy Production Bible elemet.
          </p>
        )}
      </section>

      {selectedEntity && (
        <>
          <section className="references-panel">
            <h2>2. Kép hozzáadása</h2>

            <div className="references-mode">
              <button
                className={assetMode === "reference" ? "active" : ""}
                onClick={() => setAssetMode("reference")}
              >
                <ImagePlus size={16} />
                Referenciakép
              </button>

              <button
                className={assetMode === "keyframe" ? "active" : ""}
                disabled={targetType !== "shot"}
                onClick={() => setAssetMode("keyframe")}
              >
                <Film size={16} />
                Keyframe
              </button>
            </div>

            {assetMode === "keyframe" && (
              <div className="references-keyframe-fields">
                <div>
                  <label>
                    <Clock size={14} />
                    Időpont (másodperc)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedShot?.durationSeconds ?? 20}
                    step="0.1"
                    value={keyframeTime}
                    onChange={(e) => setKeyframeTime(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Keyframe leírása</label>
                  <input
                    value={keyframeDescription}
                    onChange={(e) => setKeyframeDescription(e.target.value)}
                    placeholder="Pl. a gyík elrugaszkodik a rámpáról"
                  />
                </div>
              </div>
            )}

            <label className="references-upload">
              {uploading ? (
                <LoaderCircle className="production-spin" size={24} />
              ) : (
                <ImagePlus size={26} />
              )}

              <strong>
                {uploading ? "Feltöltés..." : "Kattints ide képfeltöltéshez"}
              </strong>

              <span>JPG, PNG vagy WebP · maximum 12 MB</span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </section>

          {assetMode === "reference" && (
            <section className="references-panel">
              <h2>3. Referenciaképek ({references.length})</h2>

              {references.length === 0 ? (
                <p className="references-empty">
                  Még nincs referencia ehhez az elemhez.
                </p>
              ) : (
                <div className="references-grid">
                  {references.map((reference, index) => (
                    <article
                      className="references-image-card"
                      key={reference.id}
                    >
                      <img
                        src={reference.filePath}
                        alt={reference.name || `Referencia ${index + 1}`}
                      />

                      <div>
                        <span>
                          {reference.name || `Referencia ${index + 1}`}
                        </span>
                        <button
                          onClick={() => removeReference(index)}
                          title="Eltávolítás a projektből"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {assetMode === "keyframe" && targetType === "shot" && (
            <section className="references-panel">
              <h2>3. Keyframe idővonal ({keyframes.length})</h2>

              {keyframes.length === 0 ? (
                <p className="references-empty">
                  Ehhez a snitthez még nincs keyframe.
                </p>
              ) : (
                <div className="references-keyframe-list">
                  {keyframes.map((keyframe) => (
                    <article
                      className="references-keyframe-card"
                      key={keyframe.id}
                    >
                      <img
                        src={keyframe.image}
                        alt={keyframe.description || "Keyframe"}
                      />

                      <div className="references-keyframe-info">
                        <strong>{keyframe.timeSeconds.toFixed(1)} mp</strong>
                        <p>{keyframe.description || "Nincs leírás"}</p>
                      </div>

                      <button
                        onClick={() => removeKeyframe(keyframe.id)}
                        title="Keyframe eltávolítása"
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
