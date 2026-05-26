import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, downloadWithAuth } from "../api";
import { useToast } from "../ToastContext";
import { PageBanner } from "../components/PageBanner";
import { FullWidthBlock } from "../components/FullWidthBlock";
import { PageInner } from "../components/PageInner";
import { EmptyState } from "../components/EmptyState";
import { images } from "../content/images";
import { clientTips } from "../content/siteInfo";
import { formatBYN } from "../utils/format";
import { statusLabel } from "../utils/status";

type Row = {
  id: string;
  title: string;
  status: string;
  agreedPrice: number | null;
  estimatedPrice: number | null;
};

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "Все статусы" },
  { value: "DRAFT", label: "Черновик" },
  { value: "SUBMITTED", label: "Опубликован" },
  { value: "PENDING_TRANSLATOR", label: "Ожидает исполнителя" },
  { value: "ACCEPTED", label: "Принят" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "DELIVERED", label: "Сдано" },
  { value: "COMPLETED", label: "Завершён" },
  { value: "CANCELLED", label: "Отменён" },
  { value: "DISPUTED", label: "Спор" },
];

export function ClientCabinetPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    void apiJson<{ orders: Row[] }>(`/api/orders/mine${q}`).then((r) => setOrders(r.orders));
  }, [status]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length;
    const done = orders.filter((o) => o.status === "COMPLETED").length;
    const sum = orders.reduce((s, o) => s + (o.agreedPrice ?? o.estimatedPrice ?? 0), 0);
    return { total: orders.length, active, done, sum };
  }, [orders]);

  return (
    <div className="page">
      <PageBanner
        fullWidth
        title="Кабинет заказчика"
        lead="Управление заказами, фильтрация по статусу, PDF-отчёт за период и быстрый переход к карточке сделки. Все суммы — в белорусских рублях."
        image={images.cabinet}
        imageAlt="Рабочее место заказчика"
      >
        <Link to="/orders/new" className="btn" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
          Создать заказ
        </Link>
      </PageBanner>

      <FullWidthBlock tone="accent" wide>
        <div className="cabinet-quick" style={{ marginBottom: 0 }}>
          {clientTips.map((tip) => (
            <div key={tip} className="card card-tight" style={{ boxShadow: "var(--shadow)" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>{tip}</p>
            </div>
          ))}
        </div>
      </FullWidthBlock>

      <PageInner>
      <div className="cabinet-quick">
        <Link to="/orders/new">
          <strong>+ Новый заказ</strong>
          <span className="muted">Опишите задачу и получите расчёт в бел. руб.</span>
        </Link>
        <Link to="/catalog">
          <strong>Каталог переводчиков</strong>
          <span className="muted">Выберите исполнителя до публикации</span>
        </Link>
        <Link to="/reviews">
          <strong>Отзывы</strong>
          <span className="muted">Оценки других заказчиков</span>
        </Link>
      </div>

      <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="stat-card">
          <span className="lbl">Всего заказов</span>
          <span className="val">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Активные</span>
          <span className="val">{stats.active}</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Завершённые</span>
          <span className="val">{stats.done}</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Сумма в списке</span>
          <span className="val" style={{ fontSize: "1rem" }}>
            {formatBYN(stats.sum, true)}
          </span>
        </div>
      </div>

      <section className="card card-accent" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Отчёт PDF</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Выгрузка заказов за выбранный интервал дат для отчётности.
        </p>
        <div className="row">
          <label className="form-field">
            С даты
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="form-field">
            По дату
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              void downloadWithAuth(
                `/api/reports/client-orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
                "orders-report.pdf",
              ).catch((e) => toast.push(String(e)))
            }
          >
            Скачать отчёт
          </button>
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Мои заказы</h2>
          <label className="form-field" style={{ minWidth: 200 }}>
            Статус
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/orders/${o.id}`}>{o.title}</Link>
                  </td>
                  <td>
                    <span className="status-pill">{statusLabel(o.status)}</span>
                  </td>
                  <td>{formatBYN(o.agreedPrice ?? o.estimatedPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <EmptyState
            title="Нет заказов"
            description="Создайте первый заказ или измените фильтр статуса."
            image={images.order}
            action={
              <Link to="/orders/new" className="btn">
                Создать заказ
              </Link>
            }
          />
        )}
      </section>
      </PageInner>
    </div>
  );
}
