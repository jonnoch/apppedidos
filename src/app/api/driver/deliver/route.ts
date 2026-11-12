import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCATION_ID } from "@/lib/config";

// POST /api/driver/deliver — el repartidor marca un pedido como entregado.
// Solo puede afectar pedidos asignados a él.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const driverId = cookieStore.get("driver_id")?.value;
  if (!driverId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { orderId } = await request.json().catch(() => ({ orderId: "" }));
  if (!orderId) {
    return NextResponse.json({ error: "Falta el pedido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "entregado" })
    .eq("id", orderId)
    .eq("location_id", LOCATION_ID)
    .eq("driver_id", driverId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json(
      { error: "Pedido no asignado a ti." },
      { status: 403 }
    );

  return NextResponse.json({ ok: true });
}
