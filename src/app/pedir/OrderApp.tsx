"use client";

import { useMemo, useState } from "react";
import type { CartItem, Product } from "@/lib/types";
import type { MenuData } from "@/lib/menu-data";
import type { StoreOpenState } from "@/lib/hours";
import { formatCOP } from "@/lib/format";
import { cartSubtotal } from "@/lib/order-logic";
import ProductModal from "./ProductModal";
import Checkout from "./Checkout";

interface Props {
  menu: MenuData;
  openState: StoreOpenState;
}

type View = "menu" | "checkout" | "done";

export default function OrderApp({ menu, openState }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [view, setView] = useState<View>("menu");
  const [cartOpen, setCartOpen] = useState(false);
  const [result, setResult] = useState<{
    orderNumber: number;
    whatsappUrl: string;
  } | null>(null);

  const flavorNames = useMemo(
    () => menu.flavors.filter((f) => !f.sold_out).map((f) => f.name),
    [menu.flavors]
  );

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of menu.products) {
      const arr = map.get(p.category_id) ?? [];
      arr.push(p);
      map.set(p.category_id, arr);
    }
    return map;
  }, [menu.products]);

  const subtotal = cartSubtotal(cart);
  const itemCount = cart.reduce((n, it) => n + it.quantity, 0);

  function addToCart(item: CartItem) {
    setCart((c) => [...c, item]);
    setActiveProduct(null);
  }

  function removeFromCart(key: string) {
    setCart((c) => c.filter((it) => it.key !== key));
  }

  function priceLabel(p: Product): string {
    if (p.product_type === "pizza") {
      const prices = (p.sizes ?? []).map((s) => s.price);
      if (prices.length === 0) return "";
      return `desde ${formatCOP(Math.min(...prices))}`;
    }
    return formatCOP(p.price ?? 0);
  }

  // ---- Pantalla de confirmación ----
  if (view === "done" && result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="text-2xl font-bold">¡Pedido recibido!</h1>
        <p className="mt-2 text-gray-600">
          Tu número de pedido es
        </p>
        <p className="my-2 text-4xl font-extrabold text-brand">
          #{result.orderNumber}
        </p>
        <p className="mb-6 text-sm text-gray-600">
          La pizzería ya lo está viendo. Para confirmar más rápido, envíalo
          también por WhatsApp.
        </p>
        <a
          href={result.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full bg-[#25D366] hover:bg-[#1da851]"
        >
          Enviar por WhatsApp
        </a>
        <button
          onClick={() => {
            setCart([]);
            setResult(null);
            setView("menu");
          }}
          className="btn-ghost mt-3 w-full"
        >
          Hacer otro pedido
        </button>
      </main>
    );
  }

  // ---- Checkout ----
  if (view === "checkout") {
    return (
      <main className="min-h-screen bg-gray-50">
        <Checkout
          items={cart}
          zones={menu.zones}
          location={menu.location}
          onBack={() => setView("menu")}
          onPlaced={(r) => {
            setResult(r);
            setView("done");
          }}
        />
      </main>
    );
  }

  // ---- Menú ----
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 bg-brand text-white shadow">
        <div className="mx-auto max-w-md px-4 py-3">
          <h1 className="text-lg font-bold">Pizzería 90 grados</h1>
          <p className="text-xs opacity-90">
            {menu.location.name} · {menu.location.hours_text}
          </p>
        </div>
      </header>

      {!openState.isOpen && (
        <div className="mx-auto max-w-md px-4 pt-4">
          <div className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
            {openState.message}
          </div>
        </div>
      )}

      {/* Navegación por categorías */}
      <nav className="sticky top-[60px] z-10 overflow-x-auto border-b bg-white">
        <div className="mx-auto flex max-w-md gap-2 px-4 py-2">
          {menu.categories
            .filter((c) => (productsByCategory.get(c.id)?.length ?? 0) > 0)
            .map((c) => (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                className="chip whitespace-nowrap bg-gray-100 text-gray-700"
              >
                {c.name}
              </a>
            ))}
        </div>
      </nav>

      {/* Listado */}
      <div className="mx-auto max-w-md px-4">
        {menu.categories.map((cat) => {
          const prods = productsByCategory.get(cat.id) ?? [];
          if (prods.length === 0) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-28 py-4">
              <h2 className="mb-1 text-lg font-bold">{cat.name}</h2>
              {cat.note && (
                <p className="mb-2 text-xs text-gray-500">{cat.note}</p>
              )}
              <div className="space-y-3">
                {prods.map((p) => (
                  <button
                    key={p.id}
                    disabled={p.sold_out || !openState.isOpen}
                    onClick={() => setActiveProduct(p)}
                    className="card flex w-full items-center justify-between p-4 text-left disabled:opacity-50"
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        {p.sold_out && (
                          <span className="chip bg-gray-200 text-xs text-gray-600">
                            Agotado
                          </span>
                        )}
                        {p.is_alcohol && (
                          <span className="chip bg-amber-100 text-xs text-amber-800">
                            +18
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {p.description}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium text-brand">
                        {priceLabel(p)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand/10 px-3 py-2 text-sm font-semibold text-brand">
                      Agregar
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        <footer className="py-8 text-center text-xs text-gray-400">
          <a href="/privacidad" className="underline">
            Política de privacidad (Habeas Data)
          </a>
          <p className="mt-2">
            Tel: {menu.location.phone} · WhatsApp: {menu.location.whatsapp}
          </p>
        </footer>
      </div>

      {/* Barra inferior del carrito */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white p-3">
          <div className="mx-auto max-w-md">
            <button
              onClick={() => setCartOpen(true)}
              className="btn-primary flex w-full items-center justify-between"
            >
              <span>
                Ver carrito ({itemCount}{" "}
                {itemCount === 1 ? "producto" : "productos"})
              </span>
              <span>{formatCOP(subtotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de producto */}
      {activeProduct && (
        <ProductModal
          product={activeProduct}
          flavors={flavorNames}
          onClose={() => setActiveProduct(null)}
          onAdd={addToCart}
        />
      )}

      {/* Drawer del carrito */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/40"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Tu carrito</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <ul className="divide-y">
              {cart.map((it) => (
                <li key={it.key} className="flex items-start justify-between py-3">
                  <div className="pr-3">
                    <p className="font-medium">
                      {it.quantity}x {it.name}
                      {it.sizeName ? ` (${it.sizeName})` : ""}
                    </p>
                    {it.flavors.length > 0 && (
                      <p className="text-sm text-gray-500">
                        {it.flavors.join(", ")}
                      </p>
                    )}
                    {it.drinkChoice && (
                      <p className="text-sm text-gray-500">{it.drinkChoice}</p>
                    )}
                    <p className="text-sm font-medium">
                      {formatCOP(it.unitPrice * it.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(it.key)}
                    className="text-sm text-red-600"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <span>Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              El domicilio se calcula en el siguiente paso según el pueblo.
            </p>
            <button
              disabled={!openState.isOpen}
              onClick={() => {
                setCartOpen(false);
                setView("checkout");
              }}
              className="btn-primary mt-4 w-full"
            >
              {openState.isOpen ? "Continuar" : "Cerrado por ahora"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
