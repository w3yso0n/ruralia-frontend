import type {
  ActividadPlan,
  ActualizarPlantillaFormularioPayload,
  ActualizarProyectoPayload,
  ActualizarUsuarioPayload,
  AsignacionAsociacionesPayload,
  AsignacionBeneficiariosPayload,
  AsignacionPersonalPayload,
  AsignacionTerritoriosPayload,
  Asociacion,
  ActualizarAsociacionPayload,
  ActualizarBeneficiarioPayload,
  Beneficiario,
  CompletarNodoPayload,
  CrearActividadPayload,
  CrearAsociacionPayload,
  CrearBeneficiarioPayload,
  CrearJornadaPayload,
  CrearPlantillaFormularioPayload,
  CrearProyectoPayload,
  CrearSubactividadPayload,
  CrearUsuarioPayload,
  EstadisticasProyecto,
  Jornada,
  KpisDashboard,
  OrdenProyecto,
  PlanProyecto,
  PlantillaFormulario,
  ProgresoProyecto,
  Proyecto,
  RespuestaPaginada,
  Rol,
  SubactividadPlan,
  Usuario,
  Vereda,
  ResolverVeredaPayload,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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
    throw new Error(
      `Backend respondió ${respuesta.status}: ${cuerpo || respuesta.statusText}`,
    );
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

export async function listarRoles(token: string): Promise<Rol[]> {
  return fetchConAuth<Rol[]>("/usuarios/roles", token);
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

export async function eliminarProyecto(
  token: string,
  id: string,
): Promise<Proyecto> {
  return fetchConAuth<Proyecto>(`/proyectos/${id}`, token, {
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
): Promise<Jornada> {
  return fetchConAuth<Jornada>("/jornadas", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelarJornada(
  token: string,
  id: string,
): Promise<Jornada> {
  return fetchConAuth<Jornada>(`/jornadas/${id}`, token, { method: "DELETE" });
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
