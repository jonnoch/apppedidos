"use client";

import { useState } from "react";
import type { Order, OrderStatus, Staff } from "@/lib/types";
import {
  formatCOP,
  minutesSinceLabel,
  paymentLabel,
  statusLabel,
} from "@/lib/format";
import { assignDriver, updateOrderStatus } from "./actions";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  nuevo: "en_preparacion",
  en_preparacion: "listo",
  listo: "en_camino",
  en_camino: "entregado",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  nuevo: "Empezar preparación",
  en_preparacion: "Marcar listo",
  listo: "Enviar (en camino)",
  en_camino: "Marcar entregado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  nuevo: "bg-red-100 text-red-800",
  en_preparacion: "bg-amber-100 text-amber-800",
  listo: "bg-blue-100 text-blue-800",
  en_camino: "bg-purple-100 text-purple-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-gray-200 text-gray-600",
};

export default function OrderCard({
  order,
  drivers,
  highlight,
}: {
  order: Order;
  drivers: Staff[];
  highlight?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const next = NEXT_STATUS[order.status];

  async function advance() {
    if (!next) return;
    setBusy(true);
    await updateOrderStatus(order.id, next);
    setBusy(false);
  }

  async function cancel() {
    if (!confirm(`¿Cancelar el pedido #${order.order_number}?`)) return;
    setBusy(true);
    await updateOrderStatus(order.id, "cancelado");
    setBusy(false);
  }

  async function onAssign(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true);
    await assignDriver(order.id, e.target.value || null);
    setBusy(false);
  }

  return (
    <div
      className={`card p-4 ${
        highlight ? "ring-2 ring-brand animate-pulse-once" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <span className="text-lg font-bold">#{order.order_number}</span>
          <span
            className={`chip ml-2 ${STATUS_COLORS[order.status]}`}
          >
            {statusLabel(order.status)}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {minutesSinceLabel(order.created_at)}
        </span>
      </div>

      {/* Ítems */}
      <ul className="mb-3 space-y-1 text-sm">
        {order.order_items?.map((it) => (
          <li key={it.id}>
            <span className="font-medium">
              {it.quantity}x {it.product_name}
              {it.size_name ? ` (${it.size_name})` : ""}
            </span>
            {it.flavors.length > 0 && (
              <span className="text-gray-600"> — {it.flavors.join(", ")}</span>
            )}
            {it.drink_choice && (
              <span className="text-gray-600"> — {it.drink_choice}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Datos cliente */}
      <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm">
        <p className="font-medium">{order.customer_name}</p>
        <p>
          {order.address}, {order.town}
        </p>
        <p>
          Tel:{" "}
          <a href={`tel:${order.customer_phone}`} className="text-brand">
            {order.customer_phone}
          </a>
        </p>
        {order.notes && <p className="mt-1 italic text-gray-600">“{order.notes}”</p>}
      </div>

      {/* Totales */}
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>{paymentLabel(order.payment_method)}</span>
        <span className="text-right">
          <span className="text-gray-500">
            Dom. {formatCOP(order.delivery_fee)}
          </span>{" "}
          · <span className="font-bold">{formatCOP(order.total)}</span>
        </span>
      </div>

      {/* Asignar repartidor */}
      {(order.status === "listo" ||
        order.status === "en_camino" ||
        order.status === "en_preparacion") && (
        <div className="mb-3">
          <label className="label">Repartidor</label>
          <select
            className="input py-2"
            value={order.driver_id ?? ""}
            onChange={onAssign}
            disabled={busy}
          >
            <option value="">Sin asignar</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        {next && (
          <button
            onClick={advance}
            disabled={busy}
            className="btn-primary flex-1 py-2"
          >
            {NEXT_LABEL[order.status]}
          </button>
        )}
        {order.status !== "entregado" && order.status !== "cancelado" && (
          <button
            onClick={cancel}
            disabled={busy}
            className="btn-secondary px-3 py-2 text-sm text-red-600"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
