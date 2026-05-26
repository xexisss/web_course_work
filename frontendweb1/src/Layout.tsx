import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

const navCls = ({ isActive }: { isActive: boolean }) => "navlink" + (isActive ? " active" : "");

export function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-root">
      <header className="site-header">
        <nav className={`topnav ${menuOpen ? "topnav--open" : ""}`} aria-label="Основное меню">
          <Link className="brand" to="/" onClick={closeMenu}>
            LinguaTrade
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav-panel"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="sr-only">{menuOpen ? "Закрыть меню" : "Открыть меню"}</span>
          </button>

          <div id="main-nav-panel" className="topnav-panel">
            <div className="topnav-links">
              <NavLink to="/" end className={navCls} onClick={closeMenu}>
                Главная
              </NavLink>
              <NavLink to="/catalog" className={navCls} onClick={closeMenu}>
                Каталог
              </NavLink>
              <NavLink to="/reviews" className={navCls} onClick={closeMenu}>
                Отзывы
              </NavLink>
              {!user && (
                <>
                  <NavLink to="/login" className={navCls} onClick={closeMenu}>
                    Вход
                  </NavLink>
                  <NavLink to="/register" className={navCls} onClick={closeMenu}>
                    Регистрация
                  </NavLink>
                </>
              )}
              {user?.role === "CLIENT" && (
                <>
                  <NavLink to="/orders/new" className={navCls} onClick={closeMenu}>
                    Новый заказ
                  </NavLink>
                  <NavLink to="/cabinet/client" className={navCls} onClick={closeMenu}>
                    Кабинет заказчика
                  </NavLink>
                </>
              )}
              {user?.role === "TRANSLATOR" && (
                <NavLink to="/cabinet/translator" className={navCls} onClick={closeMenu}>
                  Кабинет переводчика
                </NavLink>
              )}
              {user?.role === "ADMIN" && (
                <NavLink to="/cabinet/admin" className={navCls} onClick={closeMenu}>
                  Администрирование
                </NavLink>
              )}
            </div>

            {user && (
              <div className="nav-user">
                <span className="nav-user-name">
                  {user.fullName}
                  {unread > 0 ? <span className="badge badge-warn nav-badge">{unread} нов.</span> : null}
                </span>
                <button
                  type="button"
                  className="btn-nav-out"
                  onClick={() => {
                    logout();
                    nav("/");
                    closeMenu();
                  }}
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer" aria-label="Подвал">
        <div className="site-footer-inner">
          <div className="footer-grid">
            <div className="footer-col footer-brand-col">
              <Link className="footer-brand" to="/">
                LinguaTrade
              </Link>
              <p className="footer-lead">
                Платформа заказа услуг переводчиков в Беларуси. Прозрачные цены в белорусских рублях.
              </p>
              <div className="footer-social">
                <a className="footer-pill" href="mailto:support@linguatrade.by">
                  support@linguatrade.by
                </a>
                <span className="footer-pill footer-pill--muted">Telegram</span>
                <span className="footer-pill footer-pill--muted">VK</span>
              </div>
            </div>

            <div className="footer-col">
              <strong className="footer-title">Разделы</strong>
              <ul className="footer-links">
                <li>
                  <Link to="/">Главная</Link>
                </li>
                <li>
                  <Link to="/catalog">Каталог</Link>
                </li>
                <li>
                  <Link to="/reviews">Отзывы</Link>
                </li>
                <li>
                  <Link to="/orders/new">Новый заказ</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <strong className="footer-title">Аккаунт</strong>
              <ul className="footer-links">
                {!user ? (
                  <>
                    <li>
                      <Link to="/login">Вход</Link>
                    </li>
                    <li>
                      <Link to="/register">Регистрация</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to={user.role === "CLIENT" ? "/cabinet/client" : user.role === "TRANSLATOR" ? "/cabinet/translator" : "/cabinet/admin"}>
                        Личный кабинет
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="footer-link-btn"
                        onClick={() => {
                          logout();
                          nav("/");
                        }}
                      >
                        Выйти
                      </button>
                    </li>
                  </>
                )}
                <li>
                  <Link to="/forgot-password">Восстановление пароля</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <strong className="footer-title">Контакты</strong>
              <div className="footer-contacts">
                <div className="footer-contact">
                  <span className="footer-contact-k">Email</span>
                  <a href="mailto:support@linguatrade.by">support@linguatrade.by</a>
                </div>
                <div className="footer-contact">
                  <span className="footer-contact-k">Телефон</span>
                  <span className="footer-contact-v">+375 (29) 734-18-62</span>
                </div>
                <div className="footer-contact">
                  <span className="footer-contact-k">Город</span>
                  <span className="footer-contact-v">Минск</span>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} LinguaTrade</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
