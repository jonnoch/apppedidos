import { createClient } from "@/lib/supabase/server";
import { LOCATION_ID } from "@/lib/config";
import { loadMenu } from "@/lib/menu-data";
import { storeOpenState } from "@/lib/hours";
import OrderApp from "./OrderApp";

// Server Component: carga el menú de la sede y entrega el estado de apertura.
// La página es pública (sin cuenta).
export const dynamic = "force-dynamic";

export default async function PedirPage() {
  const supabase = await createClient();
  const menu = await loadMenu(supabase, LOCATION_ID);

  if (!menu) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">No se pudo cargar el menú</h1>
        <p className="mt-2 text-gray-600">
          Verifica la configuración de la sede. Si el problema continúa,
          comunícate con la pizzería.
        </p>
      </main>
    );
  }

  const open = storeOpenState(
    menu.location.open_hour,
    menu.location.close_hour,
    menu.location.orders_paused,
    menu.location.hours_text
  );

  return <OrderApp menu={menu} openState={open} />;
}
