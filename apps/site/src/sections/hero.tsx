import { useEffect, useRef, useState } from "react";
import { DEMO_URL, REPO } from "../content";
import { d } from "./reveal";

/* The motif: a round table seen from above, with plates and chairs. */
function Table() {
  const chairs = Array.from({ length: 8 }, (_, i) => i * 45);
  const plates = Array.from({ length: 8 }, (_, i) => i * 45 + 22.5);
  return (
    <svg viewBox="0 0 1000 1000" aria-hidden>
      <circle cx="500" cy="500" r="300" fill="var(--accent)" />
      {plates.map((a) => (
        <circle key={a} r="46" fill="var(--bg)" transform={`rotate(${a} 500 500) translate(500 292)`} />
      ))}
      <circle cx="500" cy="500" r="64" fill="var(--bg)" />
      {chairs.map((a) => (
        <rect
          key={a}
          x="-80"
          y="-46"
          width="160"
          height="92"
          rx="30"
          fill="var(--accent)"
          transform={`rotate(${a} 500 500) translate(500 118)`}
        />
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div className="table-art rv" style={d(0)}>
        <Table />
      </div>
      <div className="copy">
        <h1 className="rv" style={d(0)}>Tu libro de reservas es tuyo</h1>
        <p className="lead rv" style={d(90)}>
          Motor de reservas open source para restaurantes. El local lo usa con una app de sala y un widget de reserva; las plataformas y los agentes, por la API y el servidor MCP.
        </p>
        <div className="acts rv" style={d(180)}>
          {DEMO_URL && <a className="btn accent" href={DEMO_URL}>Probar la demo</a>}
          <a className={DEMO_URL ? "btn" : "btn accent"} href={`${REPO}#quick-start`}>Empieza ahora</a>
          <a className="btn ghost" href={REPO}>Ver en GitHub</a>
        </div>
        <p className="status rv" style={d(260)}>Pre-alfa · Apache-2.0 · 18 herramientas MCP</p>
      </div>
    </section>
  );
}

export function Intro() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const v = videoRef.current;
    if (v && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      setPlaying(false);
    }
  }, []);
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };
  return (
    <section className="intro">
      <p className="rv">
        Tu libro de reservas vive dentro del CRM o del proveedor, y cambiar es arriesgar el histórico.
        OpenCovers lo separa de todo.
      </p>
      <div className="win rv" style={d(120)} data-ui>
        <div className="bar" aria-hidden>
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
          <b>OpenCovers — La Taberna del Faro</b>
        </div>
        <video ref={videoRef} autoPlay muted loop playsInline preload="metadata" poster="/media/opencovers-demo-poster.webp" aria-label="Demo de OpenCovers: agenda del día, reservas desde el widget y el servidor MCP rechazando una doble reserva">
          <source src="/media/opencovers-demo.mp4" type="video/mp4" />
        </video>
        <button type="button" className="vtoggle" onClick={toggle}>
          {playing ? "Pausar vídeo" : "Reproducir vídeo"}
        </button>
      </div>
    </section>
  );
}

