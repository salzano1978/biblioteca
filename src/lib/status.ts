export const READ_LABELS: Record<string, string> = {
  da_leggere: "Da leggere",
  in_lettura: "In lettura",
  letto: "Letto",
};
export const READ_ORDER = ["da_leggere", "in_lettura", "letto"] as const;

export const today = () => new Date().toISOString().slice(0, 10);

export function formatDate(d?: string | null) {
  if (!d) return "";
  const [y, m, g] = d.split("-");
  return `${g}/${m}/${y}`;
}
