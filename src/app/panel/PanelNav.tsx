"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PanelNav({
  staffName,
  isOwner,
}: {
  staffName: string;
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/panel/login");
    router.refresh();
  }

  const links: { href: string; label: string; ownerOnly?: boolean }[] = [
    { href: "/panel", label: "Pedidos" },
    { href: "/panel/menu", label: "Menú", ownerOnly: true },
    { href: "/panel/resumen", label: "Resumen", ownerOnly: true },
  ];

  return (
    <header className="sticky top-0 z-30 bg-charcoal text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <span className="font-bold">90 grados · Panel</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden opacity-70 sm:inline">{staffName}</span>
          <button onClick={signOut} className="underline opacity-90">
            Salir
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 px-2 pb-2">
        {links
          .filter((l) => !l.ownerOnly || isOwner)
          .map((l) => {
            const active =
              l.href === "/panel"
                ? pathname === "/panel"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-white text-charcoal" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
      </nav>
    </header>
  );
}
