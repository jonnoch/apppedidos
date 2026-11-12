import { redirect } from "next/navigation";

// La raíz redirige a la página pública de la sede piloto.
export default function Home() {
  redirect("/pedir");
}
