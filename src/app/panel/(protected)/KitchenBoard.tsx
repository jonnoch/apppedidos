"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrderSound } from "@/lib/useOrderSound";
import type { Order, Staff } from "@/lib/types";
import OrderCard from "./OrderCard";

const ACTIVE_STATUSES = ["nuevo", "en_preparacion", "listo", "en_camino"];

export default function KitchenBoard({
  initialOrders,
  drivers,
  locationId,
}: {
  initialOrders: Order[];
  drivers: Staff[];
  locationId: string;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [soundOn, setSoundOn] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const { play, enable } = useOrderSound();
  const supabase = useRef(createClient());

  // Carga un pedido completo (con ítems y repartidor) por id.
  const fetchOrder = useCallback(async (id: string): Promise<Order | null> => {
    const { data } = await supabase.current
      .from("orders")
      .select("*, order_items(*), driver:driver_id(name)")
      .eq("id", id)
      .single();
    return (data as Order) ?? null;
  }, []);

  useEffect(() => {
    const channel = supabase.current
      .channel("orders-" + locationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `location_id=eq.${locationId}`,
        },
        async (payload: { new: { id: string } }) => {
          const id = payload.new.id;
          const full = await fetchOrder(id);
          if (!full) return;
          setOrders((prev) => {
            if (prev.some((o) => o.id === full.id)) return prev;
            return [full, ...prev];
          });
          setNewIds((prev) => new Set(prev).add(full.id));
          if (soundOn) play();
          // Quitar el resaltado tras unos segundos.
          setTimeout(() => {
            setNewIds((prev) => {
              const n = new Set(prev);
              n.delete(full.id);
              return n;
            });
          }, 8000);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `location_id=eq.${locationId}`,
        },
        async (payload: { new: { id: string } }) => {
          const id = payload.new.id;
          const full = await fetchOrder(id);
          if (!full) return;
          setOrders((prev) =>
            prev.map((o) => (o.id === full.id ? full : o))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.current.removeChannel(channel);
    };
  }, [locationId, fetchOrder, play, soundOn]);

  // Refresco periódico de los "minutos desde creado".
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function enableSound() {
    enable();
    setSoundOn(true);
    play(); // confirmación audible
  }

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const closed = orders.filter(
    (o) => o.status === "entregado" || o.status === "cancelado"
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Pedidos</h1>
        {!soundOn ? (
          <button onClick={enableSound} className="btn-secondary py-2 text-sm">
            🔔 Activar sonido
          </button>
        ) : (
          <span className="chip bg-green-100 text-green-800">
            🔔 Sonido activo
          </span>
        )}
      </div>

      {!soundOn && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Toca “Activar sonido” para escuchar una alerta cuando entre un pedido
          nuevo. (Los navegadores requieren un toque para permitir el audio.)
        </p>
      )}

      {active.length === 0 ? (
        <p className="py-10 text-center text-gray-400">
          No hay pedidos activos. Los nuevos aparecerán aquí automáticamente.
        </p>
      ) : (
        <div className="space-y-4">
          {active.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              drivers={drivers}
              highlight={newIds.has(o.id)}
            />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            Pedidos cerrados de hoy ({closed.length})
          </summary>
          <div className="mt-3 space-y-4 opacity-80">
            {closed.map((o) => (
              <OrderCard key={o.id} order={o} drivers={drivers} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
