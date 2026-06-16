import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { apiFetch, apiJson, readApiError } from "../api";

import { useToast } from "../ToastContext";

import { PageBanner } from "../components/PageBanner";

import { PageInner } from "../components/PageInner";

import { images } from "../content/images";

import { howItWorks } from "../content/siteInfo";

import { formatBYN } from "../utils/format";



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

          const errMsg = await readApiError(res);

          toast.push(`Файл «${file.name}»: ${errMsg}`);

        }

      }

      toast.push(submit ? "Заказ опубликован" : "Черновик сохранён");

      if (sourceFiles.length) toast.push("Исходные файлы отправлены на сервер");

      nav(`/orders/${order.id}`);

    } catch (err) {

      toast.push(err);

    } finally {

      setBusy(false);

    }

  }



  return (

    <div className="page">

      <PageBanner

        fullWidth

        title="Новый заказ"

        lead="Опишите задачу, укажите языковую пару и объём — стоимость пересчитывается автоматически в белорусских рублях."

        image={images.order}

        imageAlt="Документы для перевода"

      />



      <PageInner className="page-inner--wide">

        <div className="new-order-layout">

          <section className="card new-order-main">

            <h2 className="new-order-heading">Параметры заказа</h2>



            <div className="new-order-section">

              <label className="form-field">

                Краткое название

                <input

                  value={title}

                  onChange={(e) => setTitle(e.target.value)}

                  required

                  minLength={3}

                  placeholder="Например: локализация лендинга"

                />

              </label>

            </div>



            <div className="new-order-section">

              <label className="form-field">

                Описание и требования

                <textarea

                  value={description}

                  onChange={(e) => setDescription(e.target.value)}

                  required

                  minLength={10}

                  rows={5}

                  placeholder="Стиль, сроки, формат сдачи, пожелания по терминологии…"

                />

              </label>

            </div>



            <div className="new-order-section">

              <p className="new-order-section-title">Языковая пара и условия</p>

              <div className="new-order-fields">

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

                <label className="form-field new-order-field--wide">

                  Объём (слов)

                  <input

                    type="number"

                    min={100}

                    value={wordCount}

                    onChange={(e) => setWordCount(Number(e.target.value) || 100)}

                  />

                </label>

              </div>

            </div>



            {opts && opts.languagePairs.length > 0 && (

              <div className="new-order-section">

                <p className="new-order-section-title">Быстрый выбор пары</p>

                <div className="chip-row">

                  {opts.languagePairs.slice(0, 8).map((p) => (

                    <button

                      key={`${p.sourceLanguage}-${p.targetLanguage}`}

                      type="button"

                      className="chip chip-btn"

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



          <aside className="new-order-aside">

            <section className="card new-order-price-card">

              <p className="new-order-price-label">Ориентировочная цена</p>

              <p className="new-order-price-value">{estimate != null ? formatBYN(estimate) : "…"}</p>

              <p className="muted new-order-price-hint">

                Итоговая сумма фиксируется при выборе исполнителя и отклике.

              </p>

            </section>



            <section className="card">

              <h3 className="new-order-aside-title">Исходные файлы</h3>

              <label className="dropzone new-order-dropzone">

                <input type="file" multiple style={{ display: "none" }} onChange={(e) => onPickFiles(e.target.files)} />

                <strong>Перетащите файлы сюда или нажмите для выбора</strong>

                <p className="muted">Исходники (SOURCE) · до 15 МБ на файл</p>

              </label>

              {sourceFiles.length > 0 && (

                <ul className="new-order-file-list">

                  {sourceFiles.map((f, i) => (

                    <li key={`${f.name}-${i}`}>

                      <span className="new-order-file-name">{f.name}</span>

                      <button type="button" className="ghost new-order-file-remove" onClick={() => removeFile(i)}>

                        Убрать

                      </button>

                    </li>

                  ))}

                </ul>

              )}

            </section>



            <div className="new-order-actions">

              <button type="button" className="btn secondary btn-block btn-lg" disabled={busy} onClick={() => void save(false)}>

                Сохранить черновик

              </button>

              <button type="button" className="btn btn-block btn-lg" disabled={busy} onClick={() => void save(true)}>

                Опубликовать заказ

              </button>

            </div>

          </aside>

        </div>



        <section className="card new-order-next">

          <h2 style={{ marginTop: 0 }}>Что будет дальше</h2>

          <ol className="new-order-steps">

            {howItWorks.slice(1).map((s) => (

              <li key={s.step}>

                <strong>{s.title}</strong> — {s.text}

              </li>

            ))}

          </ol>

        </section>

      </PageInner>

    </div>

  );

}


