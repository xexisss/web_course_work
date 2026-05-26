import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { PageInner } from "../components/PageInner";
import { images } from "../content/images";

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.push("Добро пожаловать!");
      nav("/");
    } catch (err) {
      toast.push(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageInner>
      <div className="auth-split" style={{ margin: "0 auto", maxWidth: 920 }}>
        <aside className="auth-aside auth-aside--img">
          <img className="auth-aside-bg" src={images.auth} alt="" />
          <div className="auth-aside-content">
            <h2>LinguaTrade</h2>
            <p>
              Войдите, чтобы создавать заказы, откликаться на витрину, вести переписку с исполнителем и управлять
              файлами проекта.
            </p>
            <p className="muted" style={{ opacity: 0.85, fontSize: "0.85rem" }}>
              Демо после seed: <code style={{ color: "#fff" }}>client@example.local</code> / <code style={{ color: "#fff" }}>password123</code>
            </p>
          </div>
        </aside>
        <div className="auth-form-wrap">
          <h1 className="page-title" style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>
            Вход
          </h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
            Укажите email и пароль учётной записи.
          </p>
          <form onSubmit={onSubmit}>
            <label className="form-field">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" />
            </label>
            <label className="form-field" style={{ marginTop: "0.85rem" }}>
              Пароль
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "Вход…" : "Войти"}
              </button>
              <Link to="/register" className="ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Регистрация
              </Link>
              <Link to="/forgot-password" className="muted" style={{ fontSize: "0.88rem" }}>
                Забыли пароль?
              </Link>
            </div>
          </form>
        </div>
      </div>
      </PageInner>
    </div>
  );
}
