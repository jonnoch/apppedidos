import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCATION_ID } from "@/lib/config";

// POST /api/driver/login — login simple de repartidor por PIN.
// Guarda el driver_id en una cookie httpOnly.
export async function POST(request: Request) {
  const { pin } = await request.json().catch(() => ({ pin: "" }));
  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN requerido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: driver } = await supabase
    .from("staff")
    .select("id, name")
    .eq("location_id", LOCATION_ID)
    .eq("role", "driver")
    .eq("active", true)
    .eq("pin", pin.trim())
    .maybeSingle();

  if (!driver) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("driver_id", driver.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas
  });

  return NextResponse.json({ ok: true, name: driver.name });
}

// DELETE — cerrar sesión de repartidor.
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("driver_id");
  return NextResponse.json({ ok: true });
}
