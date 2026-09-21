import { Suspense } from "react";
import { PantallaAuthCargando } from "@/components/auth/marco-auth";
import { RestablecerContrasenaPanel } from "@/components/auth/restablecer-contrasena-panel";

export default function RestablecerContrasena() {
  return (
    <Suspense fallback={<PantallaAuthCargando />}>
      <RestablecerContrasenaPanel />
    </Suspense>
  );
}
