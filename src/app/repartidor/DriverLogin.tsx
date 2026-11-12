"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/driver/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "PIN incorrecto.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-bold">Repartidor</h1>
      <p className="mb-6 text-sm text-gray-500">
        Ingresa tu PIN para ver tus entregas.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="input text-center text-2xl tracking-widest"
          inputMode="numeric"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <a href="/panel/login" className="mt-6 text-center text-sm text-brand">
        ¿Eres cocina o dueño? Ingresa aquí →
      </a>
    </main>
  );
}
