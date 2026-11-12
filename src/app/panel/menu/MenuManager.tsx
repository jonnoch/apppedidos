"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MenuData } from "@/lib/menu-data";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import {
  addFlavor,
  addZone,
  createSimpleProduct,
  deleteFlavor,
  deleteProduct,
  deleteZone,
  setFlavorSoldOut,
  setOrdersPaused,
  setProductSoldOut,
  updateProductPrice,
  updateSizePrice,
  updateZone,
} from "./actions";

export default function MenuManager({ menu }: { menu: MenuData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error || "Error");
      else setMsg("");
      router.refresh();
    });
  }

  const productsByCat = new Map<string, Product[]>();
  for (const p of menu.products) {
    const arr = productsByCat.get(p.category_id) ?? [];
    arr.push(p);
    productsByCat.set(p.category_id, arr);
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Gestión del menú</h1>
      {msg && (
        <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {msg}
        </p>
      )}

      {/* Pausar pedidos */}
      <div className="card mb-6 flex items-center justify-between p-4">
        <div>
          <p className="font-semibold">Recibir pedidos</p>
          <p className="text-sm text-gray-500">
            {menu.location.orders_paused
              ? "Pedidos PAUSADOS. Los clientes no pueden ordenar."
              : "Activo. Los clientes pueden ordenar (dentro del horario)."}
          </p>
        </div>
        <button
          onClick={() => run(() => setOrdersPaused(!menu.location.orders_paused))}
          disabled={isPending}
          className={
            menu.location.orders_paused ? "btn-primary py-2" : "btn-secondary py-2"
          }
        >
          {menu.location.orders_paused ? "Reanudar" : "Pausar"}
        </button>
      </div>

      {/* Zonas de domicilio */}
      <section className="card mb-6 p-4">
        <h2 className="mb-2 font-bold">Pueblos y domicilio</h2>
        <div className="space-y-2">
          {menu.zones.map((z) => (
            <ZoneRow key={z.id} zone={z} onSave={run} onDelete={run} pending={isPending} />
          ))}
        </div>
        <form
          action={(fd) => run(() => addZone(fd))}
          className="mt-3 grid grid-cols-[1fr_70px_90px_auto] gap-2"
        >
          <input name="name" placeholder="Pueblo" className="input py-2" />
          <input name="km" placeholder="km" inputMode="decimal" className="input py-2" />
          <input name="fee" placeholder="$ fee" inputMode="numeric" className="input py-2" />
          <button className="btn-secondary px-3 py-2 text-sm" disabled={isPending}>
            Agregar
          </button>
        </form>
      </section>

      {/* Sabores de pizza */}
      <section className="card mb-6 p-4">
        <h2 className="mb-2 font-bold">Sabores de pizza</h2>
        <div className="flex flex-wrap gap-2">
          {menu.flavors.map((f) => (
            <div
              key={f.id}
              className={`chip border ${
                f.sold_out
                  ? "border-gray-300 bg-gray-100 text-gray-400 line-through"
                  : "border-gray-300 bg-white"
              }`}
            >
              {f.name}
              <button
                onClick={() => run(() => setFlavorSoldOut(f.id, !f.sold_out))}
                className="ml-2 text-xs text-amber-700"
                title="Agotar / reactivar"
              >
                {f.sold_out ? "Reactivar" : "Agotar"}
              </button>
              <button
                onClick={() => run(() => deleteFlavor(f.id))}
                className="ml-1 text-xs text-red-600"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <AddFlavor onAdd={(name) => run(() => addFlavor(name))} pending={isPending} />
      </section>

      {/* Productos por categoría */}
      {menu.categories.map((cat) => {
        const prods = productsByCat.get(cat.id) ?? [];
        if (prods.length === 0) return null;
        return (
          <section key={cat.id} className="card mb-6 p-4">
            <h2 className="mb-3 font-bold">{cat.name}</h2>
            <div className="space-y-3">
              {prods.map((p) => (
                <ProductRow key={p.id} product={p} onRun={run} pending={isPending} />
              ))}
            </div>
            {cat.id !== "pizzas" && (
              <AddProduct
                categoryId={cat.id}
                onAdd={(fd) => run(() => createSimpleProduct(fd))}
                pending={isPending}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

function ProductRow({
  product,
  onRun,
  pending,
}: {
  product: Product;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const isPizza = product.product_type === "pizza";
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">
            {product.name}
            {product.is_alcohol && (
              <span className="chip ml-1 bg-amber-100 text-xs text-amber-800">
                +18
              </span>
            )}
            {product.sold_out && (
              <span className="chip ml-1 bg-gray-200 text-xs text-gray-600">
                Agotado
              </span>
            )}
          </p>
          {product.description && (
            <p className="text-xs text-gray-500">{product.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRun(() => setProductSoldOut(product.id, !product.sold_out))}
            disabled={pending}
            className="text-xs text-amber-700"
          >
            {product.sold_out ? "Reactivar" : "Agotar"}
          </button>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar "${product.name}"?`))
                onRun(() => deleteProduct(product.id));
            }}
            disabled={pending}
            className="text-xs text-red-600"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Precio simple */}
      {!isPizza && (
        <PriceEditor
          label="Precio"
          value={product.price ?? 0}
          onSave={(v) => onRun(() => updateProductPrice(product.id, v))}
          pending={pending}
        />
      )}

      {/* Tamaños de pizza */}
      {isPizza && (
        <div className="mt-2 space-y-1">
          {product.sizes?.map((s) => (
            <PriceEditor
              key={s.id}
              label={s.name}
              value={s.price}
              onSave={(v) => onRun(() => updateSizePrice(s.id, v))}
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PriceEditor({
  label,
  value,
  onSave,
  pending,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
  pending: boolean;
}) {
  const [price, setPrice] = useState(String(value));
  const dirty = Number(price) !== value;
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span className="min-w-28 text-gray-600">{label}</span>
      <input
        className="input w-28 py-1.5"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <span className="text-xs text-gray-400">{formatCOP(Number(price) || 0)}</span>
      {dirty && (
        <button
          onClick={() => onSave(Number(price))}
          disabled={pending}
          className="btn-primary px-3 py-1 text-xs"
        >
          Guardar
        </button>
      )}
    </div>
  );
}

function ZoneRow({
  zone,
  onSave,
  onDelete,
  pending,
}: {
  zone: { id: string; name: string; km: number; delivery_fee: number; is_home_town: boolean };
  onSave: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  onDelete: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const [km, setKm] = useState(String(zone.km));
  const [fee, setFee] = useState(String(zone.delivery_fee));
  const dirty = Number(km) !== zone.km || Number(fee) !== zone.delivery_fee;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="min-w-24 font-medium">{zone.name}</span>
      <input
        className="input w-16 py-1.5"
        inputMode="decimal"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        title="km"
      />
      <input
        className="input w-24 py-1.5"
        inputMode="numeric"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        title="tarifa"
      />
      <span className="text-xs text-gray-400">{formatCOP(Number(fee) || 0)}</span>
      {dirty && (
        <button
          onClick={() => onSave(() => updateZone(zone.id, Number(km), Number(fee)))}
          disabled={pending}
          className="btn-primary px-2 py-1 text-xs"
        >
          Guardar
        </button>
      )}
      {!zone.is_home_town && (
        <button
          onClick={() => {
            if (confirm(`¿Eliminar "${zone.name}"?`))
              onDelete(() => deleteZone(zone.id));
          }}
          disabled={pending}
          className="text-xs text-red-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function AddFlavor({
  onAdd,
  pending,
}: {
  onAdd: (name: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="input py-2"
        placeholder="Nuevo sabor"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        onClick={() => {
          if (name.trim()) {
            onAdd(name.trim());
            setName("");
          }
        }}
        disabled={pending}
        className="btn-secondary px-3 py-2 text-sm"
      >
        Agregar
      </button>
    </div>
  );
}

function AddProduct({
  categoryId,
  onAdd,
  pending,
}: {
  categoryId: string;
  onAdd: (fd: FormData) => void;
  pending: boolean;
}) {
  return (
    <form
      action={(fd) => {
        onAdd(fd);
      }}
      className="mt-3 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-[1fr_1fr_110px_auto]"
    >
      <input type="hidden" name="category_id" value={categoryId} />
      <input name="name" placeholder="Nuevo producto" className="input py-2" />
      <input name="description" placeholder="Descripción (opcional)" className="input py-2" />
      <input name="price" placeholder="Precio" inputMode="numeric" className="input py-2" />
      <button className="btn-secondary px-3 py-2 text-sm" disabled={pending}>
        Agregar
      </button>
    </form>
  );
}
