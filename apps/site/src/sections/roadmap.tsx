import type { CSSProperties } from "react";
import { REPO, cardColors } from "../content";
import { notPlanned, phases, today, type Phase, type Today } from "../roadmap";
import { d } from "./reveal";

const ROADMAP_URL = `${REPO}/blob/main/ROADMAP.md`;

function PhaseItem({ p, i }: { p: Phase; i: number }) {
  return (
    <li className="ph rv" style={{ ...d((i % 2) * 80), "--c": cardColors[i % cardColors.length] } as CSSProperties}>
      <span className="n" aria-hidden>{p.n}</span>
      <div className="main">
        <h3><span className="sr">Fase {p.n}. </span>{p.title}</h3>
        <p>{p.summary}</p>
        <p className="exit"><small>Meta</small> {p.exit}</p>
      </div>
      <div className="side">
        <ul>
          {p.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        <a href={ROADMAP_URL}>Ver todas las tareas</a>
      </div>
    </li>
  );
}

function TodayRow({ r }: { r: Today }) {
  return (
    <tr>
      <th scope="row">{r.area}</th>
      <td>{r.now}</td>
      <td className="tgt">{r.target}</td>
      <td className="ph-n">{r.phase}</td>
    </tr>
  );
}

function NotPlannedItem({ s }: { s: string }) {
  const at = s.indexOf(". ");
  return (
    <li>
      <b>{s.slice(0, at + 1)}</b> {s.slice(at + 2)}
    </li>
  );
}

export function Roadmap() {
  return (
    <section id="hoja-de-ruta" className="road" aria-labelledby="road-h">
      <div className="top">
        <h2 id="road-h" className="rv">Hoja de ruta</h2>
        <p className="rv" style={d(90)}>
          De un motor que funciona a la madurez de una plataforma completa. Elige una fase y ponte a trabajar.
        </p>
      </div>
      <ol className="phases">
        {phases.map((p, i) => (
          <PhaseItem key={p.n} p={p} i={i} />
        ))}
      </ol>
      <div className="now">
        <h3 className="rv">Dónde estamos hoy</h3>
        <table className="rv">
          <caption className="sr">Estado actual por área, objetivo y fase</caption>
          <thead>
            <tr>
              <th scope="col">Área</th>
              <th scope="col">Hoy</th>
              <th scope="col" className="tgt">Objetivo</th>
              <th scope="col">Fase</th>
            </tr>
          </thead>
          <tbody>
            {today.map((r) => (
              <TodayRow key={r.area} r={r} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="never">
        <h3 className="rv">No haremos</h3>
        <ul>
          {notPlanned.map((s) => (
            <NotPlannedItem key={s} s={s} />
          ))}
        </ul>
      </div>
      <div className="acts rv">
        <a className="btn accent" href={ROADMAP_URL}>Ver la hoja de ruta completa</a>
        <a className="btn ghost" href={`${REPO}/issues`}>Ver tareas abiertas</a>
      </div>
    </section>
  );
}

