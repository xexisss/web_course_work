import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, apiJson, downloadWithAuth, readApiError } from "../api";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { PageBanner } from "../components/PageBanner";
import { PageInner } from "../components/PageInner";
import { images } from "../content/images";
import { formatBYN } from "../utils/format";
import { statusLabel } from "../utils/status";

type OrderDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  clientId: string;
  translatorId: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  agreedPrice: number | null;
  estimatedPrice: number | null;
  deadlineAt: string | null;
  bids: {
    id: string;
    proposedPrice: number;
    proposedDeadlineAt: string;
    comment: string | null;
    status: string;
    translator: { id: string; fullName: string };
  }[];
  messages: { id: string; body: string; createdAt: string; sender: { id: string; fullName: string; role: string } }[];
  files: { id: string; fileName: string; kind: string; mimeType: string }[];
  payment: { status: string; amount: number } | null;
  review: { rating: number; comment: string | null } | null;
};

export function OrderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<"info" | "chat" | "files" | "bids">("info");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [msg, setMsg] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidDate, setBidDate] = useState("");
  const [bidComment, setBidComment] = useState("");
  const [complaint, setComplaint] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    try {
      const r = await apiJson<{ order: OrderDetail }>(`/api/orders/${id}`);
      setOrder(r.order);
    } catch (e) {
      toast.push(e);
      setOrder(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [id]);

  if (!user) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <h1 className="page-title" style={{ fontSize: "1.35rem" }}>
            Заказ доступен после входа
          </h1>
          <p className="muted">Авторизуйтесь как заказчик или переводчик, чтобы видеть детали, чат и файлы.</p>
          <Link to="/login" className="btn" style={{ display: "inline-flex", marginTop: "0.5rem" }}>
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card loading-pulse" style={{ minHeight: 160 }}>
          <p className="muted" style={{ margin: 0 }}>
            Загрузка заказа…
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page">
        <div className="card empty-state">
          <strong>Заказ не найден</strong>
          Проверьте ссылку или права доступа.
        </div>
      </div>
    );
  }

  const o = order;
  const isClient = user.id === o.clientId;
  const isTranslator = user.id === o.translatorId;
  const canBid =
    user.role === "TRANSLATOR" && (o.status === "SUBMITTED" || o.status === "PENDING_TRANSLATOR") && !o.translatorId;
  const canChat = isClient || isTranslator || canBid;

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    try {
      await apiJson(`/api/orders/${o.id}/messages`, { method: "POST", body: JSON.stringify({ body: msg }) });
      setMsg("");
      toast.push("Сообщение отправлено");
      void load();
    } catch (err) {
      toast.push(err);
    }
  }

  async function uploadFile(kind: string, file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await apiFetch(`/api/orders/${o.id}/files`, { method: "POST", body: fd });
    if (!res.ok) toast.push(await readApiError(res));
    else {
      toast.push("Файл загружен");
      void load();
    }
  }

  async function sendBid(e: FormEvent) {
    e.preventDefault();
    try {
      await apiJson(`/api/orders/${o.id}/bids`, {
        method: "POST",
        body: JSON.stringify({
          proposedPrice: Number(bidPrice),
          proposedDeadlineAt: new Date(bidDate).toISOString(),
          comment: bidComment || undefined,
        }),
      });
      toast.push("Отклик отправлен");
      void load();
    } catch (err) {
      toast.push(err);
    }
  }

  async function acceptBid(bidId: string) {
    try {
      await apiJson(`/api/orders/${o.id}/bids/${bidId}/accept`, { method: "POST", body: "{}" });
      toast.push("Исполнитель выбран");
      void load();
    } catch (err) {
      toast.push(err);
    }
  }

  const tabLabel: Record<typeof tab, string> = {
    info: "Карточка",
    chat: "Чат",
    files: "Файлы",
    bids: "Отклики",
  };

  return (
    <div className="page">
      <PageBanner fullWidth title={o.title} image={images.order} imageAlt="">
        <div className="order-status-bar" style={{ marginTop: "0.5rem" }}>
          <span className="status-pill">{statusLabel(o.status)}</span>
          {o.payment && (
            <span className="muted" style={{ fontSize: "0.88rem" }}>
              Платёж: {statusLabel(o.payment.status)} ({formatBYN(o.payment.amount)})
            </span>
          )}
        </div>
        <p className="page-lead" style={{ marginTop: "0.65rem", marginBottom: 0 }}>
          {o.sourceLanguage} → {o.targetLanguage} · ориентир {formatBYN(o.estimatedPrice)} · согласовано{" "}
          {formatBYN(o.agreedPrice)}
          {o.deadlineAt && <> · дедлайн {new Date(o.deadlineAt).toLocaleString("ru-RU")}</>}
        </p>
      </PageBanner>

      <PageInner className="page-inner--wide">
      <section className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{o.description}</p>
        <div className="tabs" style={{ marginTop: "1.25rem" }}>
          {(["info", "chat", "files", "bids"] as const).map((t) => (
            <button key={t} type="button" className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {tabLabel[t]}
            </button>
          ))}
        </div>
      </section>

      {tab === "info" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Действия по заказу</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {isClient && o.status === "ACCEPTED" && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void apiJson(`/api/orders/${o.id}/pay-escrow`, { method: "POST", body: "{}" })
                    .then(() => {
                      toast.push("Эскроу (демо)");
                      void load();
                    })
                    .catch((e) => toast.push(e))
                }
              >
                Оплатить в эскроу и запустить работу
              </button>
            )}
            {isTranslator && o.status === "IN_PROGRESS" && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void apiJson(`/api/orders/${o.id}/deliver`, { method: "POST", body: "{}" })
                    .then(() => {
                      toast.push("Статус: сдано");
                      void load();
                    })
                    .catch((e) => toast.push(e))
                }
              >
                Отметить сданным (после загрузки готового файла)
              </button>
            )}
            {isClient && o.status === "DELIVERED" && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void apiJson(`/api/orders/${o.id}/complete`, { method: "POST", body: "{}" })
                    .then(() => {
                      toast.push("Заказ завершён");
                      void load();
                    })
                    .catch((e) => toast.push(e))
                }
              >
                Подтвердить приёмку и разблокировать оплату
              </button>
            )}
          </div>

          {isClient && o.status === "COMPLETED" && !o.review && (
            <form
              style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)" }}
              onSubmit={(e) => {
                e.preventDefault();
                void apiJson(`/api/orders/${o.id}/review`, {
                  method: "POST",
                  body: JSON.stringify({ rating, comment: reviewText || undefined }),
                })
                  .then(() => {
                    toast.push("Спасибо за отзыв");
                    void load();
                  })
                  .catch((er) => toast.push(er));
              }}
            >
              <h3 style={{ marginTop: 0 }}>Отзыв о переводчике</h3>
              <label className="form-field">
                Оценка (1–5)
                <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} />
              </label>
              <label className="form-field" style={{ marginTop: "0.65rem" }}>
                Комментарий
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} />
              </label>
              <button type="submit" className="btn" style={{ marginTop: "0.75rem" }}>
                Отправить отзыв
              </button>
            </form>
          )}
          {o.review && (
            <p style={{ marginTop: "1rem" }}>
              <span className="stars">{"★".repeat(o.review.rating)}{"☆".repeat(5 - o.review.rating)}</span>{" "}
              {o.review.comment}
            </p>
          )}

          <form
            style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)" }}
            onSubmit={(e) => {
              e.preventDefault();
              void apiJson(`/api/orders/${o.id}/complaints`, { method: "POST", body: JSON.stringify({ body: complaint }) })
                .then(() => {
                  toast.push("Жалоба отправлена администратору");
                  setComplaint("");
                })
                .catch((er) => toast.push(er));
            }}
          >
            <h3 style={{ marginTop: 0 }}>Жалоба администратору</h3>
            <label className="form-field">
              Опишите проблему (не короче 10 символов)
              <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} minLength={10} required rows={3} />
            </label>
            <button type="submit" className="secondary" style={{ marginTop: "0.75rem" }}>
              Отправить
            </button>
          </form>
          <p style={{ marginTop: "1.25rem" }}>
            <Link to="/">← В каталог</Link>
            {isClient && (
              <>
                {" · "}
                <Link to="/cabinet/client">Кабинет заказчика</Link>
              </>
            )}
          </p>
        </div>
      )}

      {tab === "chat" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Переписка по заказу</h2>
          <div style={{ maxHeight: 420, overflowY: "auto", marginBottom: "1rem" }}>
            {o.messages.map((m) => (
              <div key={m.id} className="msg-bubble">
                <strong>{m.sender.fullName}</strong>{" "}
                <span className="muted" style={{ fontSize: "0.82rem" }}>
                  {new Date(m.createdAt).toLocaleString("ru-RU")}
                </span>
                <div style={{ marginTop: "0.35rem" }}>{m.body}</div>
              </div>
            ))}
          </div>
          {canChat ? (
            <form onSubmit={sendMessage}>
              <label className="form-field">
                Сообщение
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} required rows={3} />
              </label>
              <button type="submit" className="btn" style={{ marginTop: "0.65rem" }}>
                Отправить
              </button>
            </form>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Переписка доступна заказчику и назначенному исполнителю.
            </p>
          )}
        </div>
      )}

      {tab === "files" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Файлы заказа</h2>
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.1rem" }}>
            {o.files.map((f) => (
              <li key={f.id} style={{ marginBottom: "0.5rem" }}>
                {f.fileName}{" "}
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  ({f.kind})
                </span>{" "}
                <button
                  type="button"
                  className="ghost"
                  style={{ padding: "0.25rem 0.65rem", fontSize: "0.82rem" }}
                  onClick={() =>
                    void downloadWithAuth(`/api/orders/${o.id}/files/${f.id}/download`, f.fileName).catch((e) => toast.push(e))
                  }
                >
                  Скачать
                </button>
              </li>
            ))}
          </ul>
          {(isClient || isTranslator) && (
            <label className="dropzone" style={{ display: "block", cursor: "pointer" }}>
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e) => void uploadFile(isTranslator ? "DELIVERY" : "SOURCE", e.target.files?.[0] ?? null)}
              />
              <strong>{isTranslator ? "Загрузить готовый перевод (DELIVERY)" : "Загрузить исходник (SOURCE)"}</strong>
              <p className="muted" style={{ margin: "0.45rem 0 0", fontSize: "0.88rem" }}>
                Нажмите для выбора файла с устройства.
              </p>
            </label>
          )}
        </div>
      )}

      {tab === "bids" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Отклики переводчиков</h2>
          {o.bids.map((b) => (
            <article
              key={b.id}
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                marginBottom: "0.65rem",
                background: "var(--surface-2)",
              }}
            >
              <strong>{b.translator.fullName}</strong> — {formatBYN(b.proposedPrice)} до{" "}
              {new Date(b.proposedDeadlineAt).toLocaleDateString("ru-RU")}{" "}
              <span className="status-pill" style={{ marginLeft: "0.35rem" }}>
                {b.status}
              </span>
              {b.comment && <p className="muted" style={{ margin: "0.35rem 0 0" }}>{b.comment}</p>}
              {isClient && b.status === "PENDING" && !o.translatorId && (
                <button type="button" className="btn" style={{ marginTop: "0.5rem" }} onClick={() => void acceptBid(b.id)}>
                  Выбрать исполнителем
                </button>
              )}
            </article>
          ))}
          {canBid && (
            <form onSubmit={sendBid} style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
              <h3 style={{ marginTop: 0 }}>Откликнуться</h3>
              <div className="filter-panel">
                <label className="form-field">
                  Цена (бел. руб.)
                  <input value={bidPrice} onChange={(e) => setBidPrice(e.target.value)} required type="number" />
                </label>
                <label className="form-field">
                  Срок
                  <input value={bidDate} onChange={(e) => setBidDate(e.target.value)} required type="datetime-local" />
                </label>
                <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                  Комментарий
                  <input value={bidComment} onChange={(e) => setBidComment(e.target.value)} />
                </label>
              </div>
              <button type="submit" className="btn" style={{ marginTop: "0.75rem" }}>
                Отправить отклик
              </button>
            </form>
          )}
        </div>
      )}
      </PageInner>
    </div>
  );
}
