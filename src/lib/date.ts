// Local (not UTC) "today" as YYYY-MM-DD, matching the format Postgres
// returns for a `date` column and what <input type="date"> expects/emits.
export function todayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverdue(nextContactDate: string | null): boolean {
  if (!nextContactDate) return false;
  return nextContactDate <= todayISODate();
}
