/** "hace 5 min", "hace 2 h"... a partir de una fecha ISO. */
export function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "hace un momento";
  if (minutes === 1) return "hace 1 min";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "hace 1 h" : `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}
