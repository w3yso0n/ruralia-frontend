import { Suspense } from "react";
import { Spinner } from "@/components/ui/modal";
import { PanelEvaluaciones } from "@/components/evaluaciones/panel-evaluaciones";

export default function PaginaEvaluaciones() {
  return (
    <Suspense fallback={<Spinner />}>
      <PanelEvaluaciones />
    </Suspense>
  );
}
