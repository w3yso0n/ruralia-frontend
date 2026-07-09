# Dashboard — Datos mock y alineación con el backend

> Guía para la demo corporativa y para migrar a datos reales **sin bloqueos de
> modelo**. Todas las métricas del dashboard están diseñadas para calcularse con
> las entidades que ya existen en `ruralia-backend`.

---

## Resumen ejecutivo

| Widget | ¿Factible hoy? | Fuente de datos actual |
|--------|----------------|------------------------|
| KPIs (4 tarjetas) | **Sí** | `obtenerKpisDashboard()` — ya implementado |
| Proyectos recientes | **Sí** | `GET /proyectos?estado=ACTIVO` |
| Avance del plan | **Sí** | `Proyecto.progresoPorcentaje` (calculado del plan) |
| Cobertura territorial | **Sí** | Veredas con jornada / veredas en `proyecto_veredas` |
| Jornadas con evidencia | **Sí** | `Evidencia` tipo FOTO ligada a jornada COMPLETADA |
| Jornadas del mes | **Sí** | `GET /jornadas?fechaDesde&fechaHasta` |
| Actividad mensual | **Sí** | Agregación SQL sobre `jornadas`, `envios_formulario`, `jornada_beneficiarios` |
| Progreso por proyecto | **Sí** | `progresoPorcentaje` + `conteoBeneficiarios` en listado |
| Mapa cobertura | **Sí** | `proyecto_veredas` + centroide AVG de `jornadas.lat/lng` |
| Mapa jornadas geo | **Sí** | `Jornada.latitud/longitud` ordenadas por `fecha` |
| Jornadas recientes | **Sí** | `GET /jornadas?limite=5` (requiere join vereda en listado) |

**No incluido (eliminado):** alertas operativas — no hay entidad ni reglas en backend.

---

## Archivos mock (eliminar en producción)

| Archivo | Rol |
|---------|-----|
| `lib/mock/dashboard-mock.ts` | Datos + tipos + flag `DASHBOARD_USAR_MOCK` |
| `docs/DASHBOARD-MOCK-DATA.md` | Este documento |
| `components/dashboard/*` | UI reutilizable — **mantener**, solo cambiar fuente de datos |

---

## Flag de activación

```typescript
// lib/mock/dashboard-mock.ts
export const DASHBOARD_USAR_MOCK = true;  // demo
export const DASHBOARD_USAR_MOCK = false; // KPIs reales vía API existente
```

---

## Mapeo widget → entidad → endpoint

### 1. KPIs principales

**Tipo:** `KpisDashboard` (ya en `lib/types.ts`)

| Campo | Cálculo actual (frontend) | Endpoint backend |
|-------|---------------------------|------------------|
| `proyectosActivos` | `listarProyectos({ estado: ACTIVO }).total` | `GET /proyectos` |
| `totalProyectos` | `listarProyectos().total` | `GET /proyectos` |
| `jornadasRegistradas` | `GET /jornadas?limite=1` → `total` | `GET /jornadas` |
| `indicadoresMonitoreados` | `GET /indicadores` → `length` | `GET /indicadores` |
| `proyectosRecientes` | `listarProyectos({ estado: ACTIVO, limite: 5 })` | `GET /proyectos` |

**Función frontend:** `obtenerKpisDashboard()` en `lib/api.ts`

---

### 2. Medidores de cumplimiento

**Tipo mock:** `MockMedidoresCumplimiento`

| Medidor | Fórmula SQL sugerida | Entidades |
|---------|---------------------|-----------|
| Avance del plan | `AVG(progresoPorcentaje)` proyectos ACTIVO | `proyectos`, `actividades`, `subactividades` |
| Cobertura territorial | `COUNT(DISTINCT vereda_id con jornada) / COUNT(vereda_id en proyecto_veredas)` | `proyecto_veredas`, `jornadas` |
| Jornadas con evidencia | `COUNT(jornadas COMPLETADA con evidencia FOTO) / COUNT(jornadas COMPLETADA)` | `jornadas`, `evidencias` |
| Jornadas del mes | `COUNT(jornadas WHERE fecha BETWEEN inicio_mes AND fin_mes)` | `jornadas` |

**Endpoint sugerido (1 solo):** `GET /dashboard/cumplimiento`

No requiere columnas nuevas en base de datos.

---

### 3. Actividad mensual

**Tipo mock:** `MockSerieMensual[]`

| Campo | Fuente |
|-------|--------|
| `jornadas` | `COUNT(*)` GROUP BY mes en `jornadas.fecha` |
| `formularios` | `COUNT(*)` GROUP BY mes en `envios_formulario.enviadoEn` |
| `beneficiariosAtendidos` | `COUNT(DISTINCT beneficiario_id)` GROUP BY mes en `jornada_beneficiarios` |

