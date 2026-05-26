import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type T = { push: (msg: string) => void };
const Ctx = createContext<T | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const push = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3800);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {msg ? (
        <div className="toast-wrap">
          <div className="toast">{msg}</div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastProvider");
  return v;
}
