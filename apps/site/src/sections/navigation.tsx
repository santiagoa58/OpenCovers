import { useEffect, useState } from "react";
import { REPO, REPO_API } from "../content";

/* Live star count from the public GitHub API. Cached for 10 minutes; the button
   still works as a plain link if the request fails or is rate-limited. */
function useStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    try {
      const cached = JSON.parse(sessionStorage.getItem("oc-stars") ?? "null");
      if (cached && Date.now() - cached.t < 600_000) {
        setStars(cached.n);
        return;
      }
    } catch {
      /* storage unavailable */
    }
    fetch(REPO_API, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (!alive || typeof j.stargazers_count !== "number") return;
        setStars(j.stargazers_count);
        try {
          sessionStorage.setItem("oc-stars", JSON.stringify({ n: j.stargazers_count, t: Date.now() }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return stars;
}

function fmtStars(count: number): string {
  if (count < 1000) return String(count);
  const decimals = count >= 10000 ? 0 : 1;
  return `${(count / 1000).toFixed(decimals)}k`;
}

export function GithubButton() {
  const stars = useStars();
  return (
    <a className="btn gh" href={REPO} aria-label={stars === null ? "GitHub" : `GitHub, ${stars} estrellas`}>
      GitHub
      {stars !== null && (
        <span className="stars">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden>
            <path d="M12 2.5l2.95 6.2 6.8.9-4.95 4.7 1.25 6.7L12 17.7l-6.05 3.3 1.25-6.7L2.25 9.6l6.8-.9z" />
          </svg>
          {fmtStars(stars)}
        </span>
      )}
    </a>
  );
}

export function Nav() {
  return (
    <header className="nav">
      <div className="in">
        <a href="/" className="brand" aria-label="OpenCovers, inicio">
          <img src="/mark.svg" alt="" />
          OpenCovers
        </a>
        <ul>
          <li><a href="#features">Por qué</a></li>
          <li><a href="#prueba">Pruébalo</a></li>
          <li><a href="#motor">Dentro</a></li>
          <li><a href="#hoja-de-ruta">Hoja de ruta</a></li>
          <li><a href="#brigada">La Brigada</a></li>
          <li><a href="#faq">Preguntas</a></li>
        </ul>
        <GithubButton />
      </div>
    </header>
  );
}

