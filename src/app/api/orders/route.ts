import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCATION_ID } from "@/lib/config";
import { storeOpenState } from "@/lib/hours";
import { formatCOP } from "@/lib/format";
import { buildWhatsAppMessage, validateCartLine } from "@/lib/order-logic";
import type { CartItem, Product, ProductSize } from "@/lib/types";

// POST /api/orders — crea un pedido. Fuente de verdad del servidor:
// - recalcula precios desde la BD (no confía en el cliente)
// - revalida todas las reglas de negocio (criterios de aceptación)
// - inserta con service role (omite RLS) tras validar
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const {
    items,
    customerName,
    customerPhone,
    address,
    town,
    notes,
    paymentMethod,
    ageConfirmed,
    consentAccepted,
  } = body ?? {};

  const errors: string[] = [];

  if (!Array.isArray(items) || items.length === 0)
    errors.push("El carrito está vacío.");
  if (!customerName?.trim()) errors.push("Falta el nombre.");
  if (!customerPhone?.trim()) errors.push("Falta el teléfono.");
  if (!address?.trim()) errors.push("Falta la dirección.");
  if (paymentMethod !== "efectivo" && paymentMethod !== "transferencia")
    errors.push("Método de pago inválido.");
  if (!consentAccepted)
    errors.push("Falta aceptar la política de tratamiento de datos.");

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Cargar sede y validar apertura/pausa.
  const { data: location, error: locErr } = await supabase
    .from("locations")
    .select("*")
    .eq("id", LOCATION_ID)
    .single();
  if (locErr || !location) {
    return NextResponse.json(
      { error: "No se encontró la sede." },
      { status: 400 }
    );
  }

  const open = storeOpenState(
    location.open_hour,
    location.close_hour,
    location.orders_paused,
    location.hours_text
  );
  if (!open.isOpen) {
    return NextResponse.json({ errors: [open.message] }, { status: 400 });
  }

  // Validar pueblo y tarifa de domicilio (desde la BD).
  const { data: zone } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("location_id", LOCATION_ID)
    .eq("name", town)
    .eq("active", true)
    .maybeSingle();
  if (!zone) {
    return NextResponse.json(
      { errors: ["Pueblo de entrega inválido."] },
      { status: 400 }
    );
  }
  const deliveryFee = zone.delivery_fee as number;

  // Cargar productos referenciados y recalcular precios desde la BD.
  const productIds = Array.from(
    new Set((items as CartItem[]).map((it) => it.productId))
  );
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("location_id", LOCATION_ID)
    .in("id", productIds);
  const { data: sizes } = await supabase
    .from("product_sizes")
    .select("*")
    .in(
      "product_id",
      ((products ?? []) as Product[]).map((p) => p.id)
    );

  const productMap = new Map<string, Product>(
    ((products ?? []) as Product[]).map((p) => [p.id, p])
  );
  const sizeMap = new Map<string, ProductSize>(
    ((sizes ?? []) as ProductSize[]).map((s) => [s.id, s])
  );
  const sizeBySlug = (productId: string, slug?: string) =>
    ((sizes ?? []) as ProductSize[]).find(
      (s) => s.product_id === productId && s.slug === slug
    );

  let subtotal = 0;
  let hasAlcohol = false;
  const lineItems: {
    product_name: string;
    size_name: string | null;
    flavors: string[];
    drink_choice: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[] = [];

  for (const raw of items as CartItem[]) {
    const product = productMap.get(raw.productId);
    if (!product || !product.active) {
      return NextResponse.json(
        { errors: ["Un producto del carrito ya no está disponible."] },
        { status: 400 }
      );
    }
    if (product.sold_out) {
      return NextResponse.json(
        { errors: [`"${product.name}" está agotado.`] },
        { status: 400 }
      );
    }

    const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
    let unitPrice: number;
    let sizeName: string | null = null;
    let size: ProductSize | undefined;

    if (product.product_type === "pizza") {
      size = sizeBySlug(product.id, raw.sizeSlug);
      if (!size) {
        return NextResponse.json(
          { errors: ["Tamaño de pizza inválido."] },
          { status: 400 }
        );
      }
      if (size.sold_out) {
        return NextResponse.json(
          { errors: [`El tamaño "${size.name}" está agotado.`] },
          { status: 400 }
        );
      }
      unitPrice = size.price;
      sizeName = size.name;
    } else {
      unitPrice = product.price ?? 0;
    }

    // Revalidar la línea con las reglas del dominio (sabores, gaseosa, etc.)
    const check = validateCartLine(product, {
      size,
      flavors: raw.flavors ?? [],
      drinkChoice: raw.drinkChoice,
    });
    if (!check.ok) {
      return NextResponse.json(
        { errors: [`${product.name}: ${check.error}`] },
        { status: 400 }
      );
    }

    if (product.is_alcohol) hasAlcohol = true;

    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;
    lineItems.push({
      product_name: product.name,
      size_name: sizeName,
      flavors: raw.flavors ?? [],
      drink_choice: raw.drinkChoice ?? null,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    });
  }

  // Regla crítica: alcohol requiere confirmación 18+.
  if (hasAlcohol && !ageConfirmed) {
    return NextResponse.json(
      {
        errors: [
          "Debes confirmar que eres mayor de 18 años para pedir bebidas alcohólicas.",
        ],
      },
      { status: 400 }
    );
  }

  const total = subtotal + deliveryFee;

  // Insertar pedido (order_number lo asigna el trigger por sede).
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      location_id: LOCATION_ID,
      status: "nuevo",
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      address: address.trim(),
      town,
      notes: notes?.trim() || null,
      payment_method: paymentMethod,
      delivery_fee: deliveryFee,
      subtotal,
      total,
      has_alcohol: hasAlcohol,
      age_confirmed: !!ageConfirmed,
      consent_accepted: !!consentAccepted,
    })
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "No se pudo crear el pedido." },
      { status: 500 }
    );
  }

  const itemsToInsert = lineItems.map((li) => ({ ...li, order_id: order.id }));
  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsToInsert);
  if (itemsErr) {
    // Revertir el pedido si fallan los ítems.
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "No se pudieron guardar los productos del pedido." },
      { status: 500 }
    );
  }

  // Construir mensaje de WhatsApp.
  const message = buildWhatsAppMessage({
    orderNumber: order.order_number,
    items: items as CartItem[],
    customerName: customerName.trim(),
    address: address.trim(),
    town,
    phone: customerPhone.trim(),
    notes,
    paymentMethod,
    deliveryFee,
    subtotal,
    total,
    formatCOP,
  });
  const waNumber = (location.whatsapp || "").replace(/\D/g, "");
  const waFull = waNumber.startsWith("57") ? waNumber : `57${waNumber}`;
  const whatsappUrl = `https://wa.me/${waFull}?text=${encodeURIComponent(
    message
  )}`;

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    subtotal,
    deliveryFee,
    total,
    whatsappUrl,
  });
}
