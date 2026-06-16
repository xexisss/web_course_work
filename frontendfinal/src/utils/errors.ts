type ZodFlatten = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Название",
  description: "Описание",
  email: "Email",
  password: "Пароль",
  fullName: "Имя",
  phone: "Телефон",
  role: "Роль",
  sourceLanguage: "Исходный язык",
  targetLanguage: "Целевой язык",
  translationTypeCode: "Тип перевода",
  urgency: "Срочность",
  wordCount: "Объём (слов)",
  rating: "Оценка",
  comment: "Комментарий",
  body: "Текст",
  proposedPrice: "Предложенная цена",
  token: "Токен",
  code: "Код",
  label: "Название",
  sourceLanguage_targetLanguage: "Языковая пара",
};

function translateZodMessage(msg: string): string {
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^String must contain at least (\d+) character\(s\)$/, (m) => `Минимум ${m[1]} символов`],
    [/^String must contain at most (\d+) character\(s\)$/, (m) => `Максимум ${m[1]} символов`],
    [/^Invalid email$/, () => "Некорректный email"],
    [/^Required$/, () => "Обязательное поле"],
    [/^Expected number, received .+$/, () => "Укажите число"],
    [/^Number must be greater than (\d+)$/, (m) => `Число должно быть больше ${m[1]}`],
    [/^Number must be greater than or equal to (\d+)$/, (m) => `Число должно быть не меньше ${m[1]}`],
    [/^Invalid enum value\./, () => "Недопустимое значение"],
  ];
  for (const [re, fn] of rules) {
    const m = msg.match(re);
    if (m) return fn(m);
  }
  return msg;
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function formatFlatten(flat: ZodFlatten): string {
  const parts: string[] = [];
  for (const msg of flat.formErrors ?? []) {
    parts.push(translateZodMessage(msg));
  }
  for (const [key, msgs] of Object.entries(flat.fieldErrors ?? {})) {
    for (const msg of msgs) {
      parts.push(`${fieldLabel(key)}: ${translateZodMessage(msg)}`);
    }
  }
  return parts.join(". ") || "Проверьте введённые данные";
}

function tryParseJson(value: string): unknown {
  const t = value.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

export function formatApiError(error: unknown, status?: number): string {
  if (error == null) {
    return statusMessage(status);
  }

  if (typeof error === "string") {
    const parsed = tryParseJson(error);
    if (parsed && typeof parsed === "object") return formatApiError(parsed, status);
    return error;
  }

  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (obj.fieldErrors || obj.formErrors) {
      return formatFlatten(obj as ZodFlatten);
    }
    if (typeof obj.message === "string") {
      return formatApiError(obj.message, status);
    }
    if (typeof obj.error !== "undefined") {
      return formatApiError(obj.error, status);
    }
  }

  return statusMessage(status);
}

function statusMessage(status?: number): string {
  if (status === 401) return "Нужно войти в аккаунт";
  if (status === 403) return "Недостаточно прав для этого действия";
  if (status === 404) return "Данные не найдены";
  if (status === 409) return "Такая запись уже существует";
  if (status === 400) return "Проверьте введённые данные";
  if (status && status >= 500) return "Ошибка сервера. Попробуйте позже";
  return "Произошла ошибка. Попробуйте ещё раз";
}

export function formatUserError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.replace(/^Error:\s*/i, "");
    const parsed = tryParseJson(msg);
    if (parsed) return formatApiError(parsed);
    if (msg.includes("fieldErrors") || msg.includes("formErrors")) {
      const inner = tryParseJson(msg);
      if (inner) return formatApiError(inner);
    }
    return formatApiError(msg) || msg || "Произошла ошибка";
  }
  if (typeof err === "string") return formatApiError(err);
  return "Произошла неизвестная ошибка";
}

export async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return text || statusMessage(res.status);
  }
  const err = (data as { error?: unknown })?.error ?? data;
  return formatApiError(err, res.status);
}
