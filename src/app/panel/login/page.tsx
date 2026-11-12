"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/panel";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-bold">Panel de la pizzería</h1>
      <p className="mb-6 text-sm text-gray-500">
        Ingreso para cocina y dueño.
      </p>
      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <label className="label">Correo</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <a href="/repartidor" className="mt-6 text-center text-sm text-brand">
        ¿Eres repartidor? Ingresa aquí →
      </a>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
