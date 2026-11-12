"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCOP, paymentLabel, statusLabel } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function DriverBoard({
  driverId,
  driverName,
  initialOrders,
  locationId,
}: {
  driverId: string;
  driverName: string;
  initialOrders: Order[];
  locationId: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const supabase = useRef(createClient());

  const refresh = useCallback(async () => {
    const { data } = await supabase.current
      .from("orders")
      .select("*, order_items(*)")
      .eq("location_id", locationId)
      .eq("driver_id", driverId)
      .in("status", ["listo", "en_camino"])
      .order("created_at", { ascending: true });
    setOrders((data ?? []) as Order[]);
  }, [driverId, locationId]);

  // Realtime: cualquier cambio en pedidos de la sede refresca la lista del repartidor.
  useEffect(() => {
    const channel = supabase.current
      .channel("driver-" + driverId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();
    return () => {
      void supabase.current.removeChannel(channel);
    };
  }, [driverId, locationId, refresh]);

  async function markDelivered(orderId: string, orderNumber: number) {
    if (!confirm(`¿Marcar el pedido #${orderNumber} como entregado?`)) return;
    setBusy(orderId);
    const res = await fetch("/api/driver/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setBusy(null);
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      alert("No se pudo marcar como entregado.");
    }
  }

  async function logout() {
    await fetch("/api/driver/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-10 bg-charcoal text-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <p className="font-bold">Mis entregas</p>
            <p className="text-xs opacity-80">{driverName}</p>
          </div>
          <button onClick={logout} className="text-sm underline opacity-90">
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md p-4">
        {orders.length === 0 ? (
          <p className="py-16 text-center text-gray-400">
            No tienes entregas asignadas por ahora.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${o.address}, ${o.town}, Colombia`
              )}`;
              return (
                <div key={o.id} className="card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-lg font-bold">#{o.order_number}</span>
                    <span className="chip bg-blue-100 text-blue-800">
                      {statusLabel(o.status)}
                    </span>
                  </div>

                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-sm text-gray-700">
                    {o.address}, {o.town}
                  </p>

                  <ul className="my-2 text-sm text-gray-600">
                    {o.order_items?.map((it) => (
                      <li key={it.id}>
                        {it.quantity}x {it.product_name}
                        {it.size_name ? ` (${it.size_name})` : ""}
                      </li>
                    ))}
                  </ul>

                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span>{paymentLabel(o.payment_method)}</span>
                    <span className="font-bold">{formatCOP(o.total)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-2 text-sm"
                    >
                      🗺️ Mapa
                    </a>
                    <a
                      href={`tel:${o.customer_phone}`}
                      className="btn-secondary py-2 text-sm"
                    >
                      📞 Llamar
                    </a>
                  </div>
                  <button
                    onClick={() => markDelivered(o.id, o.order_number)}
                    disabled={busy === o.id}
                    className="btn-primary mt-2 w-full py-2"
                  >
                    {busy === o.id ? "Guardando..." : "✓ Marcar entregado"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
