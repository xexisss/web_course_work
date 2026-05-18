import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, downloadWithAuth } from "../api";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";

type Row = { id: string; title: string; status: string; agreedPrice: number | null };

export function TranslatorCabinetPage() {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const [mine, setMine] = useState<Row[]>([]);
  const [market, setMarket] = useState<Row[]>([]);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState(1000);
  const [from, setFrom] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const reload = async () => {
    const [m, mk] = await Promise.all([
      apiJson<{ orders: Row[] }>("/api/orders/mine"),
      apiJson<{ orders: Row[] }>("/api/orders/market"),
    ]);
    setMine(m.orders);
    setMarket(mk.orders);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    void apiJson<{ translatorProfile: { headline: string | null; bio: string | null; ratePer1000: number } }>("/api/auth/me").then(
      (me) => {
        if (me.translatorProfile) {
          setHeadline(me.translatorProfile.headline ?? "");
          setBio(me.translatorProfile.bio ?? "");
          setRate(Number(me.translatorProfile.ratePer1000));
        }
      },
    );
  }, [user?.id]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await apiJson("/api/profile/translator/me", {
        method: "PATCH",
        body: JSON.stringify({ headline, bio, ratePer1000: rate }),
      });
      toast.push("Профиль сохранён");
      void refreshMe();
    } catch (err) {
      toast.push(String(err));
    }
  }

  return (
    <div className="page">
      <header className="page-hero">
        <h1 className="page-title">Кабинет переводчика</h1>
        <p className="page-lead">
          Публичная витрина, ставка за 1000 знаков, отчёт по доходам и списки открытых и назначенных заказов — по сценарию
          ТЗ.
        </p>
        {user?.id && (
          <Link to={`/translators/${user.id}`} className="btn" style={{ display: "inline-flex", marginTop: "0.5rem" }}>
            Открыть публичный профиль
          </Link>
        )}
      </header>

      <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="stat-card">
          <span className="lbl">Витрина заказов</span>
          <span className="val">{market.length}</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Мои заказы</span>
          <span className="val">{mine.length}</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Ставка</span>
          <span className="val" style={{ fontSize: "1.25rem" }}>
            {rate} ₽
          </span>
        </div>
      </div>

      <section className="card card-accent" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Профиль на витрине</h2>
        <form onSubmit={saveProfile}>
          <label className="form-field">
            Заголовок
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Кратко о специализации" />
          </label>
          <label className="form-field" style={{ marginTop: "0.75rem" }}>
            О себе
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </label>
          <label className="form-field" style={{ marginTop: "0.75rem" }}>
            Ставка ₽ / 1000 зн.
            <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} min={1} />
          </label>
          <button type="submit" className="btn" style={{ marginTop: "1rem" }}>
            Сохранить
          </button>
        </form>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Отчёт по доходам (PDF)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Выгрузка за период для отчётности и защиты проекта.
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
                `/api/reports/translator-income?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
                "income-report.pdf",
              ).catch((e) => toast.push(String(e)))
            }
          >
            Скачать PDF
          </button>
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Витрина открытых заказов</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {market.map((o) => (
                <tr key={o.id}>
                  <td>{o.title}</td>
                  <td>
                    <span className="status-pill">{o.status}</span>
                  </td>
                  <td>
                    <Link to={`/orders/${o.id}`}>Открыть</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {market.length === 0 && <p className="muted">Сейчас нет открытых заказов для отклика.</p>}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Назначенные мне заказы</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Статус</th>
                <th>Сумма ₽</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/orders/${o.id}`}>{o.title}</Link>
                  </td>
                  <td>
                    <span className="status-pill">{o.status}</span>
                  </td>
                  <td>{o.agreedPrice ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mine.length === 0 && <p className="muted">Пока нет назначенных заказов.</p>}
      </section>
    </div>
  );
}
