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
        >
          <div className="txt">
            <h2 className="s">{b.s}</h2>
            <p className="c">{b.c}</p>
          </div>
          <span className="tg" aria-hidden="true" />
          <button
            type="button"
            className="sw-action"
            aria-label={b.s}
            aria-pressed={on[i]}
            onClick={() => toggle(i)}
            data-ui
          />
        </div>
      ))}
    </section>
  );
}

