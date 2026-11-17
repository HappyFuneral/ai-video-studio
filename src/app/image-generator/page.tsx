"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  LoaderCircle,
} from "lucide-react";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    setImages([]);
    setStatus("Kapcsolódás a képgenerátorhoz...");

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: negative,
          aspectRatio: ratio,
          count,
        }),
      });

      const raw = await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        console.error("Nem JSON választ kaptunk:", raw);

        throw new Error(
          `A szerver nem JSON választ adott. HTTP: ${response.status}. ` +
            `Válasz: ${raw.slice(0, 300)}`,
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "A generálás nem sikerült.");
      }

      setImages(data.images || []);
      setStatus(data.message || "Elkészült.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <Link className="back" href="/">
        <ArrowLeft size={16} /> Vissza a főoldalra
      </Link>

      <p className="eyebrow">KÉPGENERÁLÁS</p>
      <h1>
        AI Image <span>Generator</span>
      </h1>
      <p className="lead">
        Készíts akár négy képet egyetlen generálási körben. A 30 másodperc
        célidő, nem garantált határidő.
      </p>

      <section className="panel form">
        <label>
          Prompt
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Írd le, milyen képet szeretnél..."
          />
        </label>

        <label>
          Negatív prompt
          <textarea
            rows={2}
            value={negative}
            onChange={(e) => setNegative(e.target.value)}
            placeholder="Mit ne tartalmazzon a kép?"
          />
        </label>

        <div className="controls">
          <label>
            Képarány
            <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
              <option>1:1</option>
              <option>16:9</option>
              <option>9:16</option>
              <option>4:3</option>
            </select>
          </label>

          <label>
            Képek száma
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="primary"
          disabled={busy || !prompt.trim()}
          onClick={generate}
        >
          {busy ? (
            <>
              <LoaderCircle className="spin" />
              Generálás...
            </>
          ) : (
            <>
              <ImageIcon />
              Képek generálása
            </>
          )}
        </button>

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {images.length > 0 && (
        <section className="results">
          <h2>Elkészült képek</h2>
          <div className="imageGrid">
            {images.map((src, index) => (
              <div className="imageCard" key={`${src}-${index}`}>
                <img src={src} alt={`Generált kép ${index + 1}`} />
                <a href={src} target="_blank" rel="noreferrer">
                  <Download size={15} /> Kép megnyitása / mentése
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="hint">
        Ha a Space API-ja megváltozik vagy nem elérhető, az alkalmazás
        hibaüzenetet jelenít meg.
      </p>
    </main>
  );
}
