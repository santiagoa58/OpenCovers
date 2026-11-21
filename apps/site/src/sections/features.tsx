import { useState, type CSSProperties } from "react";
import { bands } from "../content";
import { d } from "./reveal";

export function Features() {
  const [on, setOn] = useState<boolean[]>(bands.map((b) => !!b.start));
  const toggle = (i: number) => setOn((o) => o.map((v, j) => (j === i ? !v : v)));
  return (
    <section id="features" aria-label="Por qué OpenCovers">
      {bands.map((b, i) => (
        <div
          key={b.s}
          className="sw rv"
          data-on={on[i]}
          style={{ ...d(0), "--on": b.on } as CSSProperties}
          onClick={() => toggle(i)}
        >
          <div className="txt">
            <h2 className="s">{b.s}</h2>
            <p className="c">{b.c}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on[i]}
            aria-label={b.s}
            className="tg"
            data-ui
            onClick={(e) => {
              e.stopPropagation();
              toggle(i);
            }}
          />
        </div>
      ))}
    </section>
  );
}

