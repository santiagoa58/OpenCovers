import { useEffect, useRef, useState } from "react";
import { modules, tiles } from "../content";
import { d } from "./reveal";

export function How() {
  return (
    <section className="how" aria-labelledby="how-h">
      <h2 id="how-h" className="rv">Así está hecho</h2>
      <div className="tiles">
        {tiles.map((t, i) => (
          <div key={t.h} className="tile rv" style={d(i * 80)}>
            <h3>{t.h}</h3>
            <p>{t.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Modules() {
  const [active, setActive] = useState(2);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLElement>("li");
    if (!items || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((item) => { io.observe(item); });
    return () => io.disconnect();
  }, []);

  return (
    <section id="motor" className="mod">
      <h2 className="rv">Dentro del motor</h2>
      <div className="pic rv">
        {modules.map((m, i) => (
          <img
            key={m.name}
            src={m.img}
            alt={i === active ? m.alt : ""}
            aria-hidden={i === active ? undefined : true}
            loading="lazy"
            className={i === active ? "on" : ""}
           
          />
        ))}
      </div>
      <ul ref={listRef}>
        {modules.map((m, i) => (
          <li key={m.name} data-i={i} data-on={i === active}>
            <button type="button" onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
              <span className="head">
                <span><i />{m.name}</span>
                <small>{m.tag}</small>
              </span>
              <span className="more">{m.body}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

