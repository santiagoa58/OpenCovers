import type { ReactNode } from "react";
import { LoadError } from "@/components/load-error";

interface AsyncContentProps {
  loading: boolean;
  error: unknown;
  retrying?: boolean;
  onRetry: () => void;
  what: string;
  empty: boolean;
  loadingContent: ReactNode;
  emptyContent: ReactNode;
  children: ReactNode;
}

/**
 * A consistent read-only query boundary. Cached data remains visible during a
 * background refetch; an error screen appears only if there is no usable data.
 */
export function AsyncContent({
  loading,
  error,
  retrying,
  onRetry,
  what,
  empty,
  loadingContent,
  emptyContent,
  children,
}: AsyncContentProps) {
  if (loading) return <>{loadingContent}</>;
  if (error) return <LoadError what={what} error={error} retrying={retrying} onRetry={onRetry} />;
  if (empty) return <>{emptyContent}</>;
  return <>{children}</>;
}
