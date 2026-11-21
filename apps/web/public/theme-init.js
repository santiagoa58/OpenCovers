// Apply the stored choice or system preference before React paints the page.
try {
  const stored = localStorage.getItem("theme");
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  document.documentElement.classList.toggle("dark", stored === "dark" || (stored !== "light" && systemDark));
} catch {
  document.documentElement.classList.toggle("dark", window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
}
