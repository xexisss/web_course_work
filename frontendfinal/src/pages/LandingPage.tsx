import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";
import { FullWidthBlock } from "../components/FullWidthBlock";
import { PageInner } from "../components/PageInner";
import { TranslatorAvatar } from "../components/TranslatorAvatar";
import { images } from "../content/images";
import { faq, howItWorks, platformStats, specialties, trustBadges } from "../content/siteInfo";
import { formatBYNPer1000 } from "../utils/format";

type TranslatorPreview = {
  user: { id: string; fullName: string };
  headline: string | null;
  ratePer1000: number;
  ratingAvg: number | null;
  ratingCount: number;
  isVerified: boolean;
};

function starRow(avg: number | null) {
  if (avg == null) return <span className="muted">новый исполнитель</span>;
  const n = Math.round(avg);
  return <span className="stars">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

export function LandingPage() {
  const [top, setTop] = useState<TranslatorPreview[]>([]);

  useEffect(() => {
    void apiJson<{ translators: TranslatorPreview[] }>("/api/catalog/translators").then((r) => setTop(r.translators));
  }, []);

  return (
    <div className="page landing">
      <FullWidthBlock tone="hero" className="block-full--hero">
        <div className="block-full-inner block-full-inner--wide">
          <div className="landing-hero landing-hero--full">
            <div className="landing-hero-text">
              <span className="eyebrow">LinguaTrade · Минск, Могилёв, Бобруйск и онлайн</span>
              <h1 className="landing-title">Переводы для бизнеса, госструктур и частных лиц</h1>
              <p className="landing-lead">
                Единая платформа: каталог проверенных переводчиков, тендер откликов, чат и файлы по заказу, эскроу в
                белорусских рублях. Подходит для юридических, медицинских, IT и маркетинговых текстов.
              </p>
              <div className="landing-cta">
                <Link to="/catalog" className="btn btn-lg">
                  Смотреть каталог
                </Link>
                <Link to="/register" className="ghost btn-lg">
                  Создать аккаунт
                </Link>
                <Link to="/reviews" className="muted" style={{ alignSelf: "center", fontSize: "0.9rem" }}>
                  Отзывы клиентов →
                </Link>
              </div>
              <ul className="landing-stats">
                <li>
                <strong>13</strong>
                <span>переводчиков в каталоге</span>
                </li>
                <li>
                  <strong>5</strong>
                  <span>типов перевода</span>
                </li>
                <li>
                  <strong>48 ч</strong>
                  <span>средний отклик</span>
                </li>
                <li>
                  <strong>4.8</strong>
                  <span>средняя оценка</span>
                </li>
              </ul>
            </div>
            <div className="landing-hero-visual">
              <img src={images.hero} alt="Работа переводчика" />
            </div>
          </div>
        </div>
      </FullWidthBlock>

      <FullWidthBlock tone="dark">
        <h2 className="section-title" style={{ color: "#fff", marginTop: 0 }}>
          Платформа в цифрах
        </h2>
        <div className="stats-strip">
          {platformStats.map((s) => (
            <div key={s.label} className="stats-strip-item">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </FullWidthBlock>

      <FullWidthBlock tone="surface" wide>
        <div className="section-head">
          <h2 className="section-title" style={{ margin: 0 }}>
            Как это работает
          </h2>
          <span className="muted">От заявки до отзыва — 4 шага</span>
        </div>
        <div className="steps-grid animate-stagger">
          {howItWorks.map((s) => (
            <article key={s.step} className="step-card">
              <div className="step-card-num">{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </FullWidthBlock>

      <FullWidthBlock wide>
        <div className="section-head">
          <h2 className="section-title" style={{ margin: 0 }}>
            Возможности платформы
          </h2>
        </div>
        <div className="feature-grid feature-grid--wide animate-stagger">
          <article className="feature-card">
            <img src="/img/img1.png" alt="Каталог и фильтры" loading="lazy" className="feature-img feature-img--ui" />
            <h3>Каталог и фильтры</h3>
            <p>Языковая пара, специализация, рейтинг и максимальная ставка в бел. руб. Настройки сохраняются в браузере.</p>
          </article>
          <article className="feature-card">
            <img src="/img/img2.png" alt="Эскроу и статусы" loading="lazy" className="feature-img feature-img--ui" />
            <h3>Эскроу и статусы</h3>
            <p>Черновик → публикация → отклики → работа → сдача → завершение. Платёж виден на карточке заказа.</p>
          </article>
          <article className="feature-card">
            <img src="/img/img3.png" alt="Чат и документы" loading="lazy" className="feature-img feature-img--ui" />
            <h3>Чат и документы</h3>
            <p>Исходники, справочные материалы и готовый перевод — в одном заказе. Уведомления в шапке сайта.</p>
          </article>
        </div>
      </FullWidthBlock>

      <FullWidthBlock tone="accent" wide>
        <div className="section-head">
          <h2 className="section-title" style={{ margin: 0 }}>
            Специализации и ориентиры цен
          </h2>
          <Link to="/catalog">Подобрать переводчика →</Link>
        </div>
        <div className="spec-grid">
          {specialties.map((s) => (
            <article key={s.code} className="spec-card">
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="price-line">{s.from}</span>
            </article>
          ))}
        </div>
        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0, fontSize: "0.88rem" }}>
          Точная сумма заказа рассчитывается по объёму, языковой паре, типу перевода и срочности (Express +35%).
        </p>
      </FullWidthBlock>

      {top.length > 0 && (
        <PageInner className="page-inner--wide">
          <section className="card" style={{ marginTop: "1.25rem" }}>
            <div className="section-head">
              <h2>Переводчики на платформе</h2>
              <Link to="/catalog" className="section-head-link">
                Весь каталог ({top.length}) →
              </Link>
            </div>
            <div className="grid2 animate-stagger">
              {top.map((t) => (
                <article key={t.user.id} className="card translator-card translator-card--photo" style={{ boxShadow: "none" }}>
                  <div className="translator-card-head">
                    <TranslatorAvatar userId={t.user.id} name={t.user.fullName} size="md" />
                    <div className="translator-card-info">
                      <h3>{t.user.fullName}</h3>
                      <p className="muted translator-card-headline">{t.headline || "Переводчик"}</p>
                    </div>
                  </div>
                  <div className="translator-card-badges">
                    <span className="badge">{t.isVerified ? "Проверен" : "На проверке"}</span>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>
                      {starRow(t.ratingAvg)} · {t.ratingCount} отз.
                    </span>
                  </div>
                  <div className="translator-card-body">
                    <p className="price-line">от {formatBYNPer1000(t.ratePer1000)}</p>
                  </div>
                  <div className="translator-card-footer">
                    <Link to={`/translators/${t.user.id}`} className="btn">
                      Открыть профиль
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </PageInner>
      )}

      <FullWidthBlock tone="surface" wide>
        <div className="section-head">
          <h2 className="section-title" style={{ margin: 0 }}>
            Нам доверяют
          </h2>
        </div>
        <div className="trust-row">
          {trustBadges.map((b) => (
            <span key={b} className="trust-pill">
              {b}
            </span>
          ))}
        </div>
      </FullWidthBlock>

      <PageInner>
        <section className="card" style={{ marginTop: "1.25rem" }}>
          <h2 style={{ marginTop: 0 }}>Частые вопросы</h2>
          <div className="faq-list">
            {faq.map((item) => (
              <article key={item.q} className="faq-item">
                <strong>{item.q}</strong>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </PageInner>

      <FullWidthBlock tone="dark">
        <div className="cta-band">
          <div>
            <h2>Готовы начать?</h2>
            <p>
              Зарегистрируйтесь как заказчик или переводчик. Демо: client@example.local / translator@example.local, пароль
              password123.
            </p>
          </div>
          <div className="landing-cta">
            <Link to="/orders/new" className="btn btn-lg">
              Создать заказ
            </Link>
            <Link to="/register" className="ghost btn-lg">
              Регистрация
            </Link>
          </div>
        </div>
      </FullWidthBlock>
    </div>
  );
}
