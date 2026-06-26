export type CupetState = "available" | "new" | "empty" | "waitroom";

export const STATE_STYLE: Record<
  CupetState,
  { color: string; fill: string; border: string }
> = {
  available: { color: "var(--brand)", fill: "var(--brand-fill)", border: "var(--brand-border)" },
  new: { color: "var(--accent)", fill: "var(--accent-fill)", border: "var(--accent-border)" },
  empty: { color: "var(--danger)", fill: "var(--danger-fill)", border: "var(--danger-border)" },
  waitroom: { color: "var(--text-muted)", fill: "var(--muted-fill)", border: "var(--muted-border)" },
};

export function cupetState(s: {
  disponibilidades: number;
  admiteSalaEspera: boolean;
  confirmed: boolean;
}): { state: CupetState; label: string } {
  if (!s.confirmed) return { state: "new", label: "SIN DETALLE" };
  if (s.disponibilidades > 0)
    return { state: "available", label: `${s.disponibilidades} cupos` };
  if (s.admiteSalaEspera) return { state: "waitroom", label: "Sala espera" };
  return { state: "empty", label: "0 cupos" };
}
