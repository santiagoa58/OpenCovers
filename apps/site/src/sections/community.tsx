import { useState, type CSSProperties } from "react";
import { cardColors, challenges, commands, faqs, GOOD_FIRST_ISSUES, markColors, markHeights, REPO } from "../content";
import { GithubButton } from "./navigation";
import { d } from "./reveal";

export function Brigada() {
  return (
    <section id="brigada" className="brig">
      <div className="top">
        <h2 className="rv">La Brigada</h2>
        <p className="rv" style={d(90)}>
          Cada tarea acotada es un cubierto. Reclama uno, resuélvelo y súbelo como PR.
        </p>
      </div>
      <ul>
        {challenges.map((c, i) => (
          <li key={c.title} className="rv" style={d((i % 2) * 80)}>
            <a href={GOOD_FIRST_ISSUES}>
              <span className="n"><i />{c.title}</span>
              <small>{c.tag}</small>
              <p>{c.body}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="faq">
      <div className="col">
        <h2 className="rv">Preguntas</h2>
        <div className="stack">
          {faqs.map((f, i) => (
            <div
              key={f.q}
              className="card rv"
              data-open={open === i}
              style={{ ...d(0), "--c": cardColors[i], "--i": i, zIndex: i + 1 } as CSSProperties}
            >
              <span className="tab" aria-hidden />
              <button className="q" type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
              </button>
              <div className="a">
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the commands stay selectable */
    }
  };
  return (
    <section id="empezar" className="cta">
      <div className="l">
        <h2 className="rv">Hazlo tuyo.</h2>
        <p className="rv" style={d(90)}>
          Clona el repositorio, levanta PostgreSQL con Docker y monta tu primer local. Necesitas Node.js 22.9+, pnpm y Docker.
        </p>
      </div>
      <div className="r">
        <div className="dlg rv" style={d(120)} data-ui>
          <h3>Arranca en local</h3>
          <pre><code>{commands}</code></pre>
          <div className="acts">
            <a className="btn accent" href={`${REPO}#quick-start`}>Ir al repositorio</a>
            <button className="btn alt" type="button" onClick={copy}>{copied ? "Copiado" : "Copiar comandos"}</button>
          </div>
          <small>API en :3000, web en :5173. Crea una cuenta y monta tu primer local.</small>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="mark" aria-label="OpenCovers" role="img">
        {"OpenCovers".split("").map((ch, i) => (
          <span key={i} aria-hidden style={{ "--c": markColors[i], "--h": `${markHeights[i]}%` } as CSSProperties}>
            {ch}
          </span>
        ))}
      </div>
      <div className="cols">
        <ul>
          <li><a href={REPO}>Repositorio</a></li>
          <li><a href={`${REPO}/issues`}>Cubiertos</a></li>
        </ul>
        <ul>
          <li><a href={`${REPO}/blob/main/CONTRIBUTING.md`}>Contribuir</a></li>
          <li><a href={`${REPO}/blob/main/ROADMAP.md`}>Roadmap</a></li>
        </ul>
        <ul>
          <li><a href={`${REPO}/blob/main/LICENSE`}>Apache-2.0</a></li>
          <li><a href="/privacidad.html">Privacidad</a></li>
          <li><a href="/en/" hrefLang="en" lang="en">English</a></li>
        </ul>
        <p className="who">Motor de reservas open source para restaurantes. Pre-alfa.</p>
      </div>
      <div className="last">
        <span>© OpenCovers</span>
        <GithubButton />
      </div>
    </footer>
  );
}
