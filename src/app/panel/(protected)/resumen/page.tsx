import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_ID } from "@/lib/config";
import { getCurrentStaff } from "@/lib/staff";
import { formatCOP } from "@/lib/format";
import { currentBogotaHour } from "@/lib/hours";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

// Calcula el inicio del día (hora Bogotá) en UTC, hace `daysAgo` días.
function bogotaDayStartUTC(daysAgo: number): Date {
  const now = new Date();
  // Hora actual en Bogotá
  const bogotaMs = now.getTime() - 5 * 3600 * 1000;
  const b = new Date(bogotaMs);
  // Medianoche Bogotá del día objetivo, expresada en UTC (+5h)
  const midnightBogotaUTC = Date.UTC(
    b.getUTCFullYear(),
    b.getUTCMonth(),
    b.getUTCDate() - daysAgo,
    5, // 00:00 Bogotá = 05:00 UTC
    0,
    0
  );
  return new Date(midnightBogotaUTC);
}

interface Totals {
  count: number;
  sales: number;
  delivery: number;
  efectivo: number;
  transferencia: number;
}

function summarize(orders: Order[]): Totals {
  const t: Totals = {
    count: 0,
    sales: 0,
    delivery: 0,
    efectivo: 0,
    transferencia: 0,
  };
  for (const o of orders) {
    if (o.status === "cancelado") continue;
    t.count += 1;
    t.sales += o.total;
    t.delivery += o.delivery_fee;
    if (o.payment_method === "efectivo") t.efectivo += o.total;
    else t.transferencia += o.total;
  }
  return t;
}

export default async function ResumenPage() {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "owner") redirect("/panel");

  const supabase = await createClient();

  const todayStart = bogotaDayStartUTC(0);
  const weekStart = bogotaDayStartUTC(6); // últimos 7 días incluyendo hoy

  const { data: weekOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("location_id", LOCATION_ID)
    .gte("created_at", weekStart.toISOString())
    .order("created_at", { ascending: false });

  const orders = (weekOrders ?? []) as Order[];
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at) >= todayStart
  );

  const today = summarize(todayOrders);
  const week = summarize(orders);

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-bold">Resumen diario</h1>
      <p className="mb-4 text-sm text-gray-500">
        Hora Bogotá actual aprox.: {String(currentBogotaHour()).padStart(2, "0")}
        :00 · No incluye pedidos cancelados.
      </p>

      <SummaryCard title="Hoy" t={today} />
      <div className="h-4" />
      <SummaryCard title="Últimos 7 días" t={week} />

      <section className="card mt-6 p-4">
        <h2 className="mb-2 font-bold">Pedidos recientes (7 días)</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay pedidos.</p>
        ) : (
          <div className="divide-y text-sm">
            {orders.slice(0, 40).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2">
                <span>
                  #{o.order_number} · {o.customer_name} · {o.town}
                </span>
                <span className="text-right">
                  <span
                    className={
                      o.status === "cancelado"
                        ? "text-gray-400 line-through"
                        : "font-medium"
                    }
                  >
                    {formatCOP(o.total)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, t }: { title: string; t: Totals }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Pedidos" value={String(t.count)} />
        <Stat label="Ventas totales" value={formatCOP(t.sales)} />
        <Stat label="Domicilios cobrados" value={formatCOP(t.delivery)} />
        <Stat
          label="Venta sin domicilio"
          value={formatCOP(t.sales - t.delivery)}
        />
      </div>
      <div className="mt-3 border-t pt-3">
        <p className="mb-1 text-sm font-medium text-gray-600">Por método de pago</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Efectivo" value={formatCOP(t.efectivo)} />
          <Stat label="Nequi/Daviplata" value={formatCOP(t.transferencia)} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
