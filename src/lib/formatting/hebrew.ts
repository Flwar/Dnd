const numberFormatter = new Intl.NumberFormat("he-IL");
const dateFormatter = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const relativeFormatter = new Intl.RelativeTimeFormat("he-IL", { numeric: "auto" });

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatDateTime(value: string | Date) {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatRelativeTime(value: string | Date, now = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const differenceSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(differenceSeconds) < 60) return relativeFormatter.format(differenceSeconds, "second");
  const minutes = Math.round(differenceSeconds / 60);
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relativeFormatter.format(days, "day");
  return formatDateTime(date);
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (!hours) return `${formatNumber(minutes)} דקות`;
  return `${formatNumber(hours)} שעות ו־${formatNumber(minutes)} דקות`;
}
