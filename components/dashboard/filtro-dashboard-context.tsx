"use client";

import { createContext, useContext } from "react";

export interface FiltroDashboard {
  /** Vacío = todos los proyectos */
  proyectoId: string;
  nombreProyecto: string | null;
}

const FiltroDashboardContext = createContext<FiltroDashboard>({
  proyectoId: "",
  nombreProyecto: null,
});

export function FiltroDashboardProvider({
  value,
  children,
}: {
  value: FiltroDashboard;
  children: React.ReactNode;
}) {
  return (
    <FiltroDashboardContext.Provider value={value}>
      {children}
    </FiltroDashboardContext.Provider>
  );
}

export function useFiltroDashboard(): FiltroDashboard {
  return useContext(FiltroDashboardContext);
}
