"use client";

import { useRef, useState } from "react";
import {
  Video,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Download,
  Loader2,
  Play,
  X,
} from "lucide-react";

type GenerationMode = "text-to-video" | "image-to-video";

export default function VideoGeneratorPage() {
  const [mode, setMode] = useState<GenerationMode>("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, distorted, low quality, watermark, flickering",
  );
  const [duration, setDuration] = useState(3);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageSelect(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Kérlek, képfájlt válassz.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function generateVideo() {
    if (!prompt.trim()) {
      setError("Először írj be egy promptot!");
      return;
    }

    if (mode === "image-to-video" && !selectedImage) {
      setError("Ehhez a módhoz először tölts fel egy képet!");
      return;
    }

    setLoading(true);
    setError("");
    setVideoUrl("");
    setStatus("Kapcsolódás a videógenerátorhoz...");

    try {
      let response: Response;

      if (mode === "image-to-video") {
        const formData = new FormData();

        formData.append("prompt", prompt);
        formData.append("negativePrompt", negativePrompt);
        formData.append("mode", mode);
        formData.append("duration", String(duration));
        formData.append("image", selectedImage!);

        setStatus("Kép feltöltése és videó generálása...");

        response = await fetch("/api/generate-video", {
          method: "POST",
          body: formData,
        });
      } else {
        setStatus("A videó generálása folyamatban...");

        response = await fetch("/api/generate-video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            negativePrompt,
            mode,
            duration,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "A videógenerálás nem sikerült.");
      }

      if (!data.videoUrl) {
        throw new Error("A generátor nem adott vissza videó URL-t.");
      }

      setVideoUrl(data.videoUrl);
      setStatus("A videó sikeresen elkészült!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba történt.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="video-page">
      <div className="video-container">
        <header className="video-header">
          <div className="video-heading">
            <div className="video-heading-icon">
              <Video className="video-icon" />
            </div>

            <div>
              <h1 className="video-title">AI Video Generator</h1>
              <p className="video-subtitle">
                Készíts videókat mesterséges intelligenciával
              </p>
            </div>
          </div>
        </header>

        <div className="video-layout">
          {/* Beállítások */}
          <section className="video-panel">
            <h2 className="video-section-title">Generálási beállítások</h2>

            {/* Módválasztás */}
            <div className="video-mode-grid">
              <button
                type="button"
                onClick={() => {
                  setMode("text-to-video");
                  setError("");
                }}
                disabled={loading}
                className={`video-mode-button ${
                  mode === "text-to-video" ? "active" : ""
                }`}
              >
                <Video className="video-mode-icon" />
                <span className="video-mode-name">Text to Video</span>
                <span className="video-mode-description">Videó szövegből</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("image-to-video");
                  setError("");
                }}
                disabled={loading}
                className={`video-mode-button ${
                  mode === "image-to-video" ? "active" : ""
                }`}
              >
                <ImageIcon className="video-mode-icon" />
                <span className="video-mode-name">Image to Video</span>
                <span className="video-mode-description">Videó képből</span>
              </button>
            </div>

            {/* Képfeltöltés */}
            {mode === "image-to-video" && (
              <div className="video-field video-image-field">
                <label className="video-label">Kiinduló kép</label>

                {imagePreview ? (
                  <div className="video-image-preview">
                    <img
                      src={imagePreview}
                      alt="Feltöltött kép"
                      className="video-preview-image"
                    />

                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={loading}
                      className="video-remove-image"
                      aria-label="Kép eltávolítása"
                    >
                      <X className="video-small-icon" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="video-upload-button"
                  >
                    <Upload className="video-upload-icon" />
                    <span className="video-upload-title">Kép kiválasztása</span>
                    <span className="video-upload-description">
                      PNG, JPG vagy WEBP
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="video-hidden-input"
                  onChange={(e) => handleImageSelect(e.target.files?.[0])}
                />
              </div>
            )}

            {/* Prompt */}
            <div className="video-field video-prompt-field">
              <label className="video-label">Prompt</label>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create..."
                rows={5}
                disabled={loading}
                className="video-textarea video-prompt-textarea"
              />
            </div>

            {/* Negative prompt */}
            <div className="video-field video-negative-field">
              <label className="video-label">Negative prompt</label>

              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={3}
                disabled={loading}
                className="video-textarea video-negative-textarea"
              />
            </div>

            {/* Időtartam */}
            <div className="video-duration-field">
              <div className="video-duration-heading">
                <label className="video-label">Videó hossza</label>

                <span className="video-duration-value">
                  {duration.toFixed(1)} mp
                </span>
              </div>

              <input
                type="range"
                min="0.3"
                max="8.5"
                step="0.1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={loading}
                className="video-range"
              />

              <div className="video-range-labels">
                <span>0,3 mp</span>
                <span>8,5 mp</span>
              </div>
            </div>

            {/* Generálás */}
            <button
              type="button"
              onClick={generateVideo}
              disabled={loading}
              className="video-generate-button"
            >
              {loading ? (
                <>
                  <Loader2 className="video-button-icon video-spin" />
                  Generálás folyamatban...
                </>
              ) : (
                <>
                  <Sparkles className="video-button-icon" />
                  Videó generálása
                </>
              )}
            </button>

            {status && <p className="video-status">{status}</p>}

            {error && <div className="video-error">{error}</div>}
          </section>

          {/* Eredmény */}
          <section className="video-panel video-result-panel">
            <div className="video-result-heading">
              <h2 className="video-section-title">Generált videó</h2>

              {videoUrl && (
                <span className="video-success-badge">Elkészült</span>
              )}
            </div>

            <div className="video-result-area">
              {videoUrl ? (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  playsInline
                  className="video-player"
                >
                  A böngésződ nem támogatja a videólejátszást.
                </video>
              ) : loading ? (
                <div className="video-placeholder">
                  <Loader2 className="video-loading-icon video-spin" />
                  <p className="video-placeholder-title">
                    A mesterséges intelligencia dolgozik...
                  </p>
                  <p className="video-placeholder-description">
                    Ez eltarthat néhány percig.
                  </p>
                </div>
              ) : (
                <div className="video-placeholder">
                  <Play className="video-placeholder-icon" />
                  <p className="video-placeholder-title">
                    Itt jelenik meg az elkészült videó
                  </p>
                  <p className="video-placeholder-description">
                    Add meg a promptot, majd indítsd el a generálást.
                  </p>
                </div>
              )}
            </div>

            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="video-download-button"
              >
                <Download className="video-button-icon" />
                Videó letöltése
              </a>
            )}
          </section>
        </div>

        <footer className="video-footer">
          AI Video Studio · Hugging Face LTX Video · Ingyenes GPU-kapacitás
          rendelkezésre állásától függően
        </footer>
      </div>
    </main>
  );
}
