import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";
import { useToast } from "../ToastContext";
import { PageBanner } from "../components/PageBanner";
import { PageInner } from "../components/PageInner";
import { EmptyState } from "../components/EmptyState";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  BID: "Отклик",
  MESSAGE: "Сообщение",
  FILE: "Файл",
  COMPLAINT: "Жалоба",
  ORDER: "Заказ",
  SYSTEM: "Система",
};

export function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await apiJson<{ notifications: Notification[] }>("/api/notifications");
    setItems(r.notifications);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const unread = items.filter((n) => !n.readAt).length;

  async function markRead(id: string) {
    await apiJson(`/api/notifications/${id}/read`, { method: "POST", body: "{}" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  async function markAllRead() {
    try {
      await apiJson("/api/notifications/read-all", { method: "POST", body: "{}" });
      toast.push("Все уведомления прочитаны");
      void load();
    } catch (e) {
      toast.push(e);
    }
  }

  async function openNotification(n: Notification) {
    if (!n.readAt) {
      try {
        await markRead(n.id);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="page">
      <PageBanner
        fullWidth
        title="Уведомления"
        lead={
          unread > 0
            ? `${unread} непрочитанных — отклики, сообщения, файлы и другие события по вашим заказам.`
            : "Здесь появляются отклики, сообщения, файлы и другие события по вашим заказам."
        }
      >
        {unread > 0 && (
          <button type="button" className="btn secondary" style={{ marginTop: "0.75rem" }} onClick={() => void markAllRead()}>
            Отметить все прочитанными
          </button>
        )}
      </PageBanner>

      <PageInner className="page-inner--wide">
        {loading ? (
          <div className="card loading-pulse">
            <p className="muted" style={{ margin: 0 }}>
              Загрузка уведомлений…
            </p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Пока нет уведомлений" description="Когда появятся новые события, они отобразятся здесь и в счётчике в шапке сайта." />
        ) : (
          <ul className="notification-list">
            {items.map((n) => {
              const content = (
                <>
                  <div className="notification-list__head">
                    <span className={`notification-type ${n.readAt ? "" : "notification-type--new"}`}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    <time className="muted" dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString("ru-RU")}
                    </time>
                  </div>
                  <strong className="notification-list__title">{n.title}</strong>
                  {n.body && <p className="notification-list__body muted">{n.body}</p>}
                  {n.link && (
                    <span className="notification-list__action">
                      {n.link.startsWith("/") ? "Открыть →" : "Перейти →"}
                    </span>
                  )}
                </>
              );

              return (
                <li key={n.id} className={`notification-item ${n.readAt ? "" : "notification-item--unread"}`}>
                  {n.link ? (
                    <Link to={n.link} className="notification-item__link" onClick={() => void openNotification(n)}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" className="notification-item__link" onClick={() => void markRead(n.id)}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageInner>
    </div>
  );
}
