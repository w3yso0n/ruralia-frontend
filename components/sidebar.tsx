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
  MapPinned,
  Waypoints,
  Inbox,
  ChartColumn,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { obtenerContadoresAprobacion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";

type ItemNav = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  permiso?: string;
  puedeAlgunoDe?: string[];
  badgeKey?: "revision";
};

type SeccionNav = {
  id: string;
  titulo: string;
  items: ItemNav[];
};

const SECCIONES: SeccionNav[] = [
  {
    id: "inicio",
    titulo: "Inicio",
    items: [
      {
        href: "/dashboard",
        etiqueta: "Dashboard",
        icono: LayoutDashboard,
        permiso: "dashboard.ver",
      },
    ],
  },
  {
    id: "operacion",
    titulo: "Operación",
    items: [
      {
        href: "/revision",
        etiqueta: "Revisión",
        icono: Inbox,
        puedeAlgunoDe: [
          "jornadas.ver",
          "jornadas.aprobar",
          "jornadas.enviar_revision",
        ],
        badgeKey: "revision",
      },
      {
        href: "/seguimiento",
        etiqueta: "Seguimiento",
        icono: Waypoints,
        puedeAlgunoDe: ["proyectos.ver", "jornadas.ver"],
      },
      {
        href: "/evaluaciones",
        etiqueta: "Evaluaciones",
        icono: ChartColumn,
        permiso: "evaluaciones.ver",
      },
    ],
  },
  {
    id: "gestion",
    titulo: "Gestión",
    items: [
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
        href: "/territorios",
        etiqueta: "Territorios",
        icono: MapPinned,
        permiso: "territorios.ver",
      },
      {
        href: "/formularios",
        etiqueta: "Formularios",
        icono: ClipboardList,
        permiso: "formularios.ver",
      },
    ],
  },
  {
    id: "administracion",
    titulo: "Administración",
    items: [
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
        href: "/configuracion",
        etiqueta: "Configuración",
        icono: Settings,
        puedeAlgunoDe: [
          "configuracion.editar_dashboard",
          "configuracion.gestionar_plantillas",
        ],
      },
    ],
  },
];

const ITEMS = SECCIONES.flatMap((seccion) => seccion.items);

function itemPermitido(
  item: ItemNav,
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

export function Sidebar({
  abiertoMovil = false,
  onCerrarMovil,
}: {
  abiertoMovil?: boolean;
  onCerrarMovil?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const { puede, puedeAlguno } = usePermisos();
  const [badgeRevision, setBadgeRevision] = useState(0);

  const secciones = SECCIONES.map((seccion) => ({
    ...seccion,
    items: seccion.items.filter((item) =>
      itemPermitido(item, puede, puedeAlguno),
    ),
  })).filter((seccion) => seccion.items.length > 0);

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

  useEffect(() => {
    if (!token || !puede("jornadas.ver")) return;
    let vivo = true;
    const cargar = async () => {
      try {
        const c = await obtenerContadoresAprobacion(token);
        if (!vivo) return;
        const n =
          (puede("jornadas.aprobar")
            ? c.pendientesRevision
            : c.rechazadas + c.enCorreccion) || 0;
        setBadgeRevision(n);
      } catch {
        if (vivo) setBadgeRevision(0);
      }
    };
    void cargar();
    const id = window.setInterval(() => void cargar(), 60_000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [token, puede]);

  const renderEncabezado = (mostrarCerrar: boolean) => (
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
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-900">Ruralia</p>
        <p className="text-xs text-zinc-500">Panel de gestión</p>
      </div>
      {mostrarCerrar ? (
        <button
          type="button"
          onClick={onCerrarMovil}
          aria-label="Cerrar menú"
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );

  const renderNavegacion = () => (
    <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
      {secciones.map((seccion, indice) => (
        <div
          key={seccion.id}
          className={indice > 0 ? "mt-4" : ""}
        >
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-zinc-400">
            {seccion.titulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {seccion.items.map((item) => {
              const activo =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icono;
              const badge =
                item.badgeKey === "revision" && badgeRevision > 0
                  ? badgeRevision
                  : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCerrarMovil}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    activo
                      ? "bg-ruralia-teal text-white"
                      : "text-zinc-700 hover:bg-ruralia-teal-soft"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.etiqueta}</span>
                  {badge > 0 && (
                    <span
                      className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                        activo
                          ? "bg-white/20 text-white"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ruralia-teal-border bg-white lg:flex">
        {renderEncabezado(false)}
        {renderNavegacion()}
      </aside>

      {abiertoMovil ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-zinc-900/40"
            onClick={onCerrarMovil}
          />
          <aside className="relative z-10 flex h-full w-[min(18rem,85vw)] flex-col bg-white shadow-2xl">
            {renderEncabezado(true)}
            {renderNavegacion()}
          </aside>
        </div>
      ) : null}
    </>
  );
}
