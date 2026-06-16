import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";
import { PageBanner } from "../components/PageBanner";
import { FullWidthBlock } from "../components/FullWidthBlock";
import { PageInner } from "../components/PageInner";
import { EmptyState } from "../components/EmptyState";
import { images, avatarForUser } from "../content/images";
import { faq, reviewTips } from "../content/siteInfo";

type Rev = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
  orderTitle: string;
  translatorId: string | null;
  translatorName: string | null;
};

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function ReviewsPage() {
  const [list, setList] = useState<Rev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiJson<{ reviews: Rev[] }>("/api/catalog/reviews")
      .then((r) => setList(r.reviews))
      .finally(() => setLoading(false));
  }, []);

  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const fiveStar = list.filter((r) => r.rating === 5).length;
  const fourPlus = list.filter((r) => r.rating >= 4).length;

  return (
    <div className="page">
      <PageBanner
        fullWidth
        title="Отзывы заказчиков"
        lead="Публичная лента оценок после завершённых заказов. Рейтинг влияет на позицию переводчика в каталоге и доверие новых клиентов."
        image={images.reviews}
        imageAlt="Довольные клиенты"
      />

      <FullWidthBlock tone="dark">
        <div className="stats-strip">
          <div className="stats-strip-item">
            <strong>{list.length}</strong>
            <span>всего отзывов</span>
          </div>
          <div className="stats-strip-item">
            <strong>{list.length ? avg.toFixed(1) : "—"}</strong>
            <span>средний балл</span>
          </div>
          <div className="stats-strip-item">
            <strong>{fiveStar}</strong>
            <span>оценок 5★</span>
          </div>
          <div className="stats-strip-item">
            <strong>{list.length ? Math.round((fourPlus / list.length) * 100) : 0}%</strong>
            <span>оценок 4★ и выше</span>
          </div>
        </div>
      </FullWidthBlock>

      <PageInner className="page-inner--wide">
        <div className="info-columns">
          <div className="card">
            {loading ? (
              <p className="muted loading-pulse" style={{ margin: 0 }}>
                Загрузка отзывов…
              </p>
            ) : list.length === 0 ? (
              <EmptyState
                title="Пока нет отзывов"
                description="После завершения заказов заказчики оставляют оценки — они появятся в этой ленте. Завершите демо-заказ под client@example.local."
                image={images.reviews}
                action={
                  <Link to="/catalog" className="btn">
                    Перейти в каталог
                  </Link>
                }
              />
            ) : (
              <div className="reviews-feed">
                {list.map((r) => (
                  <article key={r.id} className="review-card">
                    <div className="review-card-avatar">
                      <img
                        src={r.translatorId ? avatarForUser(r.translatorId, r.translatorName ?? undefined) : images.team}
                        alt=""
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <div className="review-card-top">
                        <span className="stars">{stars(r.rating)}</span>
                        <time className="muted" dateTime={r.createdAt}>
                          {new Date(r.createdAt).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}
                        </time>
                      </div>
                      <p className="review-card-title">{r.orderTitle}</p>
                      {r.comment ? <p className="review-card-quote">“{r.comment}”</p> : null}
                      <p className="review-card-meta">
                        Заказчик: <strong>{r.authorName}</strong>
                        {r.translatorId && r.translatorName ? (
                          <>
                            {" "}
                            · Переводчик: <Link to={`/translators/${r.translatorId}`}>{r.translatorName}</Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="info-aside">
            <div className="card card-accent">
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Как работают отзывы</h3>
              <ul className="tip-list">
                {reviewTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 style={{ margin: "0 0 0.65rem", fontSize: "1rem" }}>Вопросы</h3>
              <div className="faq-list">
                {faq.slice(0, 2).map((item) => (
                  <article key={item.q} className="faq-item" style={{ padding: "0.75rem" }}>
                    <strong style={{ fontSize: "0.9rem" }}>{item.q}</strong>
                    <p style={{ fontSize: "0.85rem" }}>{item.a}</p>
                  </article>
                ))}
              </div>
              <Link to="/" className="muted" style={{ fontSize: "0.88rem" }}>
                Все вопросы на главной →
              </Link>
            </div>
          </aside>
        </div>
      </PageInner>
    </div>
  );
}
