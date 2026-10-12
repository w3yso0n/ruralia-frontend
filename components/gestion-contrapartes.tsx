"use client";

import { useState } from "react";
import { GestionAsociaciones } from "@/components/gestion-asociaciones";
import { GestionBeneficiarios } from "@/components/gestion-beneficiarios";
import { useAuth } from "@/lib/auth-context";

type Tab = "beneficiarios" | "asociaciones" | "oam";

export function GestionContrapartes() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>("beneficiarios");

  const puedeGestionar = !!usuario && (usuario.permisos ?? []).includes("contrapartes.editar");


  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Beneficiarios, asociaciones y OAM
        </h2>
        <p className="mt-1 text-zinc-600">
          Catálogo general. Una OAM agrupa asociaciones y se asigna a un
          proyecto o a una jornada igual que una asociación.
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
        <button
          type="button"
          onClick={() => setTab("oam")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "oam"
              ? "border-ruralia-teal text-ruralia-teal-text"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          OAM
        </button>
      </div>

      {tab === "beneficiarios" ? (
        <GestionBeneficiarios puedeGestionar={puedeGestionar} />
      ) : tab === "oam" ? (
        <GestionAsociaciones puedeGestionar={puedeGestionar} tipo="OAM" />
      ) : (
        <GestionAsociaciones puedeGestionar={puedeGestionar} tipo="ASOCIACION" />
      )}
    </>
  );
}
