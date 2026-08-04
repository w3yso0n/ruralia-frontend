import type {
  ActividadPlan,
  ActualizarPlantillaFormularioPayload,
  ActualizarProyectoPayload,
  ActualizarUsuarioPayload,
  ActualizarRolPayload,
  AsignacionAsociacionesPayload,
  AsignacionBeneficiariosPayload,
  AsignacionPersonalPayload,
  AsignacionPlantillasProceso,
  AsignacionTerritoriosPayload,
  Asociacion,
  ActualizarAsociacionPayload,
  ActualizarBeneficiarioPayload,
  AuditLogItem,
  AvancePeriodo,
  BandejaAprobacion,
  Beneficiario,
  CompletarNodoPayload,
  ContadoresAprobacion,
  CrearActividadPayload,
  CrearAsociacionPayload,
  CrearBeneficiarioPayload,
  CrearJornadaPayload,
  CrearJornadasResultado,
  ActualizarJornadaPayload,
  ActualizarAsistentePayload,
  CrearAsistentePayload,
  GuardarAsistenciaPayload,
  JornadaAsistente,
  CrearMetaPayload,
  CrearMetaPeriodoPayload,
  CrearPlantillaFormularioPayload,
  CrearProcesoPayload,
  CrearProyectoPayload,
  CrearRolPayload,
  CrearSubactividadPayload,
  CrearUsuarioPayload,
  CategoriaRechazo,
  DocumentoJornada,
  EnviarFormularioPayload,
  EnvioFormularioResumen,
  EntidadRevisable,
  EstadisticasProyecto,
  Jornada,
  KpisDashboard,
  ModuloPermisos,
  MetaPeriodoPlan,
  MetaPlan,
  OrdenProyecto,
  PlanProyecto,
  PlantillaFormulario,
  ProcesoPlan,
  ProgresoProyecto,
  Proyecto,
  RespuestaFormularioDetalle,
  RespuestaPaginada,
  RolDetalle,
  SubactividadPlan,
  Usuario,
  Vereda,
  ResolverVeredaPayload,
  NodoTerritorial,
  ResultadoBusquedaTerritorial,
  CrearNodoTerritorialPayload,
  ActualizarNodoTerritorialPayload,
  EventoCronologia,
  FiltrosCronologia,
  ResumenCronologiaProyecto,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

async function fetchConAuth<T>(
  ruta: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const tieneBody = init?.body !== undefined;
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(tieneBody ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    let mensaje = cuerpo || respuesta.statusText;
    try {
      const json = JSON.parse(cuerpo) as { message?: string | string[] };
      if (json.message) {
        mensaje = Array.isArray(json.message)
          ? json.message.join(" ")
          : json.message;
      }
    } catch {
      // el cuerpo no era JSON, se usa el texto crudo como mensaje
    }
    throw new ErrorApi(mensaje, respuesta.status);
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  return respuesta.json() as Promise<T>;
}

function construirQuery(
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== "") {
      query.set(clave, String(valor));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function obtenerUsuarioActual(token: string): Promise<Usuario> {
  return fetchConAuth<Usuario>("/autenticacion/yo", token);
}

export async function listarUsuarios(
  token: string,
  params?: {
    busqueda?: string;
    estaActivo?: boolean;
    pagina?: number;
    limite?: number;
  },
): Promise<RespuestaPaginada<Usuario>> {
  return fetchConAuth<RespuestaPaginada<Usuario>>(
    `/usuarios${construirQuery(params)}`,
    token,
  );
}

export async function obtenerUsuario(
  token: string,
  id: string,
): Promise<Usuario> {
  return fetchConAuth<Usuario>(`/usuarios/${id}`, token);
}

export async function crearUsuario(
  token: string,
  payload: CrearUsuarioPayload,
): Promise<Usuario> {
  return fetchConAuth<Usuario>("/usuarios", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarUsuario(
  token: string,
  id: string,
  payload: ActualizarUsuarioPayload,
): Promise<Usuario> {
  return fetchConAuth<Usuario>(`/usuarios/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarUsuario(
  token: string,
  id: string,
): Promise<void> {
  return fetchConAuth<void>(`/usuarios/${id}`, token, { method: "DELETE" });
}

export async function listarRoles(token: string): Promise<RolDetalle[]> {
  return fetchConAuth<RolDetalle[]>("/roles", token);
}

export async function obtenerRol(
  token: string,
  id: string,
): Promise<RolDetalle> {
  return fetchConAuth<RolDetalle>(`/roles/${id}`, token);
}

export async function crearRol(
  token: string,
  payload: CrearRolPayload,
): Promise<RolDetalle> {
  return fetchConAuth<RolDetalle>("/roles", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarRol(
  token: string,
  id: string,
  payload: ActualizarRolPayload,
): Promise<RolDetalle> {
  return fetchConAuth<RolDetalle>(`/roles/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarRol(token: string, id: string): Promise<void> {
  return fetchConAuth<void>(`/roles/${id}`, token, { method: "DELETE" });
}

export async function clonarRol(
  token: string,
  id: string,
): Promise<RolDetalle> {
  return fetchConAuth<RolDetalle>(`/roles/${id}/clonar`, token, {
    method: "POST",
  });
}

export async function listarPermisos(
  token: string,
): Promise<ModuloPermisos[]> {
  return fetchConAuth<ModuloPermisos[]>("/permisos", token);
}

export async function listarProyectos(
  token: string,
  params?: {
    estado?: string;
    busqueda?: string;
    personalId?: string;
    asociacionId?: string;
    veredaId?: string;
    orden?: OrdenProyecto;
    limite?: number;
    pagina?: number;
  },
): Promise<RespuestaPaginada<Proyecto>> {
  return fetchConAuth<RespuestaPaginada<Proyecto>>(
    `/proyectos${construirQuery(params)}`,
    token,
  );
}

export async function obtenerProyecto(
  token: string,
  id: string,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${id}`, token);
}

export async function crearProyecto(
  token: string,
  payload: CrearProyectoPayload,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>("/proyectos", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarProyecto(
  token: string,
  id: string,
  payload: ActualizarProyectoPayload,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function suspenderProyecto(
  token: string,
  id: string,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${id}`, token, {
    method: "DELETE",
  });
}

export async function eliminarProyecto(
  token: string,
  id: string,
): Promise<void> {
  return fetchConAuth<void>(`/proyectos/${id}/permanente`, token, {
    method: "DELETE",
  });
}

export async function activarProyecto(
  token: string,
  id: string,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${id}/activar`, token, {
    method: "POST",
  });
}

export async function obtenerEstadisticasProyecto(
  token: string,
  id: string,
): Promise<EstadisticasProyecto> {
  return fetchConAuth<EstadisticasProyecto>(
    `/proyectos/${id}/estadisticas`,
    token,
  );
}

export async function obtenerPlanProyecto(
  token: string,
  id: string,
): Promise<PlanProyecto> {
  return fetchConAuth<PlanProyecto>(`/proyectos/${id}/plan`, token);
}

export async function obtenerProgresoProyecto(
  token: string,
  id: string,
): Promise<ProgresoProyecto> {
  return fetchConAuth<ProgresoProyecto>(`/proyectos/${id}/progreso`, token);
}

export async function asignarPersonalProyecto(
  token: string,
  proyectoId: string,
  payload: AsignacionPersonalPayload,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${proyectoId}/personal`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function asignarTerritoriosProyecto(
  token: string,
  proyectoId: string,
  payload: AsignacionTerritoriosPayload,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${proyectoId}/territorios`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function asignarBeneficiariosProyecto(
  token: string,
  proyectoId: string,
  payload: AsignacionBeneficiariosPayload,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${proyectoId}/beneficiarios`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function asignarAsociacionesProyecto(
  token: string,
  proyectoId: string,
  payload: AsignacionAsociacionesPayload,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${proyectoId}/asociaciones`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function crearActividad(
  token: string,
  proyectoId: string,
  payload: CrearActividadPayload,
): Promise<ActividadPlan> {
  return fetchConAuth<ActividadPlan>(
    `/proyectos/${proyectoId}/actividades`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function actualizarActividad(
  token: string,
  id: string,
  payload: Partial<CrearActividadPayload>,
): Promise<ActividadPlan> {
  return fetchConAuth<ActividadPlan>(`/actividades/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarActividad(
  token: string,
  id: string,
): Promise<void> {
  return fetchConAuth<void>(`/actividades/${id}`, token, { method: "DELETE" });
}

export async function completarActividad(
  token: string,
  id: string,
  payload: CompletarNodoPayload,
): Promise<ActividadPlan> {
  return fetchConAuth<ActividadPlan>(`/actividades/${id}/completar`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function reabrirActividad(
  token: string,
  id: string,
): Promise<ActividadPlan> {
  return fetchConAuth<ActividadPlan>(`/actividades/${id}/reabrir`, token, {
    method: "PATCH",
  });
}

export async function crearSubactividad(
  token: string,
  actividadId: string,
  payload: CrearSubactividadPayload,
): Promise<SubactividadPlan> {
  return fetchConAuth<SubactividadPlan>(
    `/actividades/${actividadId}/subactividades`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function actualizarSubactividad(
  token: string,
  id: string,
  payload: Partial<CrearSubactividadPayload>,
): Promise<SubactividadPlan> {
  return fetchConAuth<SubactividadPlan>(`/subactividades/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarSubactividad(
  token: string,
  id: string,
): Promise<void> {
  return fetchConAuth<void>(`/subactividades/${id}`, token, {
    method: "DELETE",
  });
}

export async function completarSubactividad(
  token: string,
  id: string,
  payload: CompletarNodoPayload,
): Promise<SubactividadPlan> {
  return fetchConAuth<SubactividadPlan>(`/subactividades/${id}/completar`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function reabrirSubactividad(
  token: string,
  id: string,
): Promise<SubactividadPlan> {
  return fetchConAuth<SubactividadPlan>(`/subactividades/${id}/reabrir`, token, {
    method: "PATCH",
  });
}

export async function listarProcesos(
  token: string,
  subactividadId: string,
): Promise<ProcesoPlan[]> {
  return fetchConAuth<ProcesoPlan[]>(
    `/subactividades/${subactividadId}/procesos`,
    token,
  );
}

export async function crearProceso(
  token: string,
  subactividadId: string,
  payload: CrearProcesoPayload,
): Promise<ProcesoPlan> {
  return fetchConAuth<ProcesoPlan>(
    `/subactividades/${subactividadId}/procesos`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function actualizarProceso(
  token: string,
  id: string,
  payload: Partial<CrearProcesoPayload>,
): Promise<ProcesoPlan> {
  return fetchConAuth<ProcesoPlan>(`/procesos/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarProceso(
  token: string,
  id: string,
): Promise<void> {
  return fetchConAuth<void>(`/procesos/${id}`, token, { method: "DELETE" });
}

export async function crearMeta(
  token: string,
  procesoId: string,
  payload: CrearMetaPayload,
): Promise<MetaPlan> {
  return fetchConAuth<MetaPlan>(`/procesos/${procesoId}/metas`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarMeta(
  token: string,
  id: string,
  payload: Partial<CrearMetaPayload>,
): Promise<MetaPlan> {
  return fetchConAuth<MetaPlan>(`/metas/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarMeta(token: string, id: string): Promise<void> {
  return fetchConAuth<void>(`/metas/${id}`, token, { method: "DELETE" });
}

export async function crearMetaPeriodo(
  token: string,
  metaId: string,
  payload: CrearMetaPeriodoPayload,
): Promise<MetaPeriodoPlan> {
  return fetchConAuth<MetaPeriodoPlan>(`/metas/${metaId}/periodos`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarMetaPeriodo(
  token: string,
  id: string,
  cantidadPlaneada: number,
): Promise<MetaPeriodoPlan> {
  return fetchConAuth<MetaPeriodoPlan>(`/meta-periodos/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify({ cantidadPlaneada }),
  });
}

export async function eliminarMetaPeriodo(
  token: string,
  id: string,
): Promise<void> {
  return fetchConAuth<void>(`/meta-periodos/${id}`, token, { method: "DELETE" });
}

export async function obtenerAvancePeriodo(
  token: string,
  proyectoId: string,
  anio: number,
  mes: number,
): Promise<AvancePeriodo[]> {
  return fetchConAuth<AvancePeriodo[]>(
    `/proyectos/${proyectoId}/avance-periodo${construirQuery({ anio, mes })}`,
    token,
  );
}

/** Excel Plan/Ejec mensual del proyecto (metas, periodos y jornadas). */
export async function descargarExcelSeguimientoProyecto(
  token: string,
  proyectoId: string,
): Promise<Blob> {
  const respuesta = await fetch(
    `${API_URL}/reportes/proyecto/${proyectoId}/seguimiento-excel`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new Error(
      `Backend respondió ${respuesta.status}: ${cuerpo || respuesta.statusText}`,
    );
  }
  return respuesta.blob();
}

/** Excel Plan/Ejec diario de un mes (avances por jornada/día). */
export async function descargarExcelSeguimientoDiarioProyecto(
  token: string,
  proyectoId: string,
  anio: number,
  mes: number,
): Promise<Blob> {
  const respuesta = await fetch(
    `${API_URL}/reportes/proyecto/${proyectoId}/seguimiento-diario-excel${construirQuery({ anio, mes })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new Error(
      `Backend respondió ${respuesta.status}: ${cuerpo || respuesta.statusText}`,
    );
  }
  return respuesta.blob();
}

export async function listarJornadas(
  token: string,
  params?: {
    proyectoId?: string;
    pagina?: number;
    limite?: number;
  },
): Promise<RespuestaPaginada<Jornada>> {
  return fetchConAuth<RespuestaPaginada<Jornada>>(
    `/jornadas${construirQuery(params)}`,
    token,
  );
}

export async function crearJornada(
  token: string,
  payload: CrearJornadaPayload,
): Promise<CrearJornadasResultado> {
  return fetchConAuth<CrearJornadasResultado>("/jornadas", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function obtenerJornada(
  token: string,
  id: string,
): Promise<Jornada> {
  return fetchConAuth<Jornada>(`/jornadas/${id}`, token);
}

export async function actualizarJornada(
  token: string,
  id: string,
  payload: ActualizarJornadaPayload,
): Promise<Jornada> {
  return fetchConAuth<Jornada>(`/jornadas/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelarJornada(
  token: string,
  id: string,
): Promise<Jornada> {
  return fetchConAuth<Jornada>(`/jornadas/${id}`, token, { method: "DELETE" });
}

export async function eliminarJornada(
  token: string,
  id: string,
  forzar = false,
): Promise<void> {
  const query = forzar ? "?force=true" : "";
  return fetchConAuth<void>(`/jornadas/${id}/permanente${query}`, token, {
    method: "DELETE",
  });
}

export async function listarAsistenciaJornada(
  token: string,
  jornadaId: string,
): Promise<JornadaAsistente[]> {
  return fetchConAuth<JornadaAsistente[]>(
    `/jornadas/${jornadaId}/asistencia`,
    token,
  );
}

export async function guardarAsistenciaJornada(
  token: string,
  jornadaId: string,
  payload: GuardarAsistenciaPayload,
): Promise<JornadaAsistente[]> {
  return fetchConAuth<JornadaAsistente[]>(
    `/jornadas/${jornadaId}/asistencia`,
    token,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export async function agregarAsistenteJornada(
  token: string,
  jornadaId: string,
  payload: CrearAsistentePayload,
): Promise<JornadaAsistente> {
  return fetchConAuth<JornadaAsistente>(
    `/jornadas/${jornadaId}/asistencia`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function actualizarAsistenteJornada(
  token: string,
  jornadaId: string,
  asistenteId: string,
  payload: ActualizarAsistentePayload,
): Promise<JornadaAsistente> {
  return fetchConAuth<JornadaAsistente>(
    `/jornadas/${jornadaId}/asistencia/${asistenteId}`,
    token,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function eliminarAsistenteJornada(
  token: string,
  jornadaId: string,
  asistenteId: string,
): Promise<void> {
  await fetchConAuth<void>(
    `/jornadas/${jornadaId}/asistencia/${asistenteId}`,
    token,
    { method: "DELETE" },
  );
}

export async function descargarPdfAsistenciaJornada(
  token: string,
  jornadaId: string,
): Promise<Blob> {
  const respuesta = await fetch(
    `${API_URL}/jornadas/${jornadaId}/asistencia/pdf`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new Error(
      `Backend respondió ${respuesta.status}: ${cuerpo || respuesta.statusText}`,
    );
  }
  return respuesta.blob();
}

export async function descargarPdfFormularioJornada(
  token: string,
  jornadaId: string,
): Promise<Blob> {
  const respuesta = await fetch(
    `${API_URL}/jornadas/${jornadaId}/formulario/pdf`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new Error(
      `Backend respondió ${respuesta.status}: ${cuerpo || respuesta.statusText}`,
    );
  }
  return respuesta.blob();
}

export async function listarBeneficiarios(
  token: string,
  params?: { busqueda?: string; veredaId?: string; pagina?: number; limite?: number },
): Promise<RespuestaPaginada<Beneficiario>> {
  return fetchConAuth<RespuestaPaginada<Beneficiario>>(
    `/beneficiarios${construirQuery(params)}`,
    token,
  );
}

export async function listarAsociaciones(
  token: string,
  params?: { busqueda?: string; veredaId?: string; pagina?: number; limite?: number },
): Promise<RespuestaPaginada<Asociacion>> {
  return fetchConAuth<RespuestaPaginada<Asociacion>>(
    `/asociaciones${construirQuery(params)}`,
    token,
  );
}

export async function obtenerBeneficiario(
  token: string,
  id: string,
): Promise<Beneficiario> {
  return fetchConAuth<Beneficiario>(`/beneficiarios/${id}`, token);
}

export async function crearBeneficiario(
  token: string,
  payload: CrearBeneficiarioPayload,
): Promise<Beneficiario> {
  return fetchConAuth<Beneficiario>("/beneficiarios", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarBeneficiario(
  token: string,
  id: string,
  payload: ActualizarBeneficiarioPayload,
): Promise<Beneficiario> {
  return fetchConAuth<Beneficiario>(`/beneficiarios/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarBeneficiario(
  token: string,
  id: string,
): Promise<void> {
  await fetchConAuth<void>(`/beneficiarios/${id}`, token, { method: "DELETE" });
}

export async function obtenerAsociacion(
  token: string,
  id: string,
): Promise<Asociacion> {
  return fetchConAuth<Asociacion>(`/asociaciones/${id}`, token);
}

export async function crearAsociacion(
  token: string,
  payload: CrearAsociacionPayload,
): Promise<Asociacion> {
  return fetchConAuth<Asociacion>("/asociaciones", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarAsociacion(
  token: string,
  id: string,
  payload: ActualizarAsociacionPayload,
): Promise<Asociacion> {
  return fetchConAuth<Asociacion>(`/asociaciones/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarAsociacion(
  token: string,
  id: string,
): Promise<void> {
  await fetchConAuth<void>(`/asociaciones/${id}`, token, { method: "DELETE" });
}

export async function listarVeredas(
  token: string,
  params?: { busqueda?: string; pagina?: number; limite?: number },
): Promise<RespuestaPaginada<Vereda>> {
  return fetchConAuth<RespuestaPaginada<Vereda>>(
    `/territorios/veredas${construirQuery(params)}`,
    token,
  );
}

export async function resolverVereda(
  token: string,
  payload: ResolverVeredaPayload,
): Promise<Vereda> {
  return fetchConAuth<Vereda>("/territorios/veredas/resolver", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listarRegiones(
  token: string,
  incluirInactivos = true,
): Promise<NodoTerritorial[]> {
  return fetchConAuth<NodoTerritorial[]>(
    `/territorios/regiones${construirQuery({ incluirInactivos })}`,
    token,
  );
}

export async function buscarTerritorios(
  token: string,
  params: { q: string; limite?: number; incluirInactivos?: boolean },
): Promise<ResultadoBusquedaTerritorial[]> {
  return fetchConAuth<ResultadoBusquedaTerritorial[]>(
    `/territorios/buscar${construirQuery({
      q: params.q,
      limite: params.limite,
      incluirInactivos: params.incluirInactivos ?? true,
    })}`,
    token,
  );
}

export async function crearRegion(
  token: string,
  payload: CrearNodoTerritorialPayload & { descripcion?: string },
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>("/territorios/regiones", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarRegion(
  token: string,
  id: string,
  payload: ActualizarNodoTerritorialPayload & { descripcion?: string },
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>(`/territorios/regiones/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function desactivarRegion(
  token: string,
  id: string,
): Promise<void> {
  await fetchConAuth<void>(`/territorios/regiones/${id}`, token, {
    method: "DELETE",
  });
}

export async function listarDepartamentos(
  token: string,
  opts?: { regionId?: string; incluirInactivos?: boolean },
): Promise<NodoTerritorial[]> {
  return fetchConAuth<NodoTerritorial[]>(
    `/territorios/departamentos${construirQuery({
      regionId: opts?.regionId,
      incluirInactivos: opts?.incluirInactivos ?? true,
    })}`,
    token,
  );
}

export async function crearDepartamento(
  token: string,
  payload: CrearNodoTerritorialPayload & { regionId: string },
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>("/territorios/departamentos", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarDepartamento(
  token: string,
  id: string,
  payload: ActualizarNodoTerritorialPayload & { regionId?: string },
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>(
    `/territorios/departamentos/${id}`,
    token,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function desactivarDepartamento(
  token: string,
  id: string,
): Promise<void> {
  await fetchConAuth<void>(`/territorios/departamentos/${id}`, token, {
    method: "DELETE",
  });
}

export async function listarMunicipios(
  token: string,
  departamentoId: string,
  incluirInactivos = true,
): Promise<NodoTerritorial[]> {
  return fetchConAuth<NodoTerritorial[]>(
    `/territorios/municipios${construirQuery({ departamentoId, incluirInactivos })}`,
    token,
  );
}

export async function crearMunicipio(
  token: string,
  payload: CrearNodoTerritorialPayload & { departamentoId: string },
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>("/territorios/municipios", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarMunicipio(
  token: string,
  id: string,
  payload: ActualizarNodoTerritorialPayload,
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>(`/territorios/municipios/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function desactivarMunicipio(
  token: string,
  id: string,
): Promise<void> {
  await fetchConAuth<void>(`/territorios/municipios/${id}`, token, {
    method: "DELETE",
  });
}

export async function listarVeredasPorMunicipio(
  token: string,
  municipioId: string,
  incluirInactivos = true,
): Promise<NodoTerritorial[]> {
  return fetchConAuth<NodoTerritorial[]>(
    `/territorios/municipios/${municipioId}/veredas${construirQuery({ incluirInactivos })}`,
    token,
  );
}

export async function crearVeredaAdmin(
  token: string,
  payload: CrearNodoTerritorialPayload & { municipioId: string },
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>("/territorios/veredas", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarVeredaAdmin(
  token: string,
  id: string,
  payload: ActualizarNodoTerritorialPayload,
): Promise<NodoTerritorial> {
  return fetchConAuth<NodoTerritorial>(`/territorios/veredas/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function desactivarVeredaAdmin(
  token: string,
  id: string,
): Promise<void> {
  await fetchConAuth<void>(`/territorios/veredas/${id}`, token, {
    method: "DELETE",
  });
}

export async function obtenerKpisDashboard(token: string): Promise<KpisDashboard> {
  const [activos, total, jornadas, indicadores, recientes] = await Promise.all([
    listarProyectos(token, { estado: "ACTIVO", limite: 1 }),
    listarProyectos(token, { limite: 1 }),
    fetchConAuth<RespuestaPaginada<unknown>>("/jornadas?limite=1", token),
    fetchConAuth<unknown[]>("/indicadores", token),
    listarProyectos(token, { estado: "ACTIVO", limite: 5 }),
  ]);

  return {
    proyectosActivos: activos.total,
    totalProyectos: total.total,
    jornadasRegistradas: jornadas.total,
    indicadoresMonitoreados: indicadores.length,
    proyectosRecientes: recientes.datos,
  };
}

export async function listarPlantillasFormulario(
  token: string,
): Promise<PlantillaFormulario[]> {
  return fetchConAuth<PlantillaFormulario[]>("/formularios/plantillas", token);
}

export async function listarPlantillasPorProceso(
  token: string,
  procesoId: string,
): Promise<PlantillaFormulario[]> {
  return fetchConAuth<PlantillaFormulario[]>(
    `/formularios/plantillas/proceso/${procesoId}`,
    token,
  );
}

export async function obtenerAsignacionPlantillasProceso(
  token: string,
  procesoId: string,
): Promise<AsignacionPlantillasProceso> {
  return fetchConAuth<AsignacionPlantillasProceso>(
    `/formularios/plantillas/proceso/${procesoId}/asignacion`,
    token,
  );
}

export async function asignarPlantillasProceso(
  token: string,
  procesoId: string,
  payload: {
    plantillaIndividualId?: string | null;
    plantillaGrupalId?: string | null;
  },
): Promise<AsignacionPlantillasProceso> {
  return fetchConAuth<AsignacionPlantillasProceso>(
    `/formularios/plantillas/proceso/${procesoId}/asignacion`,
    token,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function listarPlantillasPorJornada(
  token: string,
  jornadaId: string,
): Promise<PlantillaFormulario[]> {
  return fetchConAuth<PlantillaFormulario[]>(
    `/formularios/plantillas/jornada/${jornadaId}`,
    token,
  );
}

export async function listarEnviosPorJornada(
  token: string,
  jornadaId: string,
): Promise<EnvioFormularioResumen[]> {
  return fetchConAuth<EnvioFormularioResumen[]>(
    `/formularios/envios/jornada/${jornadaId}`,
    token,
  );
}

export async function obtenerRespuestasEnvio(
  token: string,
  envioId: string,
): Promise<RespuestaFormularioDetalle[]> {
  return fetchConAuth<RespuestaFormularioDetalle[]>(
    `/formularios/envios/${envioId}/respuestas`,
    token,
  );
}

export async function enviarFormulario(
  token: string,
  payload: EnviarFormularioPayload,
): Promise<EnvioFormularioResumen> {
  return fetchConAuth<EnvioFormularioResumen>("/formularios/envios", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarEnvioFormulario(
  token: string,
  envioId: string,
  respuestas: Array<{ claveCampo: string; valor: unknown }>,
): Promise<EnvioFormularioResumen> {
  return fetchConAuth<EnvioFormularioResumen>(
    `/formularios/envios/${envioId}`,
    token,
    { method: "PATCH", body: JSON.stringify({ respuestas }) },
  );
}

export async function eliminarEnvioFormulario(
  token: string,
  envioId: string,
): Promise<void> {
  await fetchConAuth<void>(`/formularios/envios/${envioId}`, token, {
    method: "DELETE",
  });
}

export async function obtenerPlantillaFormulario(
  token: string,
  id: string,
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}`,
    token,
  );
}

export async function crearPlantillaFormulario(
  token: string,
  payload: CrearPlantillaFormularioPayload,
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>("/formularios/plantillas", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarPlantillaFormulario(
  token: string,
  id: string,
  payload: ActualizarPlantillaFormularioPayload,
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function publicarPlantillaFormulario(
  token: string,
  id: string,
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}/publicar`,
    token,
    { method: "POST" },
  );
}

export async function clonarPlantillaFormulario(
  token: string,
  id: string,
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}/clonar`,
    token,
    { method: "POST" },
  );
}

export async function asignarProcesosPlantilla(
  token: string,
  id: string,
  procesoIds: string[],
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}/procesos`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ procesoIds }),
    },
  );
}

export async function asignarSubactividadesPlantilla(
  token: string,
  id: string,
  subactividadIds: string[],
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}/subactividades`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ subactividadIds }),
    },
  );
}

export async function asignarUsuariosPlantilla(
  token: string,
  id: string,
  usuarioIds: string[],
): Promise<PlantillaFormulario> {
  return fetchConAuth<PlantillaFormulario>(
    `/formularios/plantillas/${id}/usuarios`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ usuarioIds }),
    },
  );
}

export async function listarActoresCronologia(
  token: string,
): Promise<Array<{ id: string; nombreCompleto: string; correo: string }>> {
  return fetchConAuth(
    `/cronologia/actores`,
    token,
  );
}

export async function listarCronologiaActor(
  token: string,
  usuarioId: string,
  params?: FiltrosCronologia,
): Promise<RespuestaPaginada<EventoCronologia>> {
  return fetchConAuth<RespuestaPaginada<EventoCronologia>>(
    `/cronologia/actor/${usuarioId}${construirQuery(params)}`,
    token,
  );
}

export async function listarCronologiaProyecto(
  token: string,
  proyectoId: string,
  params?: FiltrosCronologia,
): Promise<RespuestaPaginada<EventoCronologia>> {
  return fetchConAuth<RespuestaPaginada<EventoCronologia>>(
    `/cronologia/proyecto/${proyectoId}${construirQuery(params)}`,
    token,
  );
}

export async function obtenerResumenCronologiaProyecto(
  token: string,
  proyectoId: string,
): Promise<ResumenCronologiaProyecto> {
  return fetchConAuth<ResumenCronologiaProyecto>(
    `/cronologia/proyecto/${proyectoId}/resumen`,
    token,
  );
}

/* ─── RF-18 / RF-19: aprobación, auditoría, documentos ─── */

export async function obtenerBandejaAprobaciones(
  token: string,
  params?: {
    vista?: "tecnico" | "supervisor" | "coordinacion";
    estadoFuncional?: string;
    proyectoId?: string;
  },
): Promise<BandejaAprobacion> {
  return fetchConAuth<BandejaAprobacion>(
    `/aprobaciones/bandeja${construirQuery(params)}`,
    token,
  );
}

export async function obtenerContadoresAprobacion(
  token: string,
): Promise<ContadoresAprobacion> {
  return fetchConAuth<ContadoresAprobacion>(
    `/aprobaciones/contadores`,
    token,
  );
}

export async function enviarJornadaARevision(
  token: string,
  jornadaId: string,
  notas?: string,
): Promise<unknown> {
  return fetchConAuth(`/jornadas/${jornadaId}/enviar-revision`, token, {
    method: "POST",
    body: JSON.stringify({ notas }),
  });
}

export async function subirJornadaAProyecto(
  token: string,
  jornadaId: string,
  notas?: string,
): Promise<unknown> {
  return fetchConAuth(`/jornadas/${jornadaId}/subir-proyecto`, token, {
    method: "POST",
    body: JSON.stringify({ notas }),
  });
}

export async function reenviarJornadaARevision(
  token: string,
  jornadaId: string,
  changeReason: string,
): Promise<unknown> {
  return fetchConAuth(`/jornadas/${jornadaId}/reenviar-revision`, token, {
    method: "POST",
    body: JSON.stringify({ changeReason }),
  });
}

export async function aprobarEntidad(
  token: string,
  payload: {
    entityType: EntidadRevisable;
    entityId: string;
    documentVersionId?: string;
    notes?: string;
  },
): Promise<unknown> {
  return fetchConAuth(`/aprobaciones/aprobar`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function rechazarEntidad(
  token: string,
  payload: {
    entityType: EntidadRevisable;
    entityId: string;
    category: CategoriaRechazo;
    reason: string;
    requestedCorrection: string;
    documentId?: string;
    evidenceId?: string;
  },
): Promise<unknown> {
  return fetchConAuth(`/aprobaciones/rechazar`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listarDocumentosJornada(
  token: string,
  jornadaId: string,
): Promise<DocumentoJornada[]> {
  return fetchConAuth<DocumentoJornada[]>(
    `/documentos/jornada/${jornadaId}`,
    token,
  );
}

export async function listarAuditoria(
  token: string,
  params?: {
    projectId?: string;
    jornadaId?: string;
    entityId?: string;
    entityType?: string;
    action?: string;
    pagina?: number;
    limite?: number;
  },
): Promise<RespuestaPaginada<AuditLogItem>> {
  return fetchConAuth<RespuestaPaginada<AuditLogItem>>(
    `/auditoria${construirQuery(params)}`,
    token,
  );
}

export async function compararVersionesDocumento(
  token: string,
  documentoId: string,
  a: string,
  b: string,
): Promise<{
  documentoId: string;
  titulo?: string;
  campos: Array<{
    clave: string;
    etiqueta: string;
    tipo: string;
    versionAnterior: unknown;
    versionNueva: unknown;
    cambio: boolean;
  }>;
  versionA: {
    id: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    changeReason?: string | null;
  };
  versionB: {
    id: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    changeReason?: string | null;
  };
}> {
  return fetchConAuth(
    `/documentos/${documentoId}/versiones/comparar?a=${a}&b=${b}`,
    token,
  );
}
