"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermisos } from "@/lib/use-permisos";

export default function PaginaConfiguracion() {
  const router = useRouter();
  const { puede } = usePermisos();

  useEffect(() => {
    if (puede("configuracion.editar_dashboard")) {
      router.replace("/configuracion/dashboard");
    } else if (puede("configuracion.gestionar_plantillas")) {
      router.replace("/configuracion/plantillas");
    } else {
      router.replace("/dashboard");
    }
  }, [puede, router]);

  return null;
}
