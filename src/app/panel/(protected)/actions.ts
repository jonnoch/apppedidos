"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/staff";
import type { OrderStatus } from "@/lib/types";

const VALID_STATUSES: OrderStatus[] = [
  "nuevo",
  "en_preparacion",
  "listo",
  "en_camino",
  "entregado",
  "cancelado",
];

// Actualiza el estado de un pedido. RLS garantiza que solo el staff de la sede
// pueda modificar sus pedidos (usamos el cliente con sesión, no admin).
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "No autorizado." };
  if (!VALID_STATUSES.includes(status))
    return { ok: false, error: "Estado inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel");
  return { ok: true };
}

// Asigna un repartidor a un pedido.
export async function assignDriver(
  orderId: string,
  driverId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "No autorizado." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ driver_id: driverId })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel");
  return { ok: true };
}
