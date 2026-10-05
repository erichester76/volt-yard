import type { ReactNode } from "react";

export function HeadingAccent({ children }: { children: ReactNode }) {
  return <span className="heading-accent">{children}</span>;
}

export function LocalizedHeadingAccent({ text, accent }: { text: string; accent: string }) {
  const marker = "{{accent}}";
  const [before, after] = text.split(marker);

  if (after === undefined) return <>{text}</>;

  return <>{before}<span className="heading-accent heading-accent-italic">{accent}</span>{after}</>;
}
