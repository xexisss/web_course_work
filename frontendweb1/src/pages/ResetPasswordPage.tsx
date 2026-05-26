import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../api";
import { useToast } from "../ToastContext";
import { PageBanner } from "../components/PageBanner";
import { PageInner } from "../components/PageInner";
import { images } from "../content/images";

export function ResetPasswordPage() {
  const [sp] = useSearchParams();
  const toast = useToast();
  const nav = useNavigate();
  const [token, setToken] = useState(sp.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      toast.push("Пароль обновлён. Войдите снова.");
      nav("/login");
    } catch (err) {
      toast.push(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageBanner
        title="Новый пароль"
        lead="Вставьте токен из письма (или из демо-уведомления) и задайте новый пароль не короче 6 символов."
        image={images.office}
        imageAlt="Настройка безопасности"
      />

      <PageInner>
      <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
        <form onSubmit={onSubmit}>
          <label className="form-field">
            Токен сброса
            <input value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="one-time-code" />
          </label>
          <label className="form-field" style={{ marginTop: "0.85rem" }}>
            Новый пароль
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} required autoComplete="new-password" />
          </label>
          <div style={{ marginTop: "1.15rem", display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? "Сохранение…" : "Сохранить пароль"}
            </button>
            <Link to="/login" className="ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              На вход
            </Link>
          </div>
        </form>
      </div>
      </PageInner>
    </div>
  );
}
