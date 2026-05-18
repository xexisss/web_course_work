import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"CLIENT" | "TRANSLATOR">("CLIENT");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ email, password, fullName, phone: phone || undefined, role });
      toast.push("Учётная запись создана");
      nav("/");
    } catch (err) {
      toast.push(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="auth-split" style={{ margin: "0 auto", maxWidth: 920 }}>
        <aside className="auth-aside">
          <h2>Новый участник</h2>
          <p>
            Заказчик публикует заказы и выбирает переводчика по откликам. Переводчик заполняет публичный профиль и
            работает с витриной открытых задач. Роль администратора в демо создаётся через seed.
          </p>
        </aside>
        <div className="auth-form-wrap">
          <h1 className="page-title" style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>
            Регистрация
          </h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
            Все поля, кроме телефона, обязательны для отправки формы.
          </p>
          <form onSubmit={onSubmit}>
            <label className="form-field">
              ФИО
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
            </label>
            <label className="form-field" style={{ marginTop: "0.75rem" }}>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label className="form-field" style={{ marginTop: "0.75rem" }}>
              Телефон <span className="muted" style={{ fontWeight: 500 }}>(необязательно)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 …" />
            </label>
            <label className="form-field" style={{ marginTop: "0.75rem" }}>
              Пароль (не короче 6 символов)
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} />
            </label>
            <label className="form-field" style={{ marginTop: "0.75rem" }}>
              Роль
              <select value={role} onChange={(e) => setRole(e.target.value as "CLIENT" | "TRANSLATOR")}>
                <option value="CLIENT">Заказчик</option>
                <option value="TRANSLATOR">Переводчик</option>
              </select>
            </label>
            <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "Создание…" : "Зарегистрироваться"}
              </button>
              <Link to="/login" className="ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Уже есть аккаунт
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
