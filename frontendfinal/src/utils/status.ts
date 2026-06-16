const LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  SUBMITTED: "Опубликован",
  PENDING_TRANSLATOR: "Ожидает исполнителя",
  ACCEPTED: "Принят",
  IN_PROGRESS: "В работе",
  DELIVERED: "Сдано",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  DISPUTED: "Спор",
  OPEN: "Открыта",
  IN_REVIEW: "На рассмотрении",
  RESOLVED: "Решена",
  DISMISSED: "Отклонена",
  HELD: "Заморожен",
  RELEASED: "Выплачен",
  REFUNDED: "Возврат",
};

export function statusLabel(code: string): string {
  return LABELS[code] ?? code;
}
