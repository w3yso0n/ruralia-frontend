@AGENTS.md

## Convenciones estrictas
- Prohibido usar emojis en cualquier parte: código, labels, comentarios, mensajes de UI, bitácora o cualquier archivo del proyecto. Todo lo que tenga que tener imagen/icono en la UI: usar iconos de una librería de diseño web (Lucide).
- Instalación de librerías: `pnpm`.

## Línea de diseño
Cualquier componente nuevo o rediseñado **debe** seguir la línea documentada en el `claude.md` de la raíz del monorepo (paleta Ruralia, tokens `ruralia-*`, radios, botones, cards, tipografía).

Resumen rápido:
- Primario: teal `#42827A` (`ruralia-teal`)
- Soft / badges: `#eef3f2` (`ruralia-teal-soft`)
- Bordes de card: `#d4e4e1` (`ruralia-teal-border`)
- Texto acento: `#2d524d` (`ruralia-teal-text`)
- Navy marca: `#121C2D` (`ruralia-navy`)
- Fondo app: `#f5f6f8` · tarjetas blancas · texto `zinc-900` / ayudas `zinc-500`
- Cards: `rounded-2xl border border-ruralia-teal-border bg-white`
- Inputs: `rounded-xl border-zinc-200 bg-white` (fondo blanco explícito siempre) · foco `border-ruralia-teal ring-ruralia-teal/20`
- Nunca dejar inputs/textareas transparentes sobre secciones `ruralia-teal-soft` (se ven grises)
- Detalle completo: `../claude.md` y `docs/PALETA-COLORES.md`
- Referencia visual fuerte: `components/ui/selector-fecha-jornada.tsx`
