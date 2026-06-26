export type CupetState = "available" | "new" | "pending" | "empty" | "waitroom";

export const STATE_STYLE: Record<
  CupetState,
  { color: string; fill: string; border: string }
> = {
  available: { color: "var(--brand)", fill: "var(--brand-fill)", border: "var(--brand-border)" },
  new: { color: "var(--accent)", fill: "var(--accent-fill)", border: "var(--accent-border)" },
  pending: { color: "var(--text-muted)", fill: "var(--muted-fill)", border: "var(--muted-border)" },
  empty: { color: "var(--danger)", fill: "var(--danger-fill)", border: "var(--danger-border)" },
  waitroom: { color: "var(--text-muted)", fill: "var(--muted-fill)", border: "var(--muted-border)" },
};

// Mirrors the backend NEW_VIEWS_THRESHOLD: under this many views = still new.
export const NEW_VIEWS_THRESHOLD = 100;

export function cupetState(s: {
  disponibilidades: number;
  admiteSalaEspera: boolean;
  confirmed: boolean;
  isNew?: boolean;
  views?: number | null;
}): { state: CupetState; label: string } {
  // "New" wins so freshly-appeared cupets stand out (matches app + admin).
  const isNew = s.isNew ?? (s.views != null && s.views < NEW_VIEWS_THRESHOLD);
  if (isNew) return { state: "new", label: "NUEVO" };
  if (!s.confirmed) return { state: "pending", label: "SIN DETALLE" };
  if (s.disponibilidades > 0)
    return { state: "available", label: `${s.disponibilidades} cupos` };
  if (s.admiteSalaEspera) return { state: "waitroom", label: "Sala espera" };
  return { state: "empty", label: "0 cupos" };
}
