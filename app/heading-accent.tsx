import type { ReactNode } from "react";

export function HeadingAccent({ children }: { children: ReactNode }) {
  return <span className="heading-accent">{children}</span>;
}
