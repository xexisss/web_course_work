import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";
import { PageBanner } from "../components/PageBanner";
import { FullWidthBlock } from "../components/FullWidthBlock";
import { PageInner } from "../components/PageInner";
import { TranslatorAvatar } from "../components/TranslatorAvatar";
import { EmptyState } from "../components/EmptyState";
import { images } from "../content/images";
import { clientTips, specialties } from "../content/siteInfo";
import { formatBYNPer1000 } from "../utils/format";

const LS_KEY = "tp_catalog_filters";

type TranslatorRow = {
  user: { id: string; fullName: string };
  headline: string | null;
  ratePer1000: number;
  languages: { languageCode: string }[];
  specialties: { code: string }[];
  ratingAvg: number | null;
  ratingCount: number;
  isVerified: boolean;
};

type Pair = { sourceLanguage: string; targetLanguage: string; label: string | null };

function starRow(avg: number | null) {
  if (avg == null) return <span className="muted">нет оценок</span>;
  const n = Math.round(avg);
  return <span className="stars">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

export function CatalogPage() {
  const [opts, setOpts] = useState<{
    translationTypes: { code: string; label: string }[];
    languagePairs: Pair[];
  } | null>(null);
  const [list, setList] = useState<TranslatorRow[]>([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRate, setMaxRate] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const j = JSON.parse(raw) as Record<string, string>;
        setSource(j.source ?? "");
        setTarget(j.target ?? "");
        setSpecialty(j.specialty ?? "");
        setMinRating(j.minRating ?? "");
        setMaxRate(j.maxRate ?? "");
      }
    } catch {
      /* ignore */
    }
    void apiJson<{ translationTypes: { code: string; label: string }[]; languagePairs: Pair[] }>("/api/catalog/options").then(
      (o) => setOpts({ translationTypes: o.translationTypes, languagePairs: o.languagePairs ?? [] }),
    );
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    if (source) q.set("source", source);
    if (target) q.set("target", target);
    if (specialty) q.set("specialty", specialty);
    if (minRating) q.set("minRating", minRating);
    if (maxRate) q.set("maxRate", maxRate);
    void apiJson<{ translators: TranslatorRow[] }>(`/api/catalog/translators?${q}`).then((r) => setList(r.translators));
    localStorage.setItem(LS_KEY, JSON.stringify({ source, target, specialty, minRating, maxRate }));
  }, [source, target, specialty, minRating, maxRate]);

  const resetFilters = () => {
    setSource("");
    setTarget("");
    setSpecialty("");
    setMinRating("");
    setMaxRate("");
    localStorage.removeItem(LS_KEY);
  };

  const applyPair = (p: Pair) => {
    setSource(p.sourceLanguage);
    setTarget(p.targetLanguage);
  };

  return (
    <div className="page">
      <PageBanner
        fullWidth
        title="Каталог переводчиков"
        lead="Фильтры по языковой паре, специализации, рейтингу и ставке в белорусских рублях. В каталоге только верифицированные исполнители с открытой витриной."
        image="/img/catalog.png"
        imageAlt="Каталог переводчиков"
      >
        {opts && opts.languagePairs.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700 }}>
              Популярные направления
            </p>
            <div className="chip-row">
              {opts.languagePairs.slice(0, 6).map((p) => (
                <button
                  key={`${p.sourceLanguage}-${p.targetLanguage}`}
                  type="button"
                  className="chip chip-btn"
                  onClick={() => applyPair(p)}
                  title="Подставить в фильтр"
                >
                  {p.label ?? `${p.sourceLanguage}→${p.targetLanguage}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </PageBanner>

      <FullWidthBlock tone="accent" wide>
        <h2 style={{ margin: "0 0 0.35rem" }}>Подбор исполнителя</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Список обновляется автоматически. Найдено: <strong>{list.length}</strong> переводчиков.
        </p>
        <div className="filter-panel" style={{ marginTop: "1rem" }}>
          <label className="form-field">
            Исходный язык (код)
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="например en" />
          </label>
          <label className="form-field">
            Целевой язык
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="например ru" />
          </label>
          <label className="form-field">
            Тип / тематика
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="">любая</option>
              {opts?.translationTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Мин. средний отзыв
            <input value={minRating} onChange={(e) => setMinRating(e.target.value)} placeholder="4" type="number" step="0.1" />
          </label>
          <label className="form-field">
            Макс. цена (бел. руб. / 1000 зн.)
            <input value={maxRate} onChange={(e) => setMaxRate(e.target.value)} placeholder="80" type="number" />
          </label>
          <div className="form-field filter-panel-actions">
            <button type="button" className="ghost" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        </div>
      </FullWidthBlock>

      <PageInner className="page-inner--wide">
        <div className="info-columns" style={{ marginTop: "1.25rem" }}>
          <section>
            <h2 className="section-title">Результаты ({list.length})</h2>
            <div className="grid2 animate-stagger">
          {list.map((t) => (
            <article key={t.user.id} className="card translator-card translator-card--photo">
              <div className="translator-card-head">
                <TranslatorAvatar userId={t.user.id} name={t.user.fullName} size="md" />
                <div className="translator-card-info">
                  <h3>{t.user.fullName}</h3>
                  <p className="muted translator-card-headline">{t.headline || "Переводчик"}</p>
                </div>
              </div>
              <div className="translator-card-badges">
                <span className="badge">{t.isVerified ? "Проверен" : "Не проверен"}</span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {starRow(t.ratingAvg)} · {t.ratingCount} отз.
                </span>
              </div>
              <div className="translator-card-body">
                <p className="price-line">от {formatBYNPer1000(t.ratePer1000)}</p>
                <div className="chip-row">
                  {t.languages.map((l) => (
                    <span key={l.languageCode} className="chip">
                      {l.languageCode}
                    </span>
                  ))}
                  {t.specialties.map((s) => (
                    <span key={s.code} className="chip chip-gold">
                      {s.code}
                    </span>
                  ))}
                </div>
              </div>
              <div className="translator-card-footer">
                <Link to={`/translators/${t.user.id}`} className="btn">
                  Открыть профиль
                </Link>
              </div>
            </article>
          ))}
        </div>
            {list.length === 0 && (
              <div className="card">
                <EmptyState
                  title="Никого не нашли"
                  description="Измените фильтры или сбросьте их — возможно, для выбранной пары языков пока нет верифицированных переводчиков."
                  image={images.team}
                  action={
                    <button type="button" className="ghost" onClick={resetFilters}>
                      Сбросить фильтры
                    </button>
                  }
                />
              </div>
            )}
          </section>

          <aside className="info-aside">
            <div className="card card-accent">
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Советы заказчику</h3>
              <ul className="tip-list">
                {clientTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 style={{ margin: "0 0 0.65rem", fontSize: "1rem" }}>Типы перевода</h3>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.88rem" }}>
                {specialties.map((s) => (
                  <li key={s.code} style={{ marginBottom: "0.35rem" }}>
                    <strong>{s.title}</strong> — {s.from}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Нужен заказ?</h3>
              <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
                Создайте заявку — переводчики откликнутся с ценой в бел. руб.
              </p>
              <Link to="/orders/new" className="btn" style={{ display: "inline-block" }}>
                Новый заказ
              </Link>
            </div>
          </aside>
        </div>
      </PageInner>
    </div>
  );
}
