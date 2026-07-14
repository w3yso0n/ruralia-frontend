"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  FolderKanban,
  HeartHandshake,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";
import { usePermisos } from "@/lib/use-permisos";

const ITEMS: {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  permiso?: string;
  puedeAlgunoDe?: string[];
}[] = [
  {
    href: "/dashboard",
    etiqueta: "Dashboard",
    icono: LayoutDashboard,
    permiso: "dashboard.ver",
  },
  {
    href: "/usuarios",
    etiqueta: "Usuarios",
    icono: Users,
    permiso: "usuarios.ver",
  },
  {
    href: "/roles",
    etiqueta: "Roles y permisos",
    icono: Shield,
    permiso: "roles.ver",
  },
  {
    href: "/proyectos",
    etiqueta: "Proyectos",
    icono: FolderKanban,
    permiso: "proyectos.ver",
  },
  {
    href: "/contrapartes",
    etiqueta: "Beneficiarios y asociaciones",
    icono: HeartHandshake,
    permiso: "contrapartes.ver",
  },
  {
    href: "/formularios",
    etiqueta: "Formularios",
    icono: ClipboardList,
    permiso: "formularios.ver",
  },
];

function itemPermitido(
  item: (typeof ITEMS)[number],
  puede: (...c: string[]) => boolean,
  puedeAlguno: (...c: string[]) => boolean,
): boolean {
  if (item.href === "/dashboard") {
    return puede("dashboard.ver") || puede("proyectos.ver");
  }
  if (item.puedeAlgunoDe?.length) {
    return puedeAlguno(...item.puedeAlgunoDe);
  }
  if (!item.permiso) return true;
  return puede(item.permiso);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { puede, puedeAlguno } = usePermisos();

  const items = ITEMS.filter((item) => itemPermitido(item, puede, puedeAlguno));

  useEffect(() => {
    const itemActual = ITEMS.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (!itemActual) return;
    if (!itemPermitido(itemActual, puede, puedeAlguno)) {
      router.replace("/dashboard");
    }
  }, [pathname, puede, puedeAlguno, router]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ruralia-teal-border bg-white">
      <div className="flex items-center gap-3 border-b border-ruralia-teal-border px-5 py-5">
        <Image
          src="/icono-fondo-blanco.png"
          alt="Ruralia"
          width={40}
          height={40}
          unoptimized
          className="h-10 w-10 shrink-0 rounded-xl bg-transparent object-contain"
          priority
        />
        <div>
          <p className="font-semibold text-zinc-900">Ruralia</p>
          <p className="text-xs text-zinc-500">Panel de gestión</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const activo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const mostrarSeparador = item.href === "/usuarios";
          return (
            <div key={item.href}>
              {mostrarSeparador ? (
                <div className="mb-2 mt-6 flex items-center gap-2 px-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Configuraciones
                  </span>
                  <div className="h-px flex-1 bg-ruralia-teal-border" />
                </div>
              ) : null}
              <Link
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  activo
                    ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <item.icono className="h-5 w-5 shrink-0" />
                {item.etiqueta}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
