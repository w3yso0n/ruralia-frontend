import { Suspense } from "react";
import { Spinner } from "@/components/ui/modal";
import { EditorPlantillaFormulario } from "@/components/formularios/editor-plantilla-formulario";

export default async function PaginaEditarPlantilla({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Spinner />}>
      <EditorPlantillaFormulario plantillaId={id} />
    </Suspense>
  );
}
