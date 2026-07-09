"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  HeartHandshake,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  esAdministrador: boolean;
}

const ITEMS: {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  soloAdmin?: boolean;
}[] = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/usuarios", etiqueta: "Usuarios", icono: Users, soloAdmin: true },
  { href: "/proyectos", etiqueta: "Proyectos", icono: FolderKanban },
  {
    href: "/contrapartes",
    etiqueta: "Beneficiarios y asociaciones",
    icono: HeartHandshake,
  },
  {
    href: "/formularios",
    etiqueta: "Formularios",
    icono: ClipboardList,
    soloAdmin: true,
  },
];

export function Sidebar({ esAdministrador }: SidebarProps) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.soloAdmin || esAdministrador);

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
        {items.map((item, index) => {
          const activo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <div key={item.href}>
              {index === 1 && (
                <div className="mb-2 mt-6 flex items-center gap-2 px-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Configuraciones
                  </span>
                  <div className="h-px flex-1 bg-ruralia-teal-border" />
                </div>
              )}
              <Link
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  activo
                    ? "bg-ruralia-teal text-white shadow-sm"
                    : "text-zinc-600 hover:bg-ruralia-teal-soft hover:text-ruralia-teal-text"
                }`}
              >
                <item.icono className="h-4 w-4 shrink-0" />
                {item.etiqueta}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
