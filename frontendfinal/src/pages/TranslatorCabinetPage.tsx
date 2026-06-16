import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, downloadWithAuth } from "../api";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { PageBanner } from "../components/PageBanner";
import { FullWidthBlock } from "../components/FullWidthBlock";
import { PageInner } from "../components/PageInner";
import { translatorTips } from "../content/siteInfo";
import { formatBYN, formatBYNPer1000 } from "../utils/format";
import { statusLabel } from "../utils/status";

type Row = { id: string; title: string; status: string; agreedPrice: number | null };

export function TranslatorCabinetPage() {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const [mine, setMine] = useState<Row[]>([]);
  const [market, setMarket] = useState<Row[]>([]);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState(48);
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
      toast.push(err);
    }
  }

  const inWorkSum = mine
    .filter((o) => ["ACCEPTED", "IN_PROGRESS", "DELIVERED"].includes(o.status))
    .reduce((s, o) => s + (o.agreedPrice ?? 0), 0);

  return (
    <div className="page">
      <PageBanner
        fullWidth
        title="Кабинет переводчика"
        lead="Публичный профиль, ставка в белорусских рублях, витрина заказов и отчёт по доходам. Откликайтесь на открытые задачи с реалистичным дедлайном."
      >
        {user?.id && (
          <Link to={`/translators/${user.id}`} className="btn" style={{ display: "inline-flex", marginTop: "0.75rem" }}>
            Открыть публичный профиль
          </Link>
        )}
      </PageBanner>

      <FullWidthBlock tone="accent" wide>
        <div className="cabinet-quick" style={{ marginBottom: 0 }}>
          {translatorTips.map((tip) => (
            <div key={tip} className="card card-tight" style={{ boxShadow: "var(--shadow)" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>{tip}</p>
            </div>
          ))}
        </div>
      </FullWidthBlock>

      <PageInner>
      <div className="stat-grid profile-stat-grid cabinet-stat-grid">
        <div className="stat-card profile-stat-card">
          <span className="lbl">Витрина заказов</span>
          <span className="val">{market.length}</span>
        </div>
        <div className="stat-card profile-stat-card">
          <span className="lbl">Мои заказы</span>
          <span className="val">{mine.length}</span>
        </div>
        <div className="stat-card profile-stat-card">
          <span className="lbl">Ставка</span>
          <span className="val val--money">{formatBYNPer1000(rate)}</span>
        </div>
        <div className="stat-card profile-stat-card">
          <span className="lbl">Сумма в работе</span>
          <span className="val val--money">{formatBYN(inWorkSum)}</span>
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
            Ставка (бел. руб. / 1000 зн.)
            <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} min={1} step={0.5} />
          </label>
          <button type="submit" className="btn" style={{ marginTop: "1rem" }}>
            Сохранить
          </button>
        </form>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Отчёт по доходам (PDF)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Выгрузка за период для отчётности.
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
              ).catch((e) => toast.push(e))
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
                    <span className="status-pill">{statusLabel(o.status)}</span>
                  </td>
                  <td>
                    <Link to={`/orders/${o.id}`}>Откликнуться</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {market.length === 0 && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Сейчас нет открытых заказов — загляните позже или уточните фильтры на витрине.
          </p>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Назначенные мне заказы</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Статус</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/orders/${o.id}`}>{o.title}</Link>
                  </td>
                  <td>
                    <span className="status-pill">{statusLabel(o.status)}</span>
                  </td>
                  <td>{formatBYN(o.agreedPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mine.length === 0 && <p className="muted" style={{ marginBottom: 0 }}>Пока нет назначенных заказов.</p>}
      </section>
      </PageInner>
    </div>
  );
}
