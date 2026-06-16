import { avatarForUser } from "../content/images";

type Props = {
  userId: string;
  name: string;
  size?: "sm" | "md" | "lg";
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function TranslatorAvatar({ userId, name, size = "md" }: Props) {
  const src = avatarForUser(userId, name);
  return (
    <div className={`avatar-img avatar-img--${size}`} title={name}>
      <img src={src} alt="" loading="lazy" />
      <span className="avatar-img-fallback" aria-hidden>
        {initials(name)}
      </span>
    </div>
  );
}
