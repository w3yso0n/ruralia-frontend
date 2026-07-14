"use client";

interface ModalProps {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
  ancho?: "md" | "lg" | "xl";
}

export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
  ancho = "md",
}: ModalProps) {
  if (!abierto) return null;

  const maxW =
    ancho === "xl" ? "max-w-5xl" : ancho === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-zinc-900/40"
        onClick={onCerrar}
      />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${maxW}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-2 py-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = "py-20" }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-ruralia-teal-border border-t-ruralia-teal" />
    </div>
  );
}

interface AlertaProps {
  mensaje: string;
  tipo?: "error" | "exito";
}

export function Alerta({ mensaje, tipo = "error" }: AlertaProps) {
  return (
    <div
      className={`mb-4 rounded-xl px-4 py-3 text-sm ${
        tipo === "error"
          ? "border border-red-200 bg-red-50 text-red-700"
          : "border border-ruralia-teal-border bg-ruralia-teal-soft text-ruralia-teal-text"
      }`}
    >
      {mensaje}
    </div>
  );
}
