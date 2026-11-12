import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: OMITE RLS. Usar SOLO en el servidor (API routes).
// Se usa para insertar pedidos del cliente anónimo tras validar las reglas
// de negocio en el servidor, y para operaciones de administración.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
