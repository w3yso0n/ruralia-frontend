"use client";

import { useState } from "react";
import { GestionTerritorios } from "@/components/gestion-territorios";
import { GestionVeredasPdet } from "@/components/territorio/gestion-veredas-pdet";

type Pestana = "dane" | "pdet";

/** Territorios: división DANE (región > departamento > municipio > vereda) y catálogo PDET aparte. */
export function TerritoriosConPestanas() {
  const [pestana, setPestana] = useState<Pestana>("dane");
  return (
    <>
      <div className="mb-6 border-b border-zinc-200">
        <nav className="-mb-px flex gap-6" aria-label="Catálogos territoriales">
          {(
            [
              { id: "dane", etiqueta: "División DANE" },
              { id: "pdet", etiqueta: "Veredas PDET" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPestana(p.id)}
              className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                pestana === p.id
                  ? "border-ruralia-teal text-ruralia-teal-text"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </nav>
      </div>
      {pestana === "dane" ? <GestionTerritorios /> : <GestionVeredasPdet />}
    </>
  );
}
