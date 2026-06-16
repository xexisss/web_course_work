import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";
import { useToast } from "../ToastContext";
import { PageBanner } from "../components/PageBanner";
import { FullWidthBlock } from "../components/FullWidthBlock";
import { PageInner } from "../components/PageInner";
import { images } from "../content/images";
import { trustBadges } from "../content/siteInfo";
import { statusLabel } from "../utils/status";

type Stats = {
  users: { role: string; _count: number }[];
  orders: { status: string; _count: number }[];
  complaints: { status: string; _count: number }[];
  pendingVerify: number;
};

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  translatorProfile: { isVerified: boolean } | null;
};

type AdminOrder = {
  id: string;
  title: string;
  status: string;
  client: { fullName: string; email: string };
  translator: { fullName: string; email: string } | null;
};

type PairRow = {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  label: string | null;
  rarityMultiplier: unknown;
  isActive: boolean;
  sortOrder: number;
};

export function AdminCabinetPage() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [complaints, setComplaints] = useState<
    { id: string; body: string; status: string; order: { id: string; title: string }; author: { fullName: string } }[]
  >([]);
  const [types, setTypes] = useState<{ id: string; code: string; label: string; isActive: boolean }[]>([]);
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [pairSrc, setPairSrc] = useState("en");
  const [pairTgt, setPairTgt] = useState("ru");
  const [pairLabel, setPairLabel] = useState("");

  const reload = async () => {
    const [s, u, c, t, p, o] = await Promise.all([
      apiJson<Stats>("/api/admin/stats"),
      apiJson<{ users: AdminUser[] }>("/api/admin/users"),
      apiJson<{ complaints: typeof complaints }>("/api/admin/complaints"),
      apiJson<{ items: typeof types }>("/api/admin/dictionaries/types"),
      apiJson<{ items: PairRow[] }>("/api/admin/dictionaries/pairs"),
      apiJson<{ orders: AdminOrder[] }>("/api/admin/orders"),
    ]);
    setStats(s);
    setUsers(u.users);
    setComplaints(c.complaints);
    setTypes(t.items);
    setPairs(p.items);
    setOrders(o.orders);
  };

  useEffect(() => {
    void reload().catch((e) => toast.push(e));
  }, []);

  async function addType(e: FormEvent) {
    e.preventDefault();
    try {
      await apiJson("/api/admin/dictionaries/types", {
        method: "POST",
        body: JSON.stringify({ code: newTypeCode, label: newTypeLabel }),
      });
      setNewTypeCode("");
      setNewTypeLabel("");
      toast.push("Тип добавлен");
      void reload();
    } catch (err) {
      toast.push(err);
    }
  }

  async function addPair(e: FormEvent) {
    e.preventDefault();
    try {
      await apiJson("/api/admin/dictionaries/pairs", {
        method: "POST",
        body: JSON.stringify({
          sourceLanguage: pairSrc,
          targetLanguage: pairTgt,
          label: pairLabel || undefined,
        }),
      });
      setPairLabel("");
      toast.push("Языковая пара добавлена");
      void reload();
    } catch (err) {
      toast.push(err);
    }
  }

  const userTotal = stats?.users.reduce((a, x) => a + x._count, 0) ?? 0;
  const orderTotal = stats?.orders.reduce((a, x) => a + x._count, 0) ?? 0;

  return (
    <div className="page">
      <PageBanner
        fullWidth
        title="Панель администратора"
        lead="Сводка по платформе, верификация переводчиков, жалобы, справочники и контроль заказов."
        image={images.admin}
        imageAlt="Команда администраторов"
      />

      {stats && (
        <FullWidthBlock tone="dark">
        <div className="stats-strip">
          <div className="stats-strip-item">
            <strong>{userTotal}</strong>
            <span>пользователей</span>
          </div>
          <div className="stats-strip-item">
            <strong>{orderTotal}</strong>
            <span>заказов</span>
          </div>
          <div className="stats-strip-item">
            <strong>{stats.pendingVerify}</strong>
            <span>на верификации</span>
          </div>
          <div className="stats-strip-item">
            <strong>{complaints.length}</strong>
            <span>жалоб в очереди</span>
          </div>
        </div>
        </FullWidthBlock>
      )}

      <PageInner className="page-inner--wide">
      {stats && (
        <div className="grid2" style={{ marginBottom: "1.25rem" }}>
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Пользователи по ролям</h2>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {stats.users.map((u) => (
                <li key={u.role}>
                  <strong>{u.role}</strong> — {u._count}
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Заказы по статусам</h2>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {stats.orders.map((o) => (
                <li key={o.status}>
                  <strong>{statusLabel(o.status)}</strong> — {o._count}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Заказы (последние 100)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Статус</th>
                <th>Заказчик</th>
                <th>Переводчик</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.title}</td>
                  <td>
                    <span className="status-pill">{o.status}</span>
                  </td>
                  <td className="muted" style={{ fontSize: "0.88rem" }}>
                    {o.client.fullName}
                  </td>
                  <td className="muted" style={{ fontSize: "0.88rem" }}>
                    {o.translator?.fullName ?? "—"}
                  </td>
                  <td>
                    <Link to={`/orders/${o.id}`}>Открыть</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Пользователи</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Активен</th>
                <th>Верификация</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.isActive ? "да" : "нет"}</td>
                  <td>
                    {u.role === "TRANSLATOR" ? (
                      <span className="badge">{u.translatorProfile?.isVerified ? "Да" : "Нет"}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {u.role === "TRANSLATOR" && (
                        <button
                          type="button"
                          className="ghost"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
                          onClick={() =>
                            void apiJson(`/api/admin/translators/${u.id}/verify`, {
                              method: "PATCH",
                              body: JSON.stringify({ isVerified: !u.translatorProfile?.isVerified }),
                            })
                              .then(() => {
                                toast.push("Верификация обновлена");
                                void reload();
                              })
                              .catch((e) => toast.push(e))
                          }
                        >
                          {u.translatorProfile?.isVerified ? "Снять" : "Верифицировать"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
                        onClick={() =>
                          void apiJson(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ isActive: !u.isActive }),
                          })
                            .then(() => {
                              toast.push("Статус обновлён");
                              void reload();
                            })
                            .catch((e) => toast.push(e))
                        }
                      >
                        {u.isActive ? "Блокировать" : "Разблокировать"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Жалобы</h2>
        {complaints.length === 0 ? (
          <p className="muted">Жалоб нет.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {complaints.map((c) => (
              <article
                key={c.id}
                style={{
                  padding: "1rem 1.1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong>{c.order.title}</strong>
                  <span className="status-pill">{c.status}</span>
                </div>
                <p className="muted" style={{ margin: "0.35rem 0", fontSize: "0.88rem" }}>
                  От {c.author.fullName}
                </p>
                <p style={{ margin: "0.5rem 0" }}>{c.body}</p>
                <button
                  type="button"
                  onClick={() =>
                    void apiJson(`/api/admin/complaints/${c.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "RESOLVED", adminNotes: "Рассмотрено в демо" }),
                    })
                      .then(() => {
                        toast.push("Жалоба закрыта");
                        void reload();
                      })
                      .catch((e) => toast.push(e))
                  }
                >
                  Закрыть как решённую
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="admin-dict-grid">
        <section className="card card-accent admin-dict-card">
          <div className="admin-dict-card__head">
            <h2>Типы перевода</h2>
            <p className="muted">Тематики для заказов и коэффициенты в калькуляторе цены.</p>
          </div>
          <ul className="admin-dict-list">
            {types.map((t) => (
              <li key={t.id} className="admin-dict-item">
                <div className="admin-dict-item__main">
                  <code className="admin-dict-code">{t.code}</code>
                  <span className="admin-dict-label">{t.label}</span>
                </div>
                <div className="admin-dict-item__actions">
                  <span className={`admin-dict-badge ${t.isActive ? "admin-dict-badge--on" : ""}`}>
                    {t.isActive ? "Активен" : "Выключен"}
                  </span>
                  <button
                    type="button"
                    className="ghost admin-dict-btn"
                    onClick={() =>
                      void apiJson(`/api/admin/dictionaries/types/${t.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ isActive: !t.isActive }),
                      })
                        .then(() => void reload())
                        .catch((e) => toast.push(e))
                    }
                  >
                    {t.isActive ? "Выключить" : "Включить"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={addType} className="filter-panel admin-dict-form admin-dict-form--2">
            <h3 className="admin-dict-form__title">Добавить тип</h3>
            <label className="form-field">
              Код
              <input value={newTypeCode} onChange={(e) => setNewTypeCode(e.target.value)} placeholder="legal" required />
            </label>
            <label className="form-field">
              Название
              <input value={newTypeLabel} onChange={(e) => setNewTypeLabel(e.target.value)} placeholder="Юридический" required />
            </label>
            <div className="filter-panel-actions admin-dict-form__actions">
              <button type="submit" className="btn">
                Добавить
              </button>
            </div>
          </form>
        </section>

        <section className="card admin-dict-card">
          <div className="admin-dict-card__head">
            <h2>Языковые пары</h2>
            <p className="muted">Направления перевода и множитель редкости для расчёта стоимости.</p>
          </div>
          <ul className="admin-dict-list">
            {pairs.map((p) => (
              <li key={p.id} className="admin-dict-item">
                <div className="admin-dict-item__main">
                  <span className="admin-dict-label">{p.label ?? `${p.sourceLanguage} → ${p.targetLanguage}`}</span>
                  <span className="admin-dict-meta">×{String(p.rarityMultiplier)}</span>
                </div>
                <div className="admin-dict-item__actions">
                  <span className={`admin-dict-badge ${p.isActive ? "admin-dict-badge--on" : ""}`}>
                    {p.isActive ? "Активна" : "Выключена"}
                  </span>
                  <button
                    type="button"
                    className="ghost admin-dict-btn"
                    onClick={() =>
                      void apiJson(`/api/admin/dictionaries/pairs/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ isActive: !p.isActive }),
                      })
                        .then(() => void reload())
                        .catch((e) => toast.push(e))
                    }
                  >
                    {p.isActive ? "Выключить" : "Включить"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={addPair} className="filter-panel admin-dict-form admin-dict-form--3">
            <h3 className="admin-dict-form__title">Добавить пару</h3>
            <label className="form-field">
              Источник
              <input value={pairSrc} onChange={(e) => setPairSrc(e.target.value)} placeholder="en" required />
            </label>
            <label className="form-field">
              Цель
              <input value={pairTgt} onChange={(e) => setPairTgt(e.target.value)} placeholder="ru" required />
            </label>
            <label className="form-field">
              Подпись
              <input value={pairLabel} onChange={(e) => setPairLabel(e.target.value)} placeholder="Английский → Русский" />
            </label>
            <div className="filter-panel-actions admin-dict-form__actions">
              <button type="submit" className="btn">
                Добавить пару
              </button>
            </div>
          </form>
        </section>
      </div>

      <FullWidthBlock tone="surface" wide>
        <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
          Функции модерации платформы
        </p>
        <div className="trust-row">
          {trustBadges.map((b) => (
            <span key={b} className="trust-pill">
              {b}
            </span>
          ))}
        </div>
      </FullWidthBlock>
      </PageInner>
    </div>
  );
}
