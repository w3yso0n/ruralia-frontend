import type { Usuario } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function obtenerUsuarioActual(
  token: string,
): Promise<Usuario> {
  const respuesta = await fetch(`${API_URL}/autenticacion/yo`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new Error(
      `Backend respondió ${respuesta.status}: ${cuerpo || respuesta.statusText}`,
    );
  }

  return respuesta.json() as Promise<Usuario>;
}
