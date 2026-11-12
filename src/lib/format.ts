// Formato de moneda COP y utilidades de presentación (es-CO)

/**
 * Formatea un entero en COP al estilo $32.000 (punto como separador de miles).
 */
export function formatCOP(value: number): string {
  const n = Math.round(value || 0);
  const formatted = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(n);
  return `$${formatted}`;
}

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  en_preparacion: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo contra entrega",
  transferencia: "Nequi/Daviplata contra entrega",
};

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

/**
 * Minutos transcurridos desde una fecha ISO.
 */
export function minutesSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 60000));
}

export function minutesSinceLabel(iso: string): string {
  const m = minutesSince(iso);
  if (m < 1) return "hace menos de 1 min";
  if (m === 1) return "hace 1 min";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `hace ${h} h` : `hace ${h} h ${rest} min`;
}
