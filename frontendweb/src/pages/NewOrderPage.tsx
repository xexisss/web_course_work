import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiJson } from "../api";
import { useToast } from "../ToastContext";

type Pair = { sourceLanguage: string; targetLanguage: string; label: string | null };

export function NewOrderPage() {
  const toast = useToast();
  const nav = useNavigate();
  const [opts, setOpts] = useState<{ translationTypes: { code: string; label: string }[]; languagePairs: Pair[] } | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("ru");
  const [translationTypeCode, setTranslationTypeCode] = useState("");
  const [urgency, setUrgency] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [wordCount, setWordCount] = useState<number>(1500);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);

  useEffect(() => {
    void apiJson<{ translationTypes: { code: string; label: string }[]; languagePairs: Pair[] }>("/api/catalog/options").then(
      (o) => setOpts({ translationTypes: o.translationTypes, languagePairs: o.languagePairs ?? [] }),
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void apiJson<{ estimatedPrice: number }>("/api/orders/estimate", {
        method: "POST",
        body: JSON.stringify({
          sourceLanguage,
          targetLanguage,
          translationTypeCode: translationTypeCode || undefined,
          urgency,
          wordCount,
        }),
      })
        .then((r) => setEstimate(r.estimatedPrice))
        .catch(() => setEstimate(null));
    }, 450);
    return () => clearTimeout(t);
  }, [sourceLanguage, targetLanguage, translationTypeCode, urgency, wordCount]);

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    setSourceFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(i: number) {
    setSourceFiles((prev) => prev.filter((_, j) => j !== i));
  }

  async function save(submit: boolean) {
    setBusy(true);
    try {
      const { order } = await apiJson<{ order: { id: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          sourceLanguage,
          targetLanguage,
          translationTypeCode: translationTypeCode || undefined,
          urgency,
          wordCount,
          submit,
        }),
      });
      for (const file of sourceFiles) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "SOURCE");
        const res = await apiFetch(`/api/orders/${order.id}/files`, { method: "POST", body: fd });
        if (!res.ok) {
          const txt = await res.text();
          toast.push(`Файл «${file.name}»: ${txt || res.statusText}`);
        }
      }
      toast.push(submit ? "Заказ опубликован" : "Черновик сохранён");
      if (sourceFiles.length) toast.push("Исходные файлы отправлены на сервер");
      nav(`/orders/${order.id}`);
    } catch (err) {
      toast.push(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-hero">
        <h1 className="page-title">Новый заказ</h1>
        <p className="page-lead">
          Опишите задачу, укажите языковую пару и объём — стоимость пересчитывается автоматически. После сохранения можно
          прикрепить исходники (как в ТЗ: файлы при создании заказа).
        </p>
      </header>

      <div className="grid2" style={{ alignItems: "start" }}>
        <section className="card card-accent">
          <h2 style={{ marginTop: 0 }}>Параметры</h2>
          <label className="form-field">
            Краткое название
            <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} placeholder="Например: локализация лендинга" />
          </label>
          <label className="form-field" style={{ marginTop: "0.75rem" }}>
            Описание и требования
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} rows={6} placeholder="Стиль, сроки, формат сдачи…" />
          </label>
          <div className="filter-panel" style={{ marginTop: "0.75rem" }}>
            <label className="form-field">
              С языка
              <input value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} placeholder="en" />
            </label>
            <label className="form-field">
              На язык
              <input value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} placeholder="ru" />
            </label>
            <label className="form-field">
              Тип перевода
              <select value={translationTypeCode} onChange={(e) => setTranslationTypeCode(e.target.value)}>
                <option value="">По умолчанию</option>
                {opts?.translationTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Срочность
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as "STANDARD" | "EXPRESS")}>
                <option value="STANDARD">Стандарт</option>
                <option value="EXPRESS">Срочно (+35%)</option>
              </select>
            </label>
            <label className="form-field">
              Объём (условных единиц)
              <input type="number" min={100} value={wordCount} onChange={(e) => setWordCount(Number(e.target.value) || 100)} />
            </label>
          </div>
          {opts && opts.languagePairs.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700 }}>
                Быстрый выбор пары из справочника
              </p>
              <div className="chip-row">
                {opts.languagePairs.slice(0, 8).map((p) => (
                  <button
                    key={`${p.sourceLanguage}-${p.targetLanguage}`}
                    type="button"
                    className="chip"
                    style={{ cursor: "pointer", border: "none", fontFamily: "inherit" }}
                    onClick={() => {
                      setSourceLanguage(p.sourceLanguage);
                      setTargetLanguage(p.targetLanguage);
                    }}
                  >
                    {p.label ?? `${p.sourceLanguage}→${p.targetLanguage}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Стоимость и файлы</h2>
          <div
            style={{
              padding: "1rem 1.15rem",
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, rgba(13,122,111,0.12), rgba(201,162,39,0.12))",
              border: "1px solid var(--line)",
              marginBottom: "1.25rem",
            }}
          >
            <p className="muted" style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700 }}>
              Ориентировочная цена
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-2)" }}>
              {estimate != null ? `${estimate.toFixed(2)} ₽` : "…"}
            </p>
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              Итоговая сумма фиксируется при выборе исполнителя и отклике.
            </p>
          </div>

          <label className="dropzone" style={{ display: "block", cursor: "pointer" }}>
            <input type="file" multiple style={{ display: "none" }} onChange={(e) => onPickFiles(e.target.files)} />
            <strong>Перетащите файлы сюда или нажмите для выбора</strong>
            <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
              Исходники (SOURCE) прикрепляются заказчиком; до 15 МБ на файл.
            </p>
          </label>
          {sourceFiles.length > 0 && (
            <ul style={{ margin: "1rem 0 0", paddingLeft: "1.1rem" }}>
              {sourceFiles.map((f, i) => (
                <li key={`${f.name}-${i}`} style={{ marginBottom: "0.35rem" }}>
                  {f.name}{" "}
                  <button type="button" className="ghost" style={{ marginLeft: "0.35rem", padding: "0.2rem 0.6rem", fontSize: "0.78rem" }} onClick={() => removeFile(i)}>
                    Убрать
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: "1.35rem", display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => void save(false)}>
              Сохранить черновик
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => void save(true)}>
              Опубликовать заказ
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
