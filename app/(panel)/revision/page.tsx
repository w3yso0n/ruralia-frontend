import { Suspense } from "react";
import { Spinner } from "@/components/ui/modal";
import { PanelRevision } from "@/components/revision/panel-revision";

export default function PaginaRevision() {
  return (
    <Suspense fallback={<Spinner />}>
      <PanelRevision />
    </Suspense>
  );
}
