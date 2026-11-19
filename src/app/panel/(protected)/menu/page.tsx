import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_ID } from "@/lib/config";
import { loadMenu } from "@/lib/menu-data";
import { getCurrentStaff } from "@/lib/staff";
import MenuManager from "./MenuManager";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "owner") {
    redirect("/panel");
  }

  const supabase = await createClient();
  const menu = await loadMenu(supabase, LOCATION_ID);
  if (!menu) {
    return <p className="p-6">No se pudo cargar el menú.</p>;
  }

  return <MenuManager menu={menu} />;
}
