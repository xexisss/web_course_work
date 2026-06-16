import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiJson } from "../api";
import { PageBanner } from "../components/PageBanner";
import { PageInner } from "../components/PageInner";
import { TranslatorAvatar } from "../components/TranslatorAvatar";
import { avatarForUser, portfolioImageFor } from "../content/images";
import { formatBYNPer1000 } from "../utils/format";

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

const SPEC_LABELS: Record<string, string> = {
  legal: "Юридический",
  medical: "Медицинский",
  technical: "Технический / IT",
  marketing: "Маркетинг",
  general: "Общий",
};

function pluralYears(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "лет";
  if (mod10 === 1) return "год";
  if (mod10 >= 2 && mod10 <= 4) return "года";
  return "лет";
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
  const heroFace = avatarForUser(userId!, profile.user.fullName);

  return (
    <div className="page">
      <PageInner>
      <PageBanner
        title={profile.user.fullName}
        lead={profile.headline || "Профессиональный переводчик на платформе LinguaTrade"}
        image={heroFace}
        imageAlt={profile.user.fullName}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.65rem" }}>
          <span className="badge">{profile.isVerified ? "Проверен платформой" : "На верификации"}</span>
          {stars && <span className="stars">{stars}</span>}
          <span className="muted" style={{ fontSize: "0.88rem" }}>
            {stats.ratingCount} отзывов{stats.ratingAvg != null ? ` · ${stats.ratingAvg.toFixed(1)} в среднем` : ""}
          </span>
        </div>
      </PageBanner>

      <div className="translator-profile">
        <section className="card">
          <div className="profile-hero">
            <TranslatorAvatar userId={userId!} name={profile.user.fullName} size="lg" />
            <div>
              <p className="muted" style={{ lineHeight: 1.65, margin: 0 }}>
                {profile.bio ||
                  "Переводчик с опытом работы с корпоративными и частными заказами. Свяжитесь через заказ на платформе."}
              </p>
              <p className="price-line" style={{ marginTop: "0.85rem" }}>
                Ставка: {formatBYNPer1000(profile.ratePer1000)}
              </p>
            </div>
          </div>
          <div className="stat-grid profile-stat-grid">
            <div className="stat-card profile-stat-card">
              <span className="lbl">Опыт</span>
              <span className="val">
                {profile.yearsExperience} <span className="val-unit">{pluralYears(profile.yearsExperience)}</span>
              </span>
            </div>
            <div className="stat-card profile-stat-card">
              <span className="lbl">Языков</span>
              <span className="val">{profile.languages.length}</span>
            </div>
            <div className="stat-card profile-stat-card">
              <span className="lbl">Специализаций</span>
              <span className="val">{profile.specialties.length}</span>
            </div>
          </div>
        </section>

        <div className="profile-info-grid">
          <section className="card profile-info-card">
            <h2 style={{ marginTop: 0 }}>Языки</h2>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {profile.languages.map((l) => (
                <li key={l.languageCode}>
                  <strong>{l.languageCode.toUpperCase()}</strong> — {l.proficiency}
                </li>
              ))}
            </ul>
          </section>
          <section className="card profile-info-card">
            <h2 style={{ marginTop: 0 }}>Специализации</h2>
            <div className="chip-row">
              {profile.specialties.length ? (
                profile.specialties.map((s) => (
                  <span key={s.code} className="chip chip-gold">
                    {SPEC_LABELS[s.code] ?? s.code}
                  </span>
                ))
              ) : (
                <span className="muted">Не указаны</span>
              )}
            </div>
          </section>
          <section className="card profile-info-card">
            <h2 style={{ marginTop: 0 }}>Рейтинг и отзывы</h2>
            <p className="muted" style={{ margin: 0 }}>
              {stats.ratingAvg != null ? (
                <>
                  <span className="stars">
                    {"★".repeat(Math.round(stats.ratingAvg))}
                    {"☆".repeat(5 - Math.round(stats.ratingAvg))}
                  </span>{" "}
                  · <strong style={{ color: "var(--ink)" }}>{stats.ratingAvg.toFixed(1)}</strong> в среднем
                </>
              ) : (
                <>Пока нет оценок — переводчик новый на платформе.</>
              )}
            </p>
            <div className="profile-info-footer">
              <span className="chip">отзывов: {stats.ratingCount}</span>
              <span className="chip">ставка: {formatBYNPer1000(profile.ratePer1000)}</span>
            </div>
          </section>
        </div>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Портфолио</h2>
          {profile.portfolioItems.length === 0 ? (
            <p className="muted">Примеры работ появятся после заполнения кабинета переводчика.</p>
          ) : (
            <div className="portfolio-grid">
              {profile.portfolioItems.map((p, i) => (
                <article key={i} className="portfolio-item">
                  <img src={portfolioImageFor(userId!, i)} alt="" loading="lazy" />
                  <div className="portfolio-item-body">
                    <strong>{p.title}</strong>
                    {p.description && <p className="muted" style={{ margin: "0.35rem 0 0" }}>{p.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="profile-actions">
          <Link to="/catalog" className="ghost btn-lg">
            ← В каталог
          </Link>
          <Link to="/orders/new" className="btn btn-lg">
            Создать заказ
          </Link>
        </div>
      </div>
      </PageInner>
    </div>
  );
}
