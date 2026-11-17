"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ProductionProject,
  Scene,
  Shot,
} from "../../lib/production/types";
import { buildShotPrompt } from "../../lib/production/prompt-builder";
import "./production.css";

const PROJECT_ID = "lizard-on-the-loose";

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function createShot(scene: Scene): Shot {
  const nextNumber =
    scene.shots.reduce((highest, shot) => Math.max(highest, shot.number), 0) +
    1;

  return {
    id: `shot-${scene.id}-${Date.now()}`,
    number: nextNumber,
    title: `Snitt ${nextNumber}`,
    durationSeconds: 5,
    camera: "",
    cameraMovement: "",
    action: "",
    prompt: "",
    negativePrompt: "",
    referenceIds: [],
    references: [],
    keyframes: [],
    status: "draft",
    generatedClips: [],
  };
}
export default function ProductionPage() {
  const [project, setProject] = useState<ProductionProject | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProject() {
      try {
        const response = await fetch(`/api/production/projects/${PROJECT_ID}`);
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Nem sikerült betölteni a projektet.");
        if (!active) return;
        setProject(data.project as ProductionProject);
        setSelectedSceneId(data.project.scenes[0]?.id ?? null);
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Ismeretlen betöltési hiba.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProject();
    return () => {
      active = false;
    };
  }, []);

  const selectedScene = useMemo(
    () => project?.scenes.find((scene) => scene.id === selectedSceneId) ?? null,
    [project, selectedSceneId],
  );

  function updateProject(patch: Partial<ProductionProject>) {
    setProject((current) => (current ? { ...current, ...patch } : current));
    setNotice("");
  }

  function updateScene(sceneId: string, patch: Partial<Scene>) {
    setProject((current) =>
      current
        ? {
            ...current,
            scenes: current.scenes.map((scene) =>
              scene.id === sceneId ? { ...scene, ...patch } : scene,
            ),
          }
        : current,
    );
    setNotice("");
  }

  function updateShot(sceneId: string, shotId: string, patch: Partial<Shot>) {
    setProject((current) =>
      current
        ? {
            ...current,
            scenes: current.scenes.map((scene) =>
              scene.id !== sceneId
                ? scene
                : {
                    ...scene,
                    shots: scene.shots.map((shot) =>
                      shot.id === shotId ? { ...shot, ...patch } : shot,
                    ),
                  },
            ),
          }
        : current,
    );
    setNotice("");
  }

  function addShot() {
    if (!selectedScene) return;
    const shot = createShot(selectedScene);
    updateScene(selectedScene.id, { shots: [...selectedScene.shots, shot] });
  }

  async function generateShot(scene: Scene, shot: Shot) {
    if (!project || generatingShotId) return;
    setGeneratingShotId(shot.id);
    setError("");
    setNotice("A snitt mentése és elküldése a Hugging Face Space-nek…");

    try {
      // Előbb elmentjük a legfrissebb biblia- és snittadatokat, hogy a szerver
      // pontosan azt a promptot használja, amit a felületen látunk.
      const saveResponse = await fetch(
        `/api/production/projects/${project.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project }),
        },
      );
      const saveData = await saveResponse.json();
      if (!saveResponse.ok)
        throw new Error(
          saveData.error || "A generálás előtti mentés nem sikerült.",
        );
      setProject(saveData.project as ProductionProject);

      const response = await fetch("/api/production/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          sceneId: scene.id,
          shotId: shot.id,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "A videógenerálás nem sikerült.");

      setProject(data.project as ProductionProject);
      setNotice(`A videó elkészült: ${shot.title}`);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Ismeretlen generálási hiba.",
      );
      // Frissítjük a helyi állapotot, hogy a szerveren rögzített hibastátusz is látszódjon.
      try {
        const refresh = await fetch(`/api/production/projects/${project.id}`);
        const refreshed = await refresh.json();
        if (refresh.ok) setProject(refreshed.project as ProductionProject);
      } catch {
        // Az eredeti generálási hiba maradjon látható.
      }
      setNotice("");
    } finally {
      setGeneratingShotId(null);
    }
  }

  async function saveProject() {
    if (!project) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/production/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A mentés nem sikerült.");
      setProject(data.project as ProductionProject);
      setNotice("A projekt mentése sikerült.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Ismeretlen mentési hiba.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <main className="pb-page">
        <div className="pb-loading">Production Bible betöltése…</div>
      </main>
    );
  if (!project)
    return (
      <main className="pb-page">
        <div className="pb-error">{error || "A projekt nem tölthető be."}</div>
      </main>
    );

  const shotCount = project.scenes.reduce(
    (total, scene) => total + scene.shots.length,
    0,
  );
  const locationName = (locationId: string | null) =>
    project.world.locations.find((location) => location.id === locationId)
      ?.name ?? "Nincs hozzárendelve";

  return (
    <main className="pb-page">
      <div className="pb-shell">
        <header className="pb-header">
          <div>
            <div className="pb-eyebrow">AI VIDEO STUDIO / PRODUCTION</div>
            <h1>Production Bible</h1>
            <p>
              A projekt vizuális és történeti alapja – egyetlen szerkeszthető
              helyen.
            </p>
          </div>
          <button className="pb-save" onClick={saveProject} disabled={saving}>
            {saving ? "Mentés…" : "Projekt mentése"}
          </button>
        </header>

        {error && <div className="pb-alert pb-alert-error">{error}</div>}
        {notice && <div className="pb-alert pb-alert-success">{notice}</div>}

        <section className="pb-project-card">
          <div className="pb-project-topline">
            <span className="pb-status-dot" /> AKTÍV PRODUKCIÓ
          </div>
          <input
            className="pb-project-title"
            value={project.title}
            onChange={(event) => updateProject({ title: event.target.value })}
            aria-label="Projekt címe"
          />
          <textarea
            className="pb-project-description"
            value={project.description}
            onChange={(event) =>
              updateProject({ description: event.target.value })
            }
            aria-label="Projekt leírása"
            rows={2}
          />
          <div className="pb-stats">
            <div>
              <strong>{formatTime(project.durationSeconds)}</strong>
              <span>Teljes hossz</span>
            </div>
            <div>
              <strong>{project.fps} FPS</strong>
              <span>Képkockasebesség</span>
            </div>
            <div>
              <strong>{project.aspectRatio}</strong>
              <span>Képarány</span>
            </div>
            <div>
              <strong>{project.scenes.length}</strong>
              <span>Jelenet</span>
            </div>
            <div>
              <strong>{shotCount}</strong>
              <span>Snitt</span>
            </div>
          </div>
        </section>

        <section className="pb-bible-grid">
          <article className="pb-info-card">
            <div className="pb-card-heading">
              <span>01</span>
              <h2>Character Bible</h2>
            </div>
            {project.characters.map((character) => (
              <div className="pb-asset" key={character.id}>
                <strong>{character.name}</strong>
                <small>{character.role}</small>
                <p>{character.appearance}</p>
                <span className="pb-reference-count">
                  {character.references.length} referencia
                </span>
              </div>
            ))}
          </article>
          <article className="pb-info-card">
            <div className="pb-card-heading">
              <span>02</span>
              <h2>Object Bible</h2>
            </div>
            {project.props.map((prop) => (
              <div className="pb-asset" key={prop.id}>
                <strong>{prop.name}</strong>
                <p>{prop.visualDetails}</p>
                <span className="pb-reference-count">
                  {prop.references.length} referencia
                </span>
              </div>
            ))}
          </article>
          <article className="pb-info-card">
            <div className="pb-card-heading">
              <span>03</span>
              <h2>World Bible</h2>
            </div>
            <div className="pb-asset">
              <strong>{project.world.name}</strong>
              <p>{project.world.description}</p>
            </div>
            <div className="pb-location-list">
              {project.world.locations.map((location) => (
                <span key={location.id}>{location.name}</span>
              ))}
            </div>
          </article>
          <article className="pb-info-card">
            <div className="pb-card-heading">
              <span>04</span>
              <h2>Style Bible</h2>
            </div>
            <div className="pb-style-tags">
              <span>{project.style.medium}</span>
              <span>{project.style.rendering}</span>
              {project.style.colorPalette.map((color) => (
                <span key={color}>{color}</span>
              ))}
            </div>
            <p className="pb-muted">
              {project.style.lighting}. {project.style.cameraLanguage}.
            </p>
          </article>
        </section>

        <section className="pb-storyboard">
          <div className="pb-section-heading">
            <div>
              <div className="pb-eyebrow">05 / STORY STRUCTURE</div>
              <h2>Storyboard</h2>
            </div>
            <span>
              {project.scenes.length} jelenet ·{" "}
              {formatTime(project.durationSeconds)}
            </span>
          </div>
          <div className="pb-storyboard-layout">
            <nav className="pb-scene-list" aria-label="Jelenetek">
              {project.scenes.map((scene) => {
                const duration = scene.endSeconds - scene.startSeconds;
                const isSelected = scene.id === selectedSceneId;
                return (
                  <button
                    key={scene.id}
                    className={`pb-scene-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedSceneId(scene.id)}
                  >
                    <span className="pb-scene-number">
                      {String(scene.number).padStart(2, "0")}
                    </span>
                    <span className="pb-scene-main">
                      <strong>{scene.title}</strong>
                      <small>
                        {formatTime(scene.startSeconds)}–
                        {formatTime(scene.endSeconds)}
                      </small>
                    </span>
                    <span className="pb-scene-duration">{duration}s</span>
                  </button>
                );
              })}
            </nav>

            <div className="pb-scene-editor">
              {selectedScene ? (
                <>
                  <div className="pb-editor-topline">
                    <span>
                      JELENET {String(selectedScene.number).padStart(2, "0")}
                    </span>
                    <span>
                      {formatTime(selectedScene.startSeconds)}–
                      {formatTime(selectedScene.endSeconds)}
                    </span>
                  </div>
                  <label className="pb-field-label">Jelenet címe</label>
                  <input
                    className="pb-input"
                    value={selectedScene.title}
                    onChange={(event) =>
                      updateScene(selectedScene.id, {
                        title: event.target.value,
                      })
                    }
                  />
                  <label className="pb-field-label">Jelenet leírása</label>
                  <textarea
                    className="pb-textarea"
                    rows={3}
                    placeholder="Mi történik ebben a jelenetben?"
                    value={selectedScene.summary}
                    onChange={(event) =>
                      updateScene(selectedScene.id, {
                        summary: event.target.value,
                      })
                    }
                  />
                  <label className="pb-field-label">Helyszín</label>
                  <select
                    className="pb-input"
                    value={selectedScene.locationId ?? ""}
                    onChange={(event) =>
                      updateScene(selectedScene.id, {
                        locationId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Helyszín kiválasztása</option>
                    {project.world.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <div className="pb-assignment-group">
                    <label className="pb-field-label">
                      Karakterek a jelenetben
                    </label>
                    <div className="pb-check-grid">
                      {project.characters.map((character) => (
                        <label className="pb-check-option" key={character.id}>
                          <input
                            type="checkbox"
                            checked={selectedScene.characterIds.includes(
                              character.id,
                            )}
                            onChange={(event) =>
                              updateScene(selectedScene.id, {
                                characterIds: event.target.checked
                                  ? [
                                      ...selectedScene.characterIds,
                                      character.id,
                                    ]
                                  : selectedScene.characterIds.filter(
                                      (id) => id !== character.id,
                                    ),
                              })
                            }
                          />
                          <span>{character.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="pb-assignment-group">
                    <label className="pb-field-label">
                      Tárgyak a jelenetben
                    </label>
                    <div className="pb-check-grid">
                      {project.props.map((prop) => (
                        <label className="pb-check-option" key={prop.id}>
                          <input
                            type="checkbox"
                            checked={selectedScene.propIds.includes(prop.id)}
                            onChange={(event) =>
                              updateScene(selectedScene.id, {
                                propIds: event.target.checked
                                  ? [...selectedScene.propIds, prop.id]
                                  : selectedScene.propIds.filter(
                                      (id) => id !== prop.id,
                                    ),
                              })
                            }
                          />
                          <span>{prop.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="pb-shot-heading">
                    <div>
                      <h3>Snittek</h3>
                      <span>{selectedScene.shots.length} snitt</span>
                    </div>
                    <button className="pb-add-shot" onClick={addShot}>
                      + Snitt hozzáadása
                    </button>
                  </div>
                  {selectedScene.shots.length === 0 ? (
                    <div className="pb-empty-shots">
                      Még nincs snitt ehhez a jelenethez. Hozz létre egyet, és
                      később itt állíthatod be a kamerát, az akciót és a
                      generálási promptot.
                    </div>
                  ) : (
                    selectedScene.shots.map((shot) => (
                      <div className="pb-shot-card" key={shot.id}>
                        <div className="pb-shot-card-top">
                          <strong>
                            {String(shot.number).padStart(2, "0")} /{" "}
                            {shot.title}
                          </strong>
                          <span>{shot.status}</span>
                        </div>
                        <label className="pb-field-label">Snitt címe</label>
                        <input
                          className="pb-input"
                          value={shot.title}
                          onChange={(event) =>
                            updateShot(selectedScene.id, shot.id, {
                              title: event.target.value,
                            })
                          }
                        />
                        <div className="pb-shot-two-col">
                          <div>
                            <label className="pb-field-label">
                              Időtartam (mp)
                            </label>
                            <input
                              className="pb-input"
                              type="number"
                              min="0.5"
                              max="60"
                              step="0.5"
                              value={shot.durationSeconds}
                              onChange={(event) =>
                                updateShot(selectedScene.id, shot.id, {
                                  durationSeconds: Math.min(
                                    60,
                                    Math.max(
                                      0.5,
                                      Number(event.target.value) || 0.5,
                                    ),
                                  ),
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="pb-field-label">
                              Kamerabeállítás
                            </label>
                            <input
                              className="pb-input"
                              value={shot.camera}
                              placeholder="Pl. close-up, wide shot"
                              onChange={(event) =>
                                updateShot(selectedScene.id, shot.id, {
                                  camera: event.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <label className="pb-field-label">
                          Akció / képi leírás
                        </label>
                        <textarea
                          className="pb-textarea"
                          rows={2}
                          value={shot.action}
                          placeholder="Mit látunk a snittben?"
                          onChange={(event) =>
                            updateShot(selectedScene.id, shot.id, {
                              action: event.target.value,
                            })
                          }
                        />
                        <label className="pb-field-label">Kameramozgás</label>
                        <input
                          className="pb-input"
                          value={shot.cameraMovement}
                          placeholder="Pl. tracking shot, dolly-in, handheld"
                          onChange={(event) =>
                            updateShot(selectedScene.id, shot.id, {
                              cameraMovement: event.target.value,
                            })
                          }
                        />
                        <div className="pb-prompt-heading">
                          <label className="pb-field-label">
                            Generálási prompt
                          </label>
                          <button
                            className="pb-prompt-build"
                            onClick={() =>
                              updateShot(selectedScene.id, shot.id, {
                                prompt: buildShotPrompt(
                                  project,
                                  selectedScene,
                                  shot,
                                ),
                              })
                            }
                          >
                            Biblia alapján összeállítás
                          </button>
                        </div>
                        <textarea
                          className="pb-textarea"
                          rows={6}
                          value={shot.prompt}
                          placeholder="Állítsd össze a promptot a Production Bible adataiból, majd finomítsd itt."
                          onChange={(event) =>
                            updateShot(selectedScene.id, shot.id, {
                              prompt: event.target.value,
                            })
                          }
                        />
                        <div className="pb-generation-actions">
                          <button
                            className="pb-generate-shot"
                            onClick={() => generateShot(selectedScene, shot)}
                            disabled={
                              generatingShotId !== null || !shot.prompt.trim()
                            }
                            title={
                              !shot.prompt.trim()
                                ? "Előbb állítsd össze vagy írd meg a promptot."
                                : "Videó generálása Hugging Face Space használatával"
                            }
                          >
                            {generatingShotId === shot.id
                              ? "Generálás folyamatban…"
                              : "▶ Videó generálása"}
                          </button>
                          <span className="pb-generation-hint">
                            LTX Video · ZeroGPU · {shot.durationSeconds} mp
                          </span>
                        </div>
                        {shot.generatedClips.map((clip) => (
                          <div className="pb-generated-clip" key={clip.id}>
                            <div className="pb-generated-clip-heading">
                              <strong>Generált videó</strong>
                              <span>
                                {new Date(clip.createdAt).toLocaleString(
                                  "hu-HU",
                                )}
                              </span>
                            </div>
                            <video
                              controls
                              preload="metadata"
                              src={clip.videoUrl}
                            />
                            <a href={clip.videoUrl} download>
                              MP4 letöltése
                            </a>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                  <div className="pb-scene-meta">
                    Helyszín: {locationName(selectedScene.locationId)} ·
                    Időtartam:{" "}
                    {selectedScene.endSeconds - selectedScene.startSeconds}{" "}
                    másodperc
                  </div>
                </>
              ) : (
                <div className="pb-empty-shots">Válassz ki egy jelenetet.</div>
              )}
            </div>
          </div>
        </section>
        <footer className="pb-footer">
          A Production Bible adatai helyben, a projekt mappájában tárolódnak. A
          generálási pipeline következő lépésben kapcsolódik ehhez az
          adatszerkezethez.
        </footer>
      </div>
    </main>
  );
}
