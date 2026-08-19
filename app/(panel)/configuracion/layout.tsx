"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePermisos } from "@/lib/use-permisos";

const TABS: { href: string; etiqueta: string; permiso: string }[] = [
  {
    href: "/configuracion/dashboard",
    etiqueta: "Mi dashboard",
    permiso: "configuracion.editar_dashboard",
  },
  {
    href: "/configuracion/plantillas",
    etiqueta: "Plantillas de dashboard",
    permiso: "configuracion.gestionar_plantillas",
  },
];

export default function LayoutConfiguracion({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { puede } = usePermisos();
  const tabs = TABS.filter((t) => puede(t.permiso));

  useEffect(() => {
    if (pathname === "/configuracion") return; // la propia page.tsx resuelve el redirect inicial
    const tabActual = TABS.find((t) => pathname.startsWith(t.href));
    if (tabActual && !puede(tabActual.permiso)) {
      router.replace("/dashboard");
    }
  }, [pathname, puede, router]);

  return (
    <div>
      {tabs.length > 1 ? (
        <div className="mb-8 flex gap-6 border-b border-ruralia-teal-border">
          {tabs.map((tab) => {
            const activo = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
                  activo
                    ? "border-ruralia-teal text-ruralia-teal-text"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab.etiqueta}
              </Link>
            );
          })}
        </div>
      ) : null}
      {children}
    </div>
  );
}
