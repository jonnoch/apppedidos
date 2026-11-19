import { createClient } from "@/lib/supabase/server";
import { LOCATION_ID } from "@/lib/config";
import { loadMenu } from "@/lib/menu-data";
import { storeOpenState } from "@/lib/hours";
import OrderApp from "./OrderApp";

// Server Component: carga el menú de la sede y entrega el estado de apertura.
// La página es pública (sin cuenta).
export const dynamic = "force-dynamic";

export default async function PedirPage() {
  // Chequeo de configuración: si faltan las variables de entorno, lo decimos
  // claramente (causa #1 de "No se pudo cargar el menú" en producción).
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">Configuración incompleta</h1>
        <p className="mt-2 text-gray-600">
          Faltan variables de entorno en el servidor:
        </p>
        <ul className="mt-2 text-sm text-red-700">
          {missing.map((m) => (
            <li key={m}>
              <code>{m}</code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Agrégalas en Vercel (Settings → Environment Variables) y vuelve a
          desplegar.
        </p>
      </main>
    );
  }

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
        <p className="mt-3 text-xs text-gray-500">
          Sede buscada: <code>{LOCATION_ID}</code>. Revisa los logs de la función
          en Vercel para ver el error exacto de Supabase.
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
