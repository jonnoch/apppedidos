import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCATION_ID } from "@/lib/config";
import type { Order } from "@/lib/types";
import DriverLogin from "./DriverLogin";
import DriverBoard from "./DriverBoard";

export const dynamic = "force-dynamic";

export default async function RepartidorPage() {
  const cookieStore = await cookies();
  const driverId = cookieStore.get("driver_id")?.value;

  if (!driverId) {
    return <DriverLogin />;
  }

  const supabase = createAdminClient();

  const { data: driver } = await supabase
    .from("staff")
    .select("id, name")
    .eq("id", driverId)
    .eq("location_id", LOCATION_ID)
    .eq("role", "driver")
    .eq("active", true)
    .maybeSingle();

  if (!driver) {
    // Cookie inválida: mostrar login.
    return <DriverLogin />;
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("location_id", LOCATION_ID)
    .eq("driver_id", driverId)
    .in("status", ["listo", "en_camino"])
    .order("created_at", { ascending: true });

  return (
    <DriverBoard
      driverId={driverId}
      driverName={driver.name}
      initialOrders={(orders ?? []) as Order[]}
      locationId={LOCATION_ID}
    />
  );
}
