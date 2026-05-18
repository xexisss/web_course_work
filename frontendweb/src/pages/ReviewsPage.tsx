import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";

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

  useEffect(() => {
    void apiJson<{ reviews: Rev[] }>("/api/catalog/reviews").then((r) => setList(r.reviews));
  }, []);

  return (
    <div className="page">
      <header className="page-hero">
        <h1 className="page-title">Отзывы заказчиков</h1>
        <p className="page-lead">
          Лента завершённых оценок по платформе — как в ТЗ отдельная страница отзывов. Здесь видны рейтинг, комментарий и
          ссылка на профиль переводчика.
        </p>
      </header>

      <div className="card">
        {list.length === 0 ? (
          <div className="empty-state">
            <strong>Пока нет отзывов</strong>
            После завершения заказов заказчики смогут оставлять оценки — они появятся здесь.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {list.map((r) => (
              <article
                key={r.id}
                style={{
                  padding: "1.1rem 1.2rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span className="stars">{stars(r.rating)}</span>
                  <time className="muted" dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </time>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontWeight: 700, color: "var(--ink)" }}>{r.orderTitle}</p>
                {r.comment && <p style={{ margin: "0.45rem 0 0" }}>{r.comment}</p>}
                <p className="muted" style={{ margin: "0.65rem 0 0", fontSize: "0.88rem" }}>
                  Заказчик: {r.authorName}
                  {r.translatorId && r.translatorName ? (
                    <>
                      {" "}
                      · Переводчик:{" "}
                      <Link to={`/translators/${r.translatorId}`}>{r.translatorName}</Link>
                    </>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
