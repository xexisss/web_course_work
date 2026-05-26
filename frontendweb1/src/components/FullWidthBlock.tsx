import type { ReactNode } from "react";

type Tone = "default" | "surface" | "dark" | "accent" | "hero";

type Props = {
  children: ReactNode;
  tone?: Tone;
  wide?: boolean;
  className?: string;
};

export function FullWidthBlock({ children, tone = "default", wide = false, className = "" }: Props) {
  return (
    <section className={`block-full block-full--${tone} ${className}`.trim()}>
      <div className={`block-full-inner ${wide ? "block-full-inner--wide" : ""}`.trim()}>{children}</div>
    </section>
  );
}
