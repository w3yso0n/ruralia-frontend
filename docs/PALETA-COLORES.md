# Paleta de colores — Ruralia

Extraída del uso real en `ruralia-frontend` (Tailwind) y `ruralia-mobile` (CSS puro). No hay un theme custom declarado — el frontend usa directamente la escala estándar de Tailwind, y mobile replica los mismos valores hexadecimales a mano.

---

## Color primario — Verde esmeralda (`emerald`)

Identidad de marca. Usado en botones primarios, enlaces activos, bordes de foco, fondos de estado "activo/publicado".

| Uso | Tailwind | Hex | Dónde se usa |
|---|---|---|---|
| Fondo marca / header mobile | — | `#0f2419` | Header oscuro mobile, fondo login |
| Acento oscuro (hover, texto marca) | `emerald-800` / `emerald-900` | `#065f46` / `#064e3b` | Hover de botones, texto de labels destacados |
| Primario (botones, sidebar activo) | `emerald-600` | `#16a34a` | Botón "Guardar", ítem activo del sidebar, logo |
| Primario hover | `emerald-700` | `#15803d` | Hover de botones primarios |
| Borde de foco / acento medio | `emerald-500` | `#22c55e` | `focus:border-emerald-500`, anillo de foco |
| Fondo suave (chips, badges activos) | `emerald-50` / `emerald-100` | `#ecfdf5` / `#d1fae5` | Badges "Publicada", chips seleccionados, fondos de tarjeta KPI |
| Borde suave | `emerald-100` / `emerald-200` | `#d1fae5` / `#a7f3d0` | Bordes de tarjetas (`border-emerald-100`) |

---

## Escala neutra — Zinc (`zinc`)

Texto, bordes y fondos neutros en toda la UI web.

| Uso | Tailwind | Hex |
|---|---|---|
| Texto principal (encabezados) | `zinc-900` | `#18181b` |
| Texto secundario (labels, cuerpo) | `zinc-700` | `#3f3f46` |
| Texto terciario (ayuda, metadatos) | `zinc-600` | `#52525b` |
| Texto deshabilitado / placeholder | `zinc-500` / `zinc-400` | `#71717a` / `#a1a1aa` |
| Fondo neutro (badges inactivos) | `zinc-100` | `#f4f4f5` |
| Borde estándar de inputs/tarjetas | `zinc-200` | `#e4e4e7` |
| Borde sutil (separadores) | `zinc-100` | `#f4f4f5` |

**Mobile equivalente** (mismos valores en hex, sin Tailwind):
`#111827` (texto principal), `#374151` (texto secundario), `#6b7280` (texto terciario/secundario claro), `#9ca3af` (texto deshabilitado/placeholder), `#e5e7eb` (bordes), `#f3f4f6` / `#f9fafb` (fondos neutros).

---

## Color de error — Rojo (`red`)

Validaciones fallidas, acciones destructivas (eliminar, desactivar).

| Uso | Tailwind | Hex |
|---|---|---|
| Texto / ícono de error | `red-600` / `red-700` | `#dc2626` / `#b91c1c` |
| Fondo de alerta de error | `red-50` | `#fef2f2` |
| Borde de alerta de error | `red-200` (aprox., mobile usa `#fecaca`) | `#fecaca` |
| Botón destructivo | `red-600` | `#dc2626` |

---

## Color de advertencia — Ámbar (`amber`)

Estados pendientes o de atención (ej. campos opcionales destacados, avisos no bloqueantes).

| Uso | Tailwind | Hex |
|---|---|---|
| Texto de advertencia | `amber-700` / `amber-800` / `amber-900` | `#b45309` / `#92400e` / `#78350f` |
| Fondo de advertencia | `amber-50` | `#fffbeb` |
| Borde de advertencia | `amber-200` | `#fde68a` |

---

## Base / superficie

| Uso | Valor | Dónde |
|---|---|---|
| Fondo de la app (web) | `#f4f7f2` | `globals.css` `--background` |
| Texto base (web) | `#171717` | `globals.css` `--foreground` |
| Fondo de tarjetas/superficie | `#ffffff` | Ambos proyectos |
| Fondo app (mobile) | `#f7f8f7` | `App.css` |

---

## Tipografía asociada

- **Web**: Geist Sans / Geist Mono (`--font-geist-sans`, `--font-geist-mono`).
- **Mobile**: Inter (Google Fonts), pesos 400/500/600/700.

---

## Resumen para referencia rápida

```
Primario:      #16a34a  (emerald-600)
Primario hover:#15803d  (emerald-700)
Fondo marca:   #0f2419  (verde bosque oscuro, headers/login)
Fondo suave:   #d1fae5 / #ecfdf5  (emerald-100 / emerald-50)

Texto fuerte:  #18181b  (zinc-900)
Texto medio:   #52525b  (zinc-600)
Texto suave:   #a1a1aa  (zinc-400)
Borde:         #e4e4e7  (zinc-200)

Error:         #dc2626  (red-600)
Error fondo:   #fef2f2  (red-50)

Advertencia:   #b45309  (amber-700)
Advertencia fondo: #fffbeb (amber-50)

Fondo app:     #f4f7f2  (web) / #f7f8f7 (mobile)
Superficie:    #ffffff
```

---

## Notas

- No existe hoy un archivo de theme/tokens centralizado (ni en Tailwind config ni en variables CSS de mobile) — los valores viven repetidos como clases Tailwind (web) o hex literales (mobile). Si el proyecto crece, vale la pena centralizarlos en un solo lugar (ej. `tailwind.config` con colores custom + variables CSS compartidas) para evitar que diverjan entre plataformas.
- Mobile ya replica bastante bien la paleta web a mano; el punto de fricción más probable a futuro es que alguien cambie el verde en un proyecto y se olvide del otro.
