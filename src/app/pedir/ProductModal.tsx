"use client";

import { useMemo, useState } from "react";
import type { CartItem, Product, ProductSize } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { validateCartLine } from "@/lib/order-logic";

interface Props {
  product: Product;
  flavors: string[]; // nombres de sabores disponibles (solo pizzas)
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `ci_${Date.now()}_${keyCounter}`;
}

export default function ProductModal({ product, flavors, onClose, onAdd }: Props) {
  const isPizza = product.product_type === "pizza";
  const needsDrink =
    (product.product_type === "combo" ||
      product.product_type === "drink_choice") &&
    product.requires_drink_choice;

  const sizes = useMemo(
    () => (product.sizes ?? []).filter((s) => !s.sold_out),
    [product.sizes]
  );

  const [sizeSlug, setSizeSlug] = useState<string | undefined>(
    isPizza ? sizes[0]?.slug : undefined
  );
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [drinkChoice, setDrinkChoice] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string>("");

  const currentSize: ProductSize | undefined = sizes.find(
    (s) => s.slug === sizeSlug
  );

  const maxFlavors = currentSize?.max_flavors ?? 1;
  const unitPrice = isPizza ? currentSize?.price ?? 0 : product.price ?? 0;

  function toggleFlavor(name: string) {
    setError("");
    setSelectedFlavors((prev) => {
      if (prev.includes(name)) {
        return prev.filter((f) => f !== name);
      }
      if (prev.length >= maxFlavors) {
        setError(
          `Este tamaño permite máximo ${maxFlavors} ${
            maxFlavors === 1 ? "sabor" : "sabores"
          }.`
        );
        return prev;
      }
      return [...prev, name];
    });
  }

  function handleSizeChange(slug: string) {
    setSizeSlug(slug);
    const newSize = sizes.find((s) => s.slug === slug);
    const limit = newSize?.max_flavors ?? 1;
    // Recortar sabores si el nuevo tamaño permite menos.
    setSelectedFlavors((prev) => prev.slice(0, limit));
    setError("");
  }

  function handleAdd() {
    const check = validateCartLine(product, {
      size: currentSize,
      flavors: selectedFlavors,
      drinkChoice,
    });
    if (!check.ok) {
      setError(check.error || "Revisa las opciones.");
      return;
    }
    const item: CartItem = {
      key: nextKey(),
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      sizeSlug: currentSize?.slug,
      sizeName: currentSize?.name,
      flavors: selectedFlavors,
      drinkChoice,
      quantity,
      unitPrice,
      isAlcohol: product.is_alcohol,
    };
    onAdd(item);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{product.name}</h2>
            {product.description && (
              <p className="mt-1 text-sm text-gray-600">{product.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Tamaños (pizza) */}
        {isPizza && (
          <div className="mb-4">
            <p className="label">Elige el tamaño</p>
            <div className="space-y-2">
              {sizes.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                    sizeSlug === s.slug
                      ? "border-brand bg-brand/5"
                      : "border-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="size"
                      checked={sizeSlug === s.slug}
                      onChange={() => handleSizeChange(s.slug)}
                      className="accent-brand"
                    />
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-xs text-gray-500">
                        {s.portions
                          ? `${s.portions} ${
                              s.portions === 1 ? "porción" : "porciones"
                            } · `
                          : ""}
                        hasta {s.max_flavors}{" "}
                        {s.max_flavors === 1 ? "sabor" : "sabores"}
                      </span>
                    </span>
                  </span>
                  <span className="font-semibold">{formatCOP(s.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Sabores (pizza) */}
        {isPizza && (
          <div className="mb-4">
            <p className="label">
              Sabores{" "}
              <span className="font-normal text-gray-500">
                ({selectedFlavors.length}/{maxFlavors}
                {maxFlavors > 1 ? " · mismo precio" : ""})
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {flavors.map((f) => {
                const selected = selectedFlavors.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFlavor(f)}
                    className={`chip border ${
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Elección de gaseosa (combos y gaseosas) */}
        {needsDrink && (
          <div className="mb-4">
            <p className="label">Elige tu gaseosa</p>
            <div className="space-y-2">
              {product.drink_options.map((d) => (
                <label
                  key={d}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${
                    drinkChoice === d ? "border-brand bg-brand/5" : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="drink"
                    checked={drinkChoice === d}
                    onChange={() => {
                      setDrinkChoice(d);
                      setError("");
                    }}
                    className="accent-brand"
                  />
                  <span className="font-medium">{d}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Cantidad */}
        <div className="mb-4 flex items-center gap-3">
          <p className="label mb-0">Cantidad</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-10 w-10 rounded-full border border-gray-300 text-xl"
              aria-label="Menos"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-10 w-10 rounded-full border border-gray-300 text-xl"
              aria-label="Más"
            >
              +
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button onClick={handleAdd} className="btn-primary w-full">
          Agregar · {formatCOP(unitPrice * quantity)}
        </button>
      </div>
    </div>
  );
}
