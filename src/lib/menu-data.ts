// Carga del menú y datos de la sede desde Supabase (lado servidor).
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  DeliveryZone,
  Flavor,
  LocationRow,
  Product,
  ProductSize,
} from "./types";

export interface MenuData {
  location: LocationRow;
  categories: Category[];
  products: Product[];
  flavors: Flavor[];
  zones: DeliveryZone[];
}

/**
 * Carga todo el catálogo público de una sede. Usa un cliente anon o admin.
 */
export async function loadMenu(
  supabase: SupabaseClient,
  locationId: string
): Promise<MenuData | null> {
  const [locationRes, categoriesRes, productsRes, sizesRes, flavorsRes, zonesRes] =
    await Promise.all([
      supabase.from("locations").select("*").eq("id", locationId).single(),
      supabase.from("categories").select("*").order("sort_order"),
      supabase
        .from("products")
        .select("*")
        .eq("location_id", locationId)
        .eq("active", true)
        .order("sort_order"),
      supabase.from("product_sizes").select("*").order("sort_order"),
      supabase
        .from("flavors")
        .select("*")
        .eq("location_id", locationId)
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("delivery_zones")
        .select("*")
        .eq("location_id", locationId)
        .eq("active", true)
        .order("sort_order"),
    ]);

  if (locationRes.error || !locationRes.data) {
    // Diagnóstico: aparece en los logs de la función en Vercel.
    console.error("[loadMenu] No se pudo cargar la sede", {
      locationId,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      error: locationRes.error?.message,
      code: locationRes.error?.code,
      details: locationRes.error?.details,
      hint: locationRes.error?.hint,
    });
    return null;
  }

  const sizesByProduct = new Map<string, ProductSize[]>();
  for (const s of (sizesRes.data ?? []) as ProductSize[]) {
    const arr = sizesByProduct.get(s.product_id) ?? [];
    arr.push(s);
    sizesByProduct.set(s.product_id, arr);
  }

  const products = ((productsRes.data ?? []) as Product[]).map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) ?? [],
  }));

  return {
    location: locationRes.data as LocationRow,
    categories: (categoriesRes.data ?? []) as Category[],
    products,
    flavors: (flavorsRes.data ?? []) as Flavor[],
    zones: (zonesRes.data ?? []) as DeliveryZone[],
  };
}
