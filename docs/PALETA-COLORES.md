# Paleta de colores — Ruralia

Colores oficiales de marca. Tokens centralizados en `app/globals.css`.

---

## Colores de marca (obligatorios)

| Nombre | Hex | Uso |
|---|---|---|
| **Dark Navy** | `#121C2D` | Fondos oscuros: login, headers, botones primarios oscuros |
| **White** | `#FFFFFF` | Texto sobre navy, superficies, marco del icono |
| **Muted Cyan/Teal** | `#42827A` | Acento: guión del logo, detalles topográficos, botones, sidebar activo, foco |

---

## Tokens derivados (web)

Calculados a partir de la paleta oficial para estados hover, fondos suaves y bordes.

| Token CSS | Hex | Uso |
|---|---|---|
| `--ruralia-navy` | `#121C2D` | = Dark Navy |
| `--ruralia-white` | `#FFFFFF` | = White |
| `--ruralia-teal` | `#42827A` | = Muted Cyan/Teal |
| `--ruralia-teal-hover` | `#356960` | Hover de botones y enlaces |
| `--ruralia-teal-muted` | `#5a9690` | Detalles secundarios, líneas SVG |
| `--ruralia-teal-soft` | `#eef3f2` | Fondos suaves (chips, badges, KPIs) |
| `--ruralia-teal-border` | `#d4e4e1` | Bordes de tarjetas e inputs |
| `--ruralia-teal-text` | `#2d524d` | Texto acento sobre fondo claro |
| `--ruralia-navy-light` | `#1a2838` | Gradiente login, hover navy |

Clases Tailwind: `bg-ruralia-navy`, `bg-ruralia-teal`, `text-ruralia-teal`, `border-ruralia-teal-border`, etc.

---

## Logotipo — qué archivo usar

| Archivo | Ruta | Cuándo usarlo |
|---|---|---|
| **Icono sobre oscuro** | `public/icono.svg` | Fondos navy o oscuros: panel izquierdo del login, card de login (`bg-ruralia-navy`), headers oscuros |
| **Icono sobre blanco** | `public/icono-fondo-blanco.png` | Fondos blancos o claros: sidebar, header móvil, favicon, tarjetas blancas, superficies `#FFFFFF` / `bg-background` |

Regla: si el fondo detrás del logo es **blanco o claro**, usar `icono-fondo-blanco.png`. Si es **navy u oscuro**, usar `icono.svg`.

Implementación actual:
- `components/sidebar.tsx` → `icono-fondo-blanco.png`
- `components/panel-layout.tsx` (header móvil) → `icono-fondo-blanco.png`
- `components/auth-panel.tsx` (paneles navy) → `icono.svg`
- `app/layout.tsx` (favicon) → `icono-fondo-blanco.png`

---

## Escala neutra — Zinc

| Uso | Tailwind | Hex |
|---|---|---|
| Texto principal | `zinc-900` | `#18181b` |
| Texto secundario | `zinc-700` | `#3f3f46` |
| Texto terciario | `zinc-600` | `#52525b` |
| Placeholder | `zinc-500` / `zinc-400` | `#71717a` / `#a1a1aa` |
| Borde inputs | `zinc-200` | `#e4e4e7` |

---

## Error y advertencia

| Tipo | Texto | Fondo |
|---|---|---|
| Error | `red-600` `#dc2626` | `red-50` `#fef2f2` |
| Advertencia | `amber-700` `#b45309` | `amber-50` `#fffbeb` |

---

## Base / superficie

| Uso | Valor |
|---|---|
| Fondo app (web) | `#f5f6f8` (`--background`) |
| Texto base | `#171717` (`--foreground`) |
| Superficie tarjetas | `#FFFFFF` |

---

## Resumen rápido

```
Dark Navy:     #121C2D  (fondo marca, botones oscuros)
White:         #FFFFFF  (texto sobre oscuro, superficies)
Teal:          #42827A  (acento, primario interactivo)
Teal hover:    #356960
Teal suave:    #eef3f2  (fondos chips/badges)
Teal borde:    #d4e4e1

Texto fuerte:  #18181b
Borde neutro:  #e4e4e7
Fondo app:     #f5f6f8
```

---

## Notas

- **Tokens CSS:** `app/globals.css` — usar `ruralia-*` en componentes nuevos, no hex sueltos ni `emerald-*`.
- **Logotipo:** ver sección [Logotipo — qué archivo usar](#logotipo--qué-archivo-usar) arriba.
- **Mobile:** replicar los tres colores obligatorios, los derivados anteriores y la regla de icono claro/oscuro.
