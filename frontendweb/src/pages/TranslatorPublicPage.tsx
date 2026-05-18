import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiJson } from "../api";

type ProfileResponse = {
  profile: {
    headline: string | null;
    bio: string | null;
    yearsExperience: number;
    ratePer1000: number;
    isVerified: boolean;
    languages: { languageCode: string; proficiency: string }[];
    specialties: { code: string }[];
    portfolioItems: { title: string; description: string | null }[];
    user: { fullName: string };
  };
  stats: { ratingAvg: number | null; ratingCount: number };
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function TranslatorPublicPage() {
  const { userId } = useParams();
  const [data, setData] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    if (!userId) return;
    void apiJson<ProfileResponse>(`/api/profile/translator/${userId}`).then(setData);
  }, [userId]);

  if (!data) {
    return (
      <div className="page">
        <div className="card loading-pulse" style={{ minHeight: 220 }}>
          <p className="muted" style={{ margin: 0 }}>
            Загрузка профиля…
          </p>
        </div>
      </div>
    );
  }

  const { profile, stats } = data;
  const stars =
    stats.ratingAvg != null ? "★".repeat(Math.round(stats.ratingAvg)) + "☆".repeat(5 - Math.round(stats.ratingAvg)) : null;

  return (
    <div className="page">
      <section className="card translator-card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="translator-card-head">
          <div className="avatar" style={{ width: 72, height: 72, fontSize: "1.35rem" }} aria-hidden>
            {initials(profile.user.fullName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title" style={{ fontSize: "1.65rem", margin: 0 }}>
              {profile.user.fullName}
            </h1>
            <p style={{ margin: "0.35rem 0 0", fontWeight: 700, color: "var(--accent-2)" }}>{profile.headline || "Переводчик"}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
              <span className="badge">{profile.isVerified ? "Проверен платформой" : "Не верифицирован"}</span>
              {stars && <span className="stars">{stars}</span>}
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                ({stats.ratingCount} отзывов{stats.ratingAvg != null ? `, ${stats.ratingAvg.toFixed(1)} в среднем` : ""})
              </span>
            </div>
          </div>
        </div>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          {profile.bio || "Описание появится после заполнения кабинета переводчика."}
        </p>
        <div className="stat-grid" style={{ marginTop: "1rem" }}>
          <div className="stat-card">
            <span className="lbl">Опыт</span>
            <span className="val">{profile.yearsExperience} лет</span>
          </div>
          <div className="stat-card">
            <span className="lbl">Ставка</span>
            <span className="val" style={{ fontSize: "1.2rem" }}>
              {profile.ratePer1000} ₽
            </span>
          </div>
        </div>
      </section>

      <div className="grid2" style={{ marginTop: "1.25rem", alignItems: "start" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Языки</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {profile.languages.map((l) => (
              <li key={l.languageCode}>
                <strong>{l.languageCode}</strong> — {l.proficiency}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Специализации</h2>
          <div className="chip-row">
            {profile.specialties.length ? (
              profile.specialties.map((s) => (
                <span key={s.code} className="chip">
                  {s.code}
                </span>
              ))
            ) : (
              <span className="muted">Не указаны</span>
            )}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Портфолио</h2>
        {profile.portfolioItems.length === 0 ? (
          <p className="muted">Примеры работ пока не добавлены.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {profile.portfolioItems.map((p, i) => (
              <article
                key={i}
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                }}
              >
                <strong>{p.title}</strong>
                {p.description && <p className="muted" style={{ margin: "0.35rem 0 0" }}>{p.description}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <Link to="/">← В каталог</Link>
      </p>
    </div>
  );
}
