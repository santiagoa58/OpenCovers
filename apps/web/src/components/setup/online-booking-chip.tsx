import type { ReactNode } from "react";
import { cn } from "cn";

/** A checkbox drawn as a pill. The real input stays in the page, so labels and the keyboard work as before. */
export function Chip({
  checked,
  onChange,
  disabled,
  verbatim,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shows the label as written. A zone name is an exact identifier, so its first letter is not capitalised. */
  verbatim?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
          !verbatim && "first-letter:uppercase",
          "hover:bg-muted peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground",
          "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
        )}
      >
        {children}
      </span>
    </label>
  );
}

