import { useState, type CSSProperties } from "react";
import { d } from "./reveal";

/* The live thing: book table 4 and watch the database refuse a double booking. */
const SLOTS = [18, 19, 20, 21, 22];
type Booking = { start: number; who: string };
const fmt = (h: number) => `${h}:00`;
const overlaps = (a: number, b: number) => Math.abs(a - b) < 2;
const START_MSG = "Marta ya tiene la mesa de 20:00 a 22:00. Elige una hora que se solape y pulsa reservar.";

export function Showcase() {
  const initial: Booking[] = [{ start: 20, who: "Marta · 4" }];
  const [bookings, setBookings] = useState<Booking[]>(initial);
  const [sel, setSel] = useState<number>(19);
  const [state, setState] = useState<"free" | "ok" | "no">("free");
  const [msg, setMsg] = useState(START_MSG);

  const whoAt = (h: number) => bookings.find((b) => overlaps(b.start, h))?.who;

  const reserve = () => {
    const clash = bookings.find((b) => overlaps(b.start, sel));
    if (clash) {
      setState("no");
      setMsg(`Rechazada: la mesa 4 ya está ocupada de ${fmt(clash.start)} a ${fmt(clash.start + 2)}. Lo decide PostgreSQL, no la aplicación.`);
    } else {
      setBookings((b) => [...b, { start: sel, who: "Tú · 2" }]);
      setState("ok");
      setMsg(`Reserva guardada de ${fmt(sel)} a ${fmt(sel + 2)}. Prueba ahora a solapar otra hora.`);
    }
  };
  const reset = () => {
    setBookings(initial);
    setState("free");
    setSel(19);
    setMsg(START_MSG);
  };

  const labels = { free: "libre", ok: "reservada", no: "rechazada" } as const;
  const colors = { free: "var(--f3)", ok: "var(--f2)", no: "var(--f1)" } as const;
  const word = labels[state];
  const field = colors[state];

  return (
    <section id="prueba" className="show" style={{ "--st": field } as CSSProperties}>
      <div className="copy">
        <h2 className="rv">Mesa 4: {word}</h2>
        <p className="rv" style={d(90)} aria-live="polite">{msg}</p>
        <button className="again rv" style={d(160)} type="button" onClick={reset}>Empezar de nuevo</button>
      </div>
      <fieldset className="ctl rv" style={d(120)} data-ui aria-label="Hora de la reserva, dos horas por reserva">
        {SLOTS.map((h) => {
          const who = whoAt(h);
          return (
            <button
              key={h}
              type="button"
              aria-pressed={sel === h}
              data-taken={!!who}
              className="row"
              onClick={() => setSel(h)}
            >
              {fmt(h)} – {fmt(h + 2)}
              <span>{who ?? "libre"}</span>
            </button>
          );
        })}
        <button className="go" type="button" onClick={reserve}>Reservar mesa 4</button>
      </fieldset>
    </section>
  );
}

