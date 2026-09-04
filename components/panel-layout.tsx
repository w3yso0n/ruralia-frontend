"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";

export function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { cargando, usuario, token, cerrarSesion } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!cargando && (!usuario || !token)) {
      router.replace("/");
    }
  }, [cargando, usuario, token, router]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("keydown", onTecla);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onTecla);
    };
  }, [menuAbierto]);

  if (cargando || !usuario || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ruralia-teal-border border-t-ruralia-teal" />
      </div>
    );
  }

  const roles = usuario.roles.map((rol) => rol.nombre).join(", ");

  return (
    <div className="flex h-dvh min-h-0 bg-background">
      <Sidebar
        abiertoMovil={menuAbierto}
        onCerrarMovil={() => setMenuAbierto(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-ruralia-teal-border bg-ruralia-surface px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMenuAbierto(true)}
                aria-label="Abrir menú"
                className="rounded-lg p-1.5 text-zinc-700 transition hover:bg-zinc-100"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Image
                src="/icono-fondo-blanco.png"
                alt="Ruralia"
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 bg-transparent object-contain"
              />
              <p className="truncate font-semibold text-zinc-900">Ruralia</p>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {usuario.nombreCompleto}
                </p>
                <p className="truncate text-xs text-zinc-500">{roles}</p>
              </div>
              <button
                type="button"
                onClick={() => void cerrarSesion()}
                className="shrink-0 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:px-4"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
