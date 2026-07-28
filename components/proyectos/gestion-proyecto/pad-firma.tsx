"use client";

import { useEffect, useRef, useState } from "react";

interface PadFirmaProps {
  valorInicial?: string | null;
  onGuardar: (dataUrl: string) => void;
  onCancelar: () => void;
}

export function PadFirma({ valorInicial, onGuardar, onCancelar }: PadFirmaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(!valorInicial);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#18181b";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (valorInicial) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setVacio(false);
      };
      img.src = valorInicial;
    }
  }, [valorInicial]);

  function punto(
    evento: React.MouseEvent | React.TouchEvent,
  ): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in evento) {
      const touch = evento.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return {
      x: evento.clientX - rect.left,
      y: evento.clientY - rect.top,
    };
  }

  function iniciar(evento: React.MouseEvent | React.TouchEvent) {
    evento.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const p = punto(evento);
    if (!ctx || !p) return;
    dibujando.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function mover(evento: React.MouseEvent | React.TouchEvent) {
    if (!dibujando.current) return;
    evento.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const p = punto(evento);
    if (!ctx || !p) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setVacio(false);
  }

  function terminar() {
    dibujando.current = false;
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setVacio(true);
  }

  function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || vacio) return;
    onGuardar(canvas.toDataURL("image/png"));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">
        Firma en el recuadro con el mouse o el dedo.
      </p>
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-xl border border-zinc-300 bg-white"
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={terminar}
        onMouseLeave={terminar}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={terminar}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={limpiar}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={vacio}
          onClick={confirmar}
          className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Guardar firma
        </button>
      </div>
    </div>
  );
}
