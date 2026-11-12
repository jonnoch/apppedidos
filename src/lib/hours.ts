// Lógica de horario de atención en zona horaria America/Bogota.
// Bogotá no tiene horario de verano: siempre UTC-5.

const BOGOTA_OFFSET_HOURS = -5;

/**
 * Hora actual (0-23) en Bogotá, calculada desde UTC sin depender de la zona
 * horaria del servidor (que en Vercel suele ser UTC).
 */
export function currentBogotaHour(now: Date = new Date()): number {
  const utcHour = now.getUTCHours();
  return (utcHour + BOGOTA_OFFSET_HOURS + 24) % 24;
}

/**
 * ¿Está abierto según el horario [open_hour, close_hour)?
 * open_hour=13, close_hour=22 => abierto de 1:00 p.m. a 9:59 p.m.
 */
export function isWithinHours(
  openHour: number,
  closeHour: number,
  now: Date = new Date()
): boolean {
  const h = currentBogotaHour(now);
  if (openHour <= closeHour) {
    return h >= openHour && h < closeHour;
  }
  // Horario que cruza medianoche (no es el caso del piloto, pero por robustez)
  return h >= openHour || h < closeHour;
}

export interface StoreOpenState {
  isOpen: boolean;
  reason: "ok" | "paused" | "closed";
  message: string;
}

export function storeOpenState(
  openHour: number,
  closeHour: number,
  ordersPaused: boolean,
  hoursText: string,
  now: Date = new Date()
): StoreOpenState {
  if (ordersPaused) {
    return {
      isOpen: false,
      reason: "paused",
      message:
        "En este momento no estamos recibiendo pedidos. Por favor intenta más tarde.",
    };
  }
  if (!isWithinHours(openHour, closeHour, now)) {
    return {
      isOpen: false,
      reason: "closed",
      message: `Estamos cerrados. Horario de atención: ${hoursText}.`,
    };
  }
  return { isOpen: true, reason: "ok", message: "" };
}
