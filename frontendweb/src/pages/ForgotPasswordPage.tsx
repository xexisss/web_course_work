import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api";
import { useToast } from "../ToastContext";

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await apiJson<{ resetToken?: string; hint?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.push("Если email найден, можно сбросить пароль.");
      if (r.resetToken) {
        toast.push(`Демо-токен: ${r.resetToken.slice(0, 12)}… — вставьте на странице сброса`);
      }
    } catch (err) {
      toast.push(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-hero" style={{ maxWidth: 560, margin: "0 auto 1.5rem" }}>
        <h1 className="page-title">Восстановление доступа</h1>
        <p className="page-lead">
          Запросите токен сброса по email. В учебной сборке токен может дублироваться во всплывающем уведомлении — в
          продакшене его отправляли бы письмом.
        </p>
      </header>
      <div className="card card-accent" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Запрос токена</h2>
        <form onSubmit={onSubmit}>
          <label className="form-field">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <div style={{ marginTop: "1.1rem", display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? "Отправка…" : "Получить токен"}
            </button>
            <Link to="/reset-password" className="ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Уже есть токен
            </Link>
            <Link to="/login" className="muted" style={{ fontSize: "0.88rem", alignSelf: "center" }}>
              Назад ко входу
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
