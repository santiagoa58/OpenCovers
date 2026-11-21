import type { CSSProperties } from "react";

/** Typed animation delay token shared by the marketing sections. */
export const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
