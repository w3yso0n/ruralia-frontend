import { Suspense } from "react";
import { Spinner } from "@/components/ui/modal";
import { VistaGestionProyecto } from "@/components/proyectos/gestion-proyecto/vista-gestion";

export default async function PaginaGestionProyecto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Spinner />}>
      <VistaGestionProyecto proyectoId={id} />
    </Suspense>
  );
}
