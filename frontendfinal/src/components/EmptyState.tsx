import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  image?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, image, action }: Props) {
  return (
    <div className="empty-state empty-state--rich">
      {image ? <img className="empty-state-img" src={image} alt="" loading="lazy" /> : null}
      <strong>{title}</strong>
      {description ? <p className="muted">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
