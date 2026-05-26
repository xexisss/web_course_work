import type { ReactNode } from "react";
import { FullWidthBlock } from "./FullWidthBlock";

type Props = {
  title: string;
  lead?: ReactNode;
  image?: string;
  imageAlt?: string;
  children?: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export function PageBanner({ title, lead, image, imageAlt = "", children, className = "", fullWidth = false }: Props) {
  const inner = (
    <header className={`page-hero page-hero--banner ${className}`.trim()}>
      <div className="page-hero-body">
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
        {children}
      </div>
      {image ? (
        <div className="page-hero-media">
          <img src={image} alt={imageAlt} loading="lazy" />
        </div>
      ) : null}
    </header>
  );

  if (fullWidth) {
    return (
      <FullWidthBlock tone="surface" wide className="block-full--hero">
        {inner}
      </FullWidthBlock>
    );
  }

  return inner;
}
