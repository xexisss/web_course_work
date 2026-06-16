import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiJson, getToken, setToken } from "./api";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "CLIENT" | "TRANSLATOR" | "ADMIN";
  phone?: string | null;
};

type AuthCtx = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: "CLIENT" | "TRANSLATOR";
  }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshMe = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const me = await apiJson<{ id: string; email: string; fullName: string; role: AuthUser["role"]; phone?: string }>(
        "/api/auth/me",
      );
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshMe().finally(() => setReady(true));
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiJson<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (p: { email: string; password: string; fullName: string; phone?: string; role: "CLIENT" | "TRANSLATOR" }) => {
      const res = await apiJson<{ token: string; user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(p),
      });
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refreshMe }),
    [user, ready, login, register, logout, refreshMe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider");
  return v;
}
