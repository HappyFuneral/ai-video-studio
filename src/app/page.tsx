import Link from "next/link";
import {
  Image as ImageIcon,
  Video,
  Clapperboard,
  ShieldCheck,
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
          Képek és videók készítése egyetlen alkalmazásban. Ingyenes
          szolgáltatásokra tervezve.
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
              Text-to-Video és Image-to-Video, akár 180 másodperces
              projekttervvel.
            </p>
            <span className="tileLink">Videógenerátor megnyitása →</span>
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
