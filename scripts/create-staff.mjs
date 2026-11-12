#!/usr/bin/env node
/**
 * Crea un usuario del personal (dueño o cocina) en Supabase Auth y lo vincula
 * a la tabla `staff` de la sede piloto.
 *
 * Uso:
 *   node scripts/create-staff.mjs <email> <password> <owner|kitchen> "<Nombre>"
 *
 * Requiere variables de entorno (o un archivo .env cargado por el shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_LOCATION_ID (opcional; por defecto 'facatativa-piloto')
 *
 * Para repartidores no se necesita este script: se crean en la tabla `staff`
 * con un PIN directamente desde el SQL o desde el panel.
 */
import { createClient } from "@supabase/supabase-js";

const [, , email, password, role, ...nameParts] = process.argv;
const name = nameParts.join(" ");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const locationId = process.env.NEXT_PUBLIC_LOCATION_ID || "facatativa-piloto";

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
  );
  process.exit(1);
}
if (!email || !password || !role || !name) {
  console.error(
    'Uso: node scripts/create-staff.mjs <email> <password> <owner|kitchen> "<Nombre>"'
  );
  process.exit(1);
}
if (role !== "owner" && role !== "kitchen") {
  console.error("El rol debe ser 'owner' o 'kitchen'.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createErr) {
  console.error("Error creando el usuario:", createErr.message);
  process.exit(1);
}

const userId = created.user.id;

const { error: staffErr } = await supabase.from("staff").insert({
  user_id: userId,
  location_id: locationId,
  name,
  role,
  active: true,
});

if (staffErr) {
  console.error("Usuario creado pero falló el registro en staff:", staffErr.message);
  process.exit(1);
}

console.log(`✓ Usuario ${role} creado: ${email} (sede ${locationId})`);
