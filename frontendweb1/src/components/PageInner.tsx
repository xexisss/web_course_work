import type { ReactNode } from "react";

export function PageInner({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-inner ${className}`.trim()}>{children}</div>;
}
