"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";

export function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { cargando, usuario, token, cerrarSesion } = useAuth();

  useEffect(() => {
    if (!cargando && (!usuario || !token)) {
      router.replace("/");
    }
  }, [cargando, usuario, token, router]);

  if (cargando || !usuario || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  const esAdministrador = usuario.roles.some(
    (rol) => rol.nombre === "ADMINISTRADOR",
  );
  const roles = usuario.roles.map((rol) => rol.nombre).join(", ");

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <Sidebar esAdministrador={esAdministrador} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-emerald-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <p className="font-semibold text-zinc-900">Ruralia</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-zinc-900">
                  {usuario.nombreCompleto}
                </p>
                <p className="text-xs text-zinc-500">{roles}</p>
              </div>
              <button
                type="button"
                onClick={() => void cerrarSesion()}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
