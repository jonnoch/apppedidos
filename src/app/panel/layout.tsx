import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/staff";
import PanelNav from "./PanelNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();

  // El middleware ya protege /panel, pero reforzamos: debe ser staff de la sede.
  if (!staff) {
    redirect("/panel/login");
  }

  // Cocina y dueño usan el panel. Los repartidores tienen su propia pantalla.
  const isOwner = staff.role === "owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <PanelNav staffName={staff.name} isOwner={isOwner} />
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  );
}
