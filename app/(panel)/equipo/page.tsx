import { redirect } from "next/navigation";

/** Compatibilidad: /equipo → /evaluaciones */
export default function PaginaEquipoRedirect() {
  redirect("/evaluaciones");
}
