import Link from "next/link";
import {
  Image as ImageIcon,
  Video,
  Clapperboard,
  ShieldCheck,
  Film,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <main className="shell">
      <header className="top">
        <div className="brand">
          <Clapperboard />
          AI Video Studio
        </div>
        <span className="pill">FREE</span>
      </header>

      <section className="hero">
        <p className="eyebrow">KREATÍV AI MŰHELY</p>
        <h1>
          Ötletből <span>látvány.</span>
        </h1>
        <p className="lead">
          Képek, videók és komplett produkciók készítése egyetlen alkalmazásban.
          Ingyenes szolgáltatásokra tervezve.
        </p>

        <div className="tiles">
          <Link className="tile" href="/image-generator">
            <div className="tileIcon">
              <ImageIcon />
            </div>
            <h2>AI Image Generator</h2>
            <p>Egyszerre akár 4 kép, negatív prompt és többféle képarány.</p>
            <span className="tileLink">Képgenerátor megnyitása →</span>
          </Link>

          <Link className="tile" href="/video-generator">
            <div className="tileIcon">
              <Video />
            </div>
            <h2>AI Video Generator</h2>
            <p>
              Text-to-Video és Image-to-Video, rövid AI-videók készítéséhez.
            </p>
            <span className="tileLink">Videógenerátor megnyitása →</span>
          </Link>

          <Link className="tile" href="/production">
            <div className="tileIcon">
              <Film />
            </div>
            <h2>AI Video Production</h2>
            <p>
              Komplett videóprodukciók tervezése jelenetekkel, snittekkel,
              karakterekkel és vizuális referenciákkal.
            </p>
            <span className="tileLink">
              Production megnyitása <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </section>

      <footer>
        <ShieldCheck size={17} />
        Ingyenes szolgáltatások. A külső GPU-k kapacitása korlátozott lehet.
      </footer>
    </main>
  );
}
