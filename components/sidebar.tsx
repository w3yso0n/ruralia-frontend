"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  esAdministrador: boolean;
}

const ITEMS: {
  href: string;
  etiqueta: string;
  icono: string;
  soloAdmin?: boolean;
}[] = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: "◫" },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "◎", soloAdmin: true },
  { href: "/proyectos", etiqueta: "Proyectos", icono: "◈" },
  { href: "/contrapartes", etiqueta: "Beneficiarios y asociaciones", icono: "◉" },
];

export function Sidebar({ esAdministrador }: SidebarProps) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.soloAdmin || esAdministrador);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-emerald-100 bg-white">
      <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
          R
        </div>
        <div>
          <p className="font-semibold text-zinc-900">Ruralia</p>
          <p className="text-xs text-zinc-500">Panel de gestión</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const activo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activo
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              <span className="text-base leading-none">{item.icono}</span>
              {item.etiqueta}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
