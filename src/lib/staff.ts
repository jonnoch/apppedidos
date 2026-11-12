import { createClient } from "@/lib/supabase/server";
import { LOCATION_ID } from "@/lib/config";
import type { Staff } from "@/lib/types";

/**
 * Devuelve el registro de staff del usuario autenticado para la sede piloto,
 * o null si no hay sesión / no pertenece a la sede.
 */
export async function getCurrentStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", user.id)
    .eq("location_id", LOCATION_ID)
    .eq("active", true)
    .maybeSingle();

  return (data as Staff) ?? null;
}
