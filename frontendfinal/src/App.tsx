import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastProvider } from "./ToastContext";
import { Layout } from "./Layout";
import { LandingPage } from "./pages/LandingPage";
import { CatalogPage } from "./pages/CatalogPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { OrderPage } from "./pages/OrderPage";
import { TranslatorPublicPage } from "./pages/TranslatorPublicPage";
import { ClientCabinetPage } from "./pages/ClientCabinetPage";
import { TranslatorCabinetPage } from "./pages/TranslatorCabinetPage";
import { AdminCabinetPage } from "./pages/AdminCabinetPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import type { ReactElement } from "react";

function RequireAuth({ children, roles }: { children: ReactElement; roles?: ("CLIENT" | "TRANSLATOR" | "ADMIN")[] }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted shell">Загрузка…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="translators/:userId" element={<TranslatorPublicPage />} />
        <Route path="orders/:id" element={<OrderPage />} />
        <Route
          path="orders/new"
          element={
            <RequireAuth roles={["CLIENT"]}>
              <NewOrderPage />
            </RequireAuth>
          }
        />
        <Route
          path="notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="cabinet/client"
          element={
            <RequireAuth roles={["CLIENT"]}>
              <ClientCabinetPage />
            </RequireAuth>
          }
        />
        <Route
          path="cabinet/translator"
          element={
            <RequireAuth roles={["TRANSLATOR"]}>
              <TranslatorCabinetPage />
            </RequireAuth>
          }
        />
        <Route
          path="cabinet/admin"
          element={
            <RequireAuth roles={["ADMIN"]}>
              <AdminCabinetPage />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
