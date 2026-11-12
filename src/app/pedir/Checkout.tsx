"use client";

import { useMemo, useState } from "react";
import type { CartItem, DeliveryZone, LocationRow } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import {
  cartHasAlcohol,
  cartSubtotal,
  deliveryFeeForTown,
  validateCheckout,
} from "@/lib/order-logic";

interface Props {
  items: CartItem[];
  zones: DeliveryZone[];
  location: LocationRow;
  onBack: () => void;
  onPlaced: (result: {
    orderNumber: number;
    whatsappUrl: string;
  }) => void;
}

export default function Checkout({
  items,
  zones,
  location,
  onBack,
  onPlaced,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState(zones[0]?.name ?? "");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState("efectivo");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>("");

  const hasAlcohol = useMemo(() => cartHasAlcohol(items), [items]);
  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const deliveryFee = deliveryFeeForTown(town, zones) ?? 0;
  const total = subtotal + deliveryFee;

  const validation = validateCheckout({
    items,
    customerName: name,
    customerPhone: phone,
    address,
    town,
    paymentMethod: payment,
    ageConfirmed,
    consentAccepted: consent,
    zones,
  });

  async function handleSubmit() {
    setServerError("");
    if (!validation.ok) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          address: address.trim(),
          town,
          notes: notes.trim(),
          paymentMethod: payment,
          ageConfirmed,
          consentAccepted: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(
          data?.errors?.join(" ") ||
            data?.error ||
            "No se pudo crear el pedido. Intenta de nuevo."
        );
        setSubmitting(false);
        return;
      }
      onPlaced({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
    } catch {
      setServerError("Error de conexión. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-40">
      <button onClick={onBack} className="mb-3 text-sm text-brand">
        ← Volver al menú
      </button>
      <h1 className="mb-4 text-xl font-bold">Confirmar pedido</h1>

      {/* Resumen de productos */}
      <div className="card mb-4 p-4">
        <h2 className="mb-2 font-semibold">Tu pedido</h2>
        <ul className="space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.key} className="flex justify-between gap-2">
              <span>
                {it.quantity}x {it.name}
                {it.sizeName ? ` (${it.sizeName})` : ""}
                {it.flavors.length ? ` — ${it.flavors.join(", ")}` : ""}
                {it.drinkChoice ? ` — ${it.drinkChoice}` : ""}
              </span>
              <span className="whitespace-nowrap font-medium">
                {formatCOP(it.unitPrice * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Datos de entrega */}
      <div className="card mb-4 space-y-3 p-4">
        <div>
          <label className="label">Nombre *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="label">Teléfono *</label>
          <input
            className="input"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 3124543390"
          />
        </div>
        <div>
          <label className="label">Dirección de entrega *</label>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, número, barrio, apto..."
          />
        </div>
        <div>
          <label className="label">Pueblo *</label>
          <select
            className="input"
            value={town}
            onChange={(e) => setTown(e.target.value)}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name} — domicilio {formatCOP(z.delivery_fee)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notas (opcional)</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones para la entrega, timbre, etc."
          />
        </div>
      </div>

      {/* Método de pago */}
      <div className="card mb-4 space-y-2 p-4">
        <h2 className="font-semibold">Método de pago</h2>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="pay"
            checked={payment === "efectivo"}
            onChange={() => setPayment("efectivo")}
            className="accent-brand"
          />
          Efectivo contra entrega
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="pay"
            checked={payment === "transferencia"}
            onChange={() => setPayment("transferencia")}
            className="accent-brand"
          />
          Nequi/Daviplata contra entrega
          {location.nequi_daviplata ? ` (${location.nequi_daviplata})` : ""}
        </label>
      </div>

      {/* Confirmación de edad si hay alcohol */}
      {hasAlcohol && (
        <label className="card mb-4 flex items-start gap-3 border-amber-300 bg-amber-50 p-4">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-1 accent-brand"
          />
          <span className="text-sm">
            Tu pedido incluye bebidas alcohólicas. Confirmo que{" "}
            <strong>soy mayor de 18 años</strong>.
          </span>
        </label>
      )}

      {/* Consentimiento Habeas Data */}
      <label className="mb-4 flex items-start gap-3 px-1 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 accent-brand"
        />
        <span>
          Acepto el tratamiento de mis datos personales según la{" "}
          <a
            href="/privacidad"
            target="_blank"
            className="text-brand underline"
          >
            política de privacidad (Habeas Data, Ley 1581 de 2012)
          </a>
          .
        </span>
      </label>

      {/* Totales */}
      <div className="card mb-4 space-y-1 p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCOP(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Domicilio ({town})</span>
          <span>{formatCOP(deliveryFee)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <span>Total</span>
          <span>{formatCOP(total)}</span>
        </div>
      </div>

      {serverError && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}
      {!validation.ok && (
        <ul className="mb-3 list-disc rounded-lg bg-gray-50 p-3 pl-6 text-xs text-gray-600">
          {validation.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleSubmit}
            disabled={!validation.ok || submitting}
            className="btn-primary w-full"
          >
            {submitting
              ? "Enviando pedido..."
              : `Confirmar pedido · ${formatCOP(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
