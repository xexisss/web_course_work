import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, downloadWithAuth } from "../api";
import { useToast } from "../ToastContext";

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
    return { total: orders.length, active, done };
  }, [orders]);

  return (
    <div className="page">
      <header className="page-hero">
        <h1 className="page-title">Кабинет заказчика</h1>
        <p className="page-lead">
          Сводка по заказам, фильтр по статусу (запрос к API с query-параметром), PDF-отчёт за период и быстрый переход к
          карточке заказа.
        </p>
        <Link to="/orders/new" className="btn" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
          Создать заказ
        </Link>
      </header>

      <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="stat-card">
          <span className="lbl">Всего в списке</span>
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
      </div>

      <section className="card card-accent" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Отчёт PDF</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Выгрузка заказов за выбранный интервал дат — как в пояснительной записке.
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
                <th>Сумма ₽</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/orders/${o.id}`}>{o.title}</Link>
                  </td>
                  <td>
                    <span className="status-pill">{o.status}</span>
                  </td>
                  <td>{o.agreedPrice ?? o.estimatedPrice ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            <strong>Нет заказов</strong>
            Создайте первый заказ или смените фильтр статуса.
          </div>
        )}
      </section>
    </div>
  );
}
