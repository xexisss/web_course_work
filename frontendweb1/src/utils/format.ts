/** Форматирование сумм в белорусских рублях */
export function formatBYN(amount: number | null | undefined, compact = false): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const n = Number(amount);
  const formatted = n.toLocaleString("ru-RU", {
    minimumFractionDigits: compact && Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} бел. руб.`;
}

export function formatBYNPer1000(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `${formatBYN(amount, true)} / 1000 зн.`;
}