**Endpoint sugerido:** `GET /dashboard/actividad-mensual?meses=6`

---

### 4. Progreso por proyecto

**Tipo mock:** `MockProgresoProyecto`

| Campo | Campo backend | Notas |
|-------|---------------|-------|
| `progresoPorcentaje` | `Proyecto.progresoPorcentaje` | Ya en listado |
| `conteoBeneficiarios` | `Proyecto.conteoBeneficiarios` | Ya en listado |

**No se usa `metaBeneficiarios`** — ese campo no existe en el schema. Si el
corporativo quiere metas, usar `Indicador.valorMeta` vinculado al proyecto.

**Endpoint:** reutilizar `GET /proyectos?estado=ACTIVO` o `GET /dashboard/progreso-proyectos`.

---

### 5. Mapa de cobertura territorial

**Tipo mock:** `MockVeredaCobertura[]`

| Campo | Fuente real |
|-------|-------------|
| `veredaId`, `nombre`, municipio, departamento | Tabla `veredas` + joins territoriales |
| `latitud`, `longitud` | **`AVG(jornadas.latitud/longitud)` por vereda** — igual que `GET /reportes/proyecto/:id/mapa-calor` |
| `proyectosActivos[]` | Join `proyecto_veredas` + `proyectos` WHERE `estado = ACTIVO` |

**Importante:** `Vereda` **no tiene** lat/lng persistidos. El mapa funciona con
centroide de jornadas — no hay bloqueo de schema.

**Endpoint sugerido:** `GET /dashboard/mapa-cobertura`

**Componente:** `MapaCoberturaVeredas`

---

### 6. Mapa de jornadas georreferenciadas

**Tipo mock:** `MockSeguimientoCampo` con `jornadas: MockJornadaGeoref[]`

| Campo mock | Entidad backend |
|------------|-----------------|
| `jornadaId` | `Jornada.id` |
| `latitud`, `longitud` | `Jornada.latitud`, `Jornada.longitud` |
| `estado` | `Jornada.estado` |
| `fecha` | `Jornada.fecha` |
| `descripcion` | `Jornada.observaciones` |
| `progresoAvancePorcentaje` | jornadas COMPLETADA / total con geo |

**No hay sede técnica ni checkpoints ficticios** — solo jornadas reales ordenadas cronológicamente.

**Endpoint:** `GET /jornadas?proyectoId=X` filtrando `latitud IS NOT NULL`.

**Componente:** `MapaSeguimientoCampo`

---

### 7. Jornadas recientes (tabla)

**Tipo mock:** `MockJornadaReciente[]`

| Campo | Fuente |
|-------|--------|
| `id` | `Jornada.id` |
| `proyectoNombre` | join `proyecto.nombre` |
| `veredaNombre` | join `vereda.nombre` — requiere fix en `JornadasService.listar` |
| `tecnico` | `tecnicoResponsable.nombreCompleto` |
| `estado` | `Jornada.estado` |
| `fecha` | `Jornada.fecha` |

**Endpoint:** `GET /jornadas?limite=5` (orden `fecha DESC`)

---

## Endpoints backend existentes útiles

```
GET  /proyectos
GET  /proyectos/:id/estadisticas
GET  /proyectos/:id/progreso
GET  /jornadas
GET  /indicadores
GET  /reportes/proyecto/:id/mapa-calor
GET  /territorios/veredas
```

## Endpoints sugeridos (1 módulo DashboardService)

```
GET /dashboard/cumplimiento
GET /dashboard/actividad-mensual?meses=6
GET /dashboard/mapa-cobertura
```

Todos son agregaciones SQL — sin migraciones de schema.

---

## Plan de migración

### Fase 1 — Sin backend nuevo
- `DASHBOARD_USAR_MOCK = false` para KPIs
- Conectar progreso y jornadas desde endpoints existentes
- Fix join vereda en listado jornadas (backend)

### Fase 2 — Módulo dashboard
- 3 endpoints de agregación + wrappers en `lib/api.ts`

### Fase 3 — Limpieza
- Borrar mock, banner demo y este documento

---

## Lo que NO se incluyó (y por qué)

| Feature descartada | Motivo |
|--------------------|--------|
| Alertas operativas | No hay entidad ni reglas en backend |
| Tendencias KPI | Sin histórico / snapshots |
| `metaBeneficiarios` | Campo inexistente — usar `conteoBeneficiarios` |
| Sede técnica ficticia | No modelado — usar jornadas georreferenciadas |
| Meta arbitraria de ritmo mensual | Usar conteo absoluto de jornadas del mes |
