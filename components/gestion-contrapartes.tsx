"use client";

import { useState } from "react";
import { GestionAsociaciones } from "@/components/gestion-asociaciones";
import { GestionBeneficiarios } from "@/components/gestion-beneficiarios";
import { useAuth } from "@/lib/auth-context";

type Tab = "beneficiarios" | "asociaciones";

export function GestionContrapartes() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>("beneficiarios");

  const puedeGestionar = !!usuario?.roles.some((rol) =>
    ["ADMINISTRADOR", "COORDINADOR"].includes(rol.nombre),
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Beneficiarios y asociaciones
        </h2>
        <p className="mt-1 text-zinc-600">
          Catálogo de contrapartes para vincular a los proyectos
        </p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab("beneficiarios")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "beneficiarios"
              ? "border-ruralia-teal text-ruralia-teal-text"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Beneficiarios
        </button>
        <button
          type="button"
          onClick={() => setTab("asociaciones")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "asociaciones"
              ? "border-ruralia-teal text-ruralia-teal-text"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Asociaciones
        </button>
      </div>

      {tab === "beneficiarios" ? (
        <GestionBeneficiarios puedeGestionar={puedeGestionar} />
      ) : (
        <GestionAsociaciones puedeGestionar={puedeGestionar} />
      )}
    </>
  );
}
