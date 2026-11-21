import { useEffect } from "react";
import { Nav } from "./sections/navigation";
import { Hero, Intro } from "./sections/hero";
import { Features } from "./sections/features";
import { Showcase } from "./sections/showcase";
import { How, Modules } from "./sections/modules";
import { Roadmap } from "./sections/roadmap";
import { Brigada, Cta, Faq, Footer } from "./sections/community";

export default function App() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".rv");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Intro />
        <Features />
        <Showcase />
        <How />
        <Modules />
        <Roadmap />
        <Brigada />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}

