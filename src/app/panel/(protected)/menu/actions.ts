"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/staff";

type Result = { ok: boolean; error?: string };

async function requireOwner(): Promise<Result> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "No autorizado." };
  if (staff.role !== "owner")
    return { ok: false, error: "Solo el dueño puede gestionar el menú." };
  return { ok: true };
}

function revalidate() {
  revalidatePath("/panel/menu");
  revalidatePath("/pedir");
}

// --- Productos ---------------------------------------------------------------
export async function setProductSoldOut(
  productId: string,
  soldOut: boolean
): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ sold_out: soldOut })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateProductPrice(
  productId: string,
  price: number
): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  if (!Number.isFinite(price) || price < 0)
    return { ok: false, error: "Precio inválido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ price: Math.round(price) })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateSizePrice(
  sizeId: string,
  price: number
): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  if (!Number.isFinite(price) || price < 0)
    return { ok: false, error: "Precio inválido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_sizes")
    .update({ price: Math.round(price) })
    .eq("id", sizeId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function createSimpleProduct(form: FormData): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const staff = await getCurrentStaff();
  const name = String(form.get("name") || "").trim();
  const categoryId = String(form.get("category_id") || "").trim();
  const price = Math.round(Number(form.get("price")) || 0);
  const description = String(form.get("description") || "").trim() || null;
  if (!name || !categoryId || price <= 0)
    return { ok: false, error: "Completa nombre, categoría y precio." };

  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString().slice(-4);

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    location_id: staff!.location_id,
    category_id: categoryId,
    slug,
    name,
    description,
    product_type: "simple",
    price,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteProduct(productId: string): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// --- Sabores -----------------------------------------------------------------
export async function addFlavor(name: string): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const staff = await getCurrentStaff();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nombre de sabor vacío." };
  const supabase = await createClient();
  const { error } = await supabase.from("flavors").insert({
    location_id: staff!.location_id,
    category_id: "pizzas",
    name: trimmed,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function setFlavorSoldOut(
  flavorId: string,
  soldOut: boolean
): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from("flavors")
    .update({ sold_out: soldOut })
    .eq("id", flavorId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteFlavor(flavorId: string): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const supabase = await createClient();
  const { error } = await supabase.from("flavors").delete().eq("id", flavorId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// --- Pausar pedidos / horario ------------------------------------------------
export async function setOrdersPaused(paused: boolean): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ orders_paused: paused })
    .eq("id", staff!.location_id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// --- Zonas de domicilio (pueblos) --------------------------------------------
export async function updateZone(
  zoneId: string,
  km: number,
  fee: number
): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_zones")
    .update({ km, delivery_fee: Math.round(fee) })
    .eq("id", zoneId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function addZone(form: FormData): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const staff = await getCurrentStaff();
  const name = String(form.get("name") || "").trim();
  const km = Number(form.get("km")) || 0;
  const fee = Math.round(Number(form.get("fee")) || 0);
  if (!name || fee <= 0)
    return { ok: false, error: "Completa el nombre y la tarifa del pueblo." };
  const supabase = await createClient();
  const { error } = await supabase.from("delivery_zones").insert({
    location_id: staff!.location_id,
    name,
    km,
    delivery_fee: fee,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteZone(zoneId: string): Promise<Result> {
  const g = await requireOwner();
  if (!g.ok) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("id", zoneId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
