import { Suspense } from "react";
import { Spinner } from "@/components/ui/modal";
import { PanelSeguimiento } from "@/components/panel-seguimiento";

export default function PaginaSeguimiento() {
  return (
    <Suspense fallback={<Spinner />}>
      <PanelSeguimiento />
    </Suspense>
  );
}
