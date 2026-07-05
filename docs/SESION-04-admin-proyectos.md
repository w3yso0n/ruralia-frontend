# Ruralia Frontend — SESION 04: Administración de proyectos

> **Fecha:** 5 de julio de 2026  
> **Alcance:** App Router, listado en cards, vista de gestión con tabs

---

## Resumen

Se migró el panel de una SPA de una sola ruta a **App Router** con autenticación centralizada y rutas dedicadas para proyectos.

Incluye:
- `AuthProvider` (`lib/auth-context.tsx`) compartido en todo el panel
- Rutas `(panel)/dashboard`, `(panel)/usuarios`, `(panel)/proyectos`, `(panel)/proyectos/[id]`
- Listado de proyectos en **cards** con filtros conectados a la API real
- Vista de gestión con tabs: Resumen, Plan, Jornadas, Equipo y vínculos
- Corrección de tipos: `EstadoProyecto.COMPLETADO` (antes `FINALIZADO` en el frontend)

---

## Estructura de rutas

```
app/
  page.tsx                    → Login (AuthPanel)
  (panel)/
    layout.tsx                → PanelLayout + Sidebar
    dashboard/page.tsx
    usuarios/page.tsx
    proyectos/page.tsx        → ListadoProyectos (cards)
    proyectos/[id]/page.tsx   → VistaGestionProyecto
```

---

## Componentes nuevos

| Componente | Descripción |
|------------|-------------|
| `lib/auth-context.tsx` | Token Firebase + usuario backend |
| `components/panel-layout.tsx` | Shell con sidebar y guard de sesión |
| `components/proyectos/listado-proyectos.tsx` | Cards + filtros + crear proyecto |
| `components/proyectos/tarjeta-proyecto.tsx` | Card con progreso, vínculos y personal |
| `components/proyectos/gestion-proyecto/vista-gestion.tsx` | Tabs de gestión |
| `components/proyectos/gestion-proyecto/arbol-plan.tsx` | Árbol actividad → subactividad |
| `components/proyectos/gestion-proyecto/marcar-completada.tsx` | Completar / reabrir con nota |

---

## Endpoints consumidos

| Vista | Endpoints |
|-------|-----------|
| Cards | `GET /proyectos` (filtros: estado, busqueda, personalId, asociacionId, veredaId, orden) |
| Resumen | `GET /proyectos/:id`, `/estadisticas`, `/progreso` |
| Plan | `GET /proyectos/:id/plan`, `POST /proyectos/:id/actividades`, `PATCH /actividades/:id/completar` |
| Jornadas | `GET /jornadas?proyectoId=`, `DELETE /jornadas/:id` |
| Filtros territorio | `GET /territorios/veredas`, `GET /beneficiarios`, `GET /asociaciones` |

---

## Permisos en UI

- **ADMINISTRADOR / COORDINADOR:** crear proyecto, actividades, marcar completada, cancelar jornada
- **TECNICO / VISUALIZADOR:** lectura del plan y listados

---

## Archivos eliminados (obsoletos)

- `components/dashboard.tsx` — reemplazado por `(panel)/layout.tsx`
- `components/gestion-proyectos.tsx` — reemplazado por cards + vista `[id]`
