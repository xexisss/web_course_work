import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";

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

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function starRow(avg: number | null) {
  if (avg == null) return <span className="muted">нет оценок</span>;
  const n = Math.round(avg);
  return <span className="stars">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

export function HomePage() {
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
      <header className="page-hero">
        <h1 className="page-title">Профессиональные переводчики под вашу задачу</h1>
        <p className="page-lead">
          Каталог с фильтрами по языковой паре, специализации, цене и рейтингу. Настройки фильтра сохраняются в браузере
          (localStorage) — как в техническом задании.
        </p>
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
                  className="chip"
                  style={{ cursor: "pointer", border: "none", fontFamily: "inherit" }}
                  onClick={() => applyPair(p)}
                  title="Подставить в фильтр"
                >
                  {p.label ?? `${p.sourceLanguage}→${p.targetLanguage}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="card card-accent">
        <h2>Подбор исполнителя</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Укажите критерии — список обновится автоматически. Кнопка «Сбросить» очищает фильтр и localStorage.
        </p>
        <div className="filter-panel">
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
            Мин. средний балл
            <input value={minRating} onChange={(e) => setMinRating(e.target.value)} placeholder="4" type="number" step="0.1" />
          </label>
          <label className="form-field">
            Макс. цена ₽ / 1000 зн.
            <input value={maxRate} onChange={(e) => setMaxRate(e.target.value)} placeholder="2000" type="number" />
          </label>
          <div className="form-field" style={{ justifyContent: "flex-end" }}>
            <span style={{ opacity: 0 }}>.</span>
            <button type="button" className="ghost" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="page-title" style={{ fontSize: "1.35rem", marginBottom: "0.75rem" }}>
          Результаты ({list.length})
        </h2>
        <div className="grid2">
          {list.map((t) => (
            <div key={t.user.id} className="card translator-card">
              <div className="translator-card-head">
                <div className="avatar" aria-hidden>
                  {initials(t.user.fullName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{t.user.fullName}</h2>
                  <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
                    {t.headline || "Переводчик"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                <span className="badge">{t.isVerified ? "Проверен" : "Не проверен"}</span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {starRow(t.ratingAvg)} · {t.ratingCount} отз.
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: 700, color: "var(--accent-2)" }}>
                от {t.ratePer1000} ₽ <span style={{ fontWeight: 600, color: "var(--muted)", fontSize: "0.85rem" }}>/ 1000 знаков</span>
              </p>
              <div className="chip-row">
                {t.languages.map((l) => (
                  <span key={l.languageCode} className="chip">
                    {l.languageCode}
                  </span>
                ))}
                {t.specialties.map((s) => (
                  <span key={s.code} className="chip" style={{ background: "rgba(201,162,39,0.15)", color: "#5c4a12" }}>
                    {s.code}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                <Link to={`/translators/${t.user.id}`} className="btn" style={{ display: "inline-block" }}>
                  Открыть профиль
                </Link>
              </div>
            </div>
          ))}
        </div>
        {list.length === 0 && (
          <div className="card empty-state">
            <strong>Никого не нашли</strong>
            Измените фильтры или сбросьте их — возможно, для пары языков ещё нет верифицированных переводчиков.
          </div>
        )}
      </section>
    </div>
  );
}
