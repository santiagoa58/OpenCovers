import type { ComponentProps } from "react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";

/** Layout and accessible messaging for any existing form control. */
export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn("space-y-2", className)} {...props} />;
}

export function FieldLabel(props: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" {...props} />;
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function FieldError({ children, className, ...props }: ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p role="alert" data-slot="field-error" className={cn("text-sm text-destructive", className)} {...props}>
      {children}
    </p>
  );
}
