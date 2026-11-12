import { createClient } from "@/lib/supabase/server";
import { LOCATION_ID } from "@/lib/config";
import type { Order, Staff } from "@/lib/types";
import KitchenBoard from "./KitchenBoard";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const supabase = await createClient();

  // Pedidos activos (no entregados ni cancelados) y los recientes del día.
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*), driver:driver_id(name)")
    .eq("location_id", LOCATION_ID)
    .order("created_at", { ascending: false })
    .limit(60);

  const { data: drivers } = await supabase
    .from("staff")
    .select("*")
    .eq("location_id", LOCATION_ID)
    .eq("role", "driver")
    .eq("active", true)
    .order("name");

  return (
    <KitchenBoard
      initialOrders={(orders ?? []) as Order[]}
      drivers={(drivers ?? []) as Staff[]}
      locationId={LOCATION_ID}
    />
  );
}
