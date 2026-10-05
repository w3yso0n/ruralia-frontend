"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { nivelAccesoDeRoles } from "@/lib/types";

export function usePermisos() {
  const { usuario } = useAuth();
  const permisos = useMemo(
    () => new Set(usuario?.permisos ?? []),
    [usuario?.permisos],
  );

  const puede = useCallback(
    (...claves: string[]) => {
      if (!claves.length) return true;
      return claves.every((clave) => permisos.has(clave));
    },
    [permisos],
  );

  const puedeAlguno = useCallback(
    (...claves: string[]) => {
      if (!claves.length) return false;
      return claves.some((clave) => permisos.has(clave));
    },
    [permisos],
  );

  /** Técnico: solo consulta sus proyectos y opera sus propias jornadas. */
  const roles = usuario?.roles;
  const soloJornadasAsignadas = useMemo(
    () =>
      !!roles?.length && nivelAccesoDeRoles(roles) === "JORNADAS_ASIGNADAS",
    [roles],
  );

  return { permisos, puede, puedeAlguno, soloJornadasAsignadas };
}
