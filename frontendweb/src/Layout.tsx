import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

const navCls = ({ isActive }: { isActive: boolean }) => "navlink" + (isActive ? " active" : "");

export function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let alive = true;
    const tick = async () => {
      const r = await apiFetch("/api/notifications");
      if (!r.ok || !alive) return;
      const j = (await r.json()) as { notifications: { readAt: string | null }[] };
      setUnread(j.notifications.filter((n) => !n.readAt).length);
    };
    void tick();
    const id = setInterval(tick, 25000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [user]);

  return (
    <div className="shell">
      <nav className="topnav">
        <Link className="brand" to="/">
          LinguaTrade
        </Link>
        <NavLink to="/" className={navCls}>
          Каталог
        </NavLink>
        <NavLink to="/reviews" className={navCls}>
          Отзывы
        </NavLink>
        {!user && (
          <>
            <NavLink to="/login" className={navCls}>
              Вход
            </NavLink>
            <NavLink to="/register" className={navCls}>
              Регистрация
            </NavLink>
          </>
        )}
        {user?.role === "CLIENT" && (
          <>
            <NavLink to="/orders/new" className={navCls}>
              Новый заказ
            </NavLink>
            <NavLink to="/cabinet/client" className={navCls}>
              Кабинет заказчика
            </NavLink>
          </>
        )}
        {user?.role === "TRANSLATOR" && (
          <NavLink to="/cabinet/translator" className={navCls}>
            Кабинет переводчика
          </NavLink>
        )}
        {user?.role === "ADMIN" && (
          <NavLink to="/cabinet/admin" className={navCls}>
            Администрирование
          </NavLink>
        )}
        {user && (
          <div className="nav-user">
            <span>
              {user.fullName}
              {unread > 0 ? <span className="badge badge-warn" style={{ marginLeft: 8 }}>{unread} нов.</span> : null}
            </span>
            <button
              type="button"
              className="btn-nav-out"
              onClick={() => {
                logout();
                nav("/");
              }}
            >
              Выйти
            </button>
          </div>
        )}
      </nav>
      <Outlet />
      <p className="footer-hint">Учебный проект: онлайн-платформа заказа услуг переводчиков · PostgreSQL · Prisma · REST · React</p>
    </div>
  );
}
