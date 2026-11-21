import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";

/**
 * Low-level field layout for native inputs and composed form controls.
 * RHF-specific validation remains in ui/form.tsx; this primitive works without a form provider.
 */
export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn("space-y-2", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={className} {...props} />;
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p data-slot="field-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function FieldError({
  children,
  className,
  ...props
}: Omit<ComponentProps<"p">, "children"> & { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p data-slot="field-error" role="alert" className={cn("text-sm text-destructive", className)} {...props}>
      {children}
    </p>
  );
}
