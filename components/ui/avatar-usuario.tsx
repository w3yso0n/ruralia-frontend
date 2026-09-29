"use client";

import { useState } from "react";
import { urlPublicaArchivo } from "@/lib/api";

const TAMANOS = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-24 w-24 text-2xl",
} as const;

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return `${primera}${ultima}`.toUpperCase();
}

/** Círculo con la foto del usuario; si no hay foto (o falla la carga) muestra sus iniciales. */
export function AvatarUsuario({
  nombre,
  urlFoto,
  tamano = "sm",
  className = "",
}: {
  nombre: string;
  urlFoto?: string | null;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const mostrarFoto = Boolean(urlFoto) && urlFallida !== urlFoto;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft font-semibold text-ruralia-teal-text ${TAMANOS[tamano]} ${className}`}
    >
      {mostrarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlPublicaArchivo(urlFoto as string)}
          alt={nombre}
          referrerPolicy="no-referrer"
          onError={() => setUrlFallida(urlFoto ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{iniciales(nombre)}</span>
      )}
    </span>
  );
}
