// Reglas de negocio del pedido. Compartidas entre cliente (UI) y servidor
// (validación al crear el pedido), para que los criterios de aceptación se
// cumplan en ambos lados.

import type { CartItem, DeliveryZone, Product, ProductSize } from "./types";

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
}

export function cartHasAlcohol(items: CartItem[]): boolean {
  return items.some((it) => it.isAlcohol);
}

/** Tarifa de domicilio según el pueblo seleccionado. */
export function deliveryFeeForTown(
  townName: string,
  zones: DeliveryZone[]
): number | null {
  const zone = zones.find((z) => z.name === townName && z.active);
  return zone ? zone.delivery_fee : null;
}

export interface CartLineValidation {
  ok: boolean;
  error?: string;
}

/**
 * Valida una línea del carrito antes de agregarla.
 * - Pizza: debe tener un tamaño y entre 1 y max_flavors sabores.
 * - Combo / gaseosa con elección: debe tener drinkChoice.
 */
export function validateCartLine(
  product: Product,
  opts: {
    size?: ProductSize;
    flavors: string[];
    drinkChoice?: string;
  }
): CartLineValidation {
  if (product.product_type === "pizza") {
    if (!opts.size) {
      return { ok: false, error: "Elige un tamaño de pizza." };
    }
    const n = opts.flavors.length;
    if (n < 1) {
      return { ok: false, error: "Elige al menos un sabor." };
    }
    if (n > opts.size.max_flavors) {
      return {
        ok: false,
        error: `Este tamaño permite máximo ${opts.size.max_flavors} ${
          opts.size.max_flavors === 1 ? "sabor" : "sabores"
        }.`,
      };
    }
  }

  if (
    (product.product_type === "combo" ||
      product.product_type === "drink_choice") &&
    product.requires_drink_choice
  ) {
    if (!opts.drinkChoice) {
      return { ok: false, error: "Elige una gaseosa." };
    }
    if (!product.drink_options.includes(opts.drinkChoice)) {
      return { ok: false, error: "La gaseosa elegida no es válida." };
    }
  }

  return { ok: true };
}

export interface CheckoutValidationInput {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  address: string;
  town: string;
  paymentMethod: string;
  ageConfirmed: boolean;
  consentAccepted: boolean;
  zones: DeliveryZone[];
}

export interface CheckoutValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Valida el pedido completo. Se usa en el cliente para habilitar el botón y en
 * el servidor como fuente de verdad (criterios de aceptación).
 */
export function validateCheckout(
  input: CheckoutValidationInput
): CheckoutValidation {
  const errors: string[] = [];

  if (input.items.length === 0) {
    errors.push("El carrito está vacío.");
  }

  if (!input.customerName.trim()) errors.push("Ingresa tu nombre.");
  if (!input.customerPhone.trim()) errors.push("Ingresa tu teléfono.");
  if (!input.address.trim()) errors.push("Ingresa la dirección de entrega.");

  const fee = deliveryFeeForTown(input.town, input.zones);
  if (fee === null) {
    errors.push("Selecciona un pueblo de entrega válido.");
  }

  if (
    input.paymentMethod !== "efectivo" &&
    input.paymentMethod !== "transferencia"
  ) {
    errors.push("Selecciona un método de pago.");
  }

  // Regla: si hay alcohol en el carrito, exigir confirmación de mayoría de edad.
  if (cartHasAlcohol(input.items) && !input.ageConfirmed) {
    errors.push(
      "Debes confirmar que eres mayor de 18 años para pedir bebidas alcohólicas."
    );
  }

  // Regla: consentimiento de datos (Habeas Data) obligatorio.
  if (!input.consentAccepted) {
    errors.push("Debes aceptar la política de tratamiento de datos.");
  }

  return { ok: errors.length === 0, errors };
}

/** Construye el texto del pedido para enviar por WhatsApp. */
export function buildWhatsAppMessage(args: {
  orderNumber: number;
  items: CartItem[];
  customerName: string;
  address: string;
  town: string;
  phone: string;
  notes?: string;
  paymentMethod: string;
  deliveryFee: number;
  subtotal: number;
  total: number;
  formatCOP: (n: number) => string;
}): string {
  const lines: string[] = [];
  lines.push(`*Pedido #${args.orderNumber}* — Pizzería 90 grados`);
  lines.push("");
  lines.push("*Productos:*");
  for (const it of args.items) {
    let desc = `• ${it.quantity}x ${it.name}`;
    if (it.sizeName) desc += ` (${it.sizeName})`;
    if (it.flavors.length) desc += ` — ${it.flavors.join(", ")}`;
    if (it.drinkChoice) desc += ` — ${it.drinkChoice}`;
    desc += `  ${args.formatCOP(it.unitPrice * it.quantity)}`;
    lines.push(desc);
  }
  lines.push("");
  lines.push(`*Cliente:* ${args.customerName}`);
  lines.push(`*Teléfono:* ${args.phone}`);
  lines.push(`*Dirección:* ${args.address}, ${args.town}`);
  if (args.notes?.trim()) lines.push(`*Notas:* ${args.notes.trim()}`);
  lines.push("");
  lines.push(
    `*Pago:* ${
      args.paymentMethod === "efectivo"
        ? "Efectivo contra entrega"
        : "Nequi/Daviplata contra entrega"
    }`
  );
  lines.push(`Subtotal: ${args.formatCOP(args.subtotal)}`);
  lines.push(`Domicilio: ${args.formatCOP(args.deliveryFee)}`);
  lines.push(`*Total: ${args.formatCOP(args.total)}*`);
  return lines.join("\n");
}
