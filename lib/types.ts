export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  esSistema?: boolean;
}

export interface Permiso {
  id: string;
  clave: string;
  modulo: string;
  accion: string;
  descripcion?: string;
  orden: number;
}

export interface ModuloPermisos {
  modulo: string;
  permisos: Permiso[];
}

export interface RolDetalle {
  id: string;
  nombre: string;
  descripcion?: string;
  esSistema: boolean;
  estaActivo: boolean;
  permisoIds: string[];
  permisoClaves: string[];
  conteoPermisos: number;
  conteoUsuarios: number;
}

/** Permisos que el rol CUANTIVA no puede perder (alineado con backend). */
export const PERMISOS_CRITICOS_CUANTIVA: readonly string[] = [
  "roles.ver",
  "roles.crear",
  "roles.editar",
  "roles.eliminar",
  "usuarios.ver",
  "usuarios.editar",
  "usuarios.gestionar_roles",
] as const;

export const ETIQUETAS_ROL: Record<string, string> = {
  CUANTIVA: "Cuantiva",
  ADMINISTRADOR: "Administrador",
  COORDINADOR_DEPARTAMENTAL: "Coordinador departamental",
  COORDINADOR_ZONA: "Coordinador de zona",
  CAMPO: "Campo",
  VISUALIZADOR: "Visualizador",
  // legacy
  COORDINADOR: "Coordinador",
  TECNICO: "Campo",
};

export function etiquetaRol(nombre: string): string {
  return (
    ETIQUETAS_ROL[nombre] ??
    nombre
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

export interface Usuario {
  id: string;
  firebaseUid: string;
  correo: string;
  nombreCompleto: string;
  urlFoto: string | null;
  estaActivo: boolean;
  creadoEn: string;
  roles: Rol[];
  permisos?: string[];
}

export interface UsuarioResumen {
  id: string;
  nombreCompleto: string;
  correo?: string;
}

export type EstadoProyecto =
  | "BORRADOR"
  | "ACTIVO"
  | "SUSPENDIDO"
  | "COMPLETADO";

export type TipoProyecto = "AGRICOLA" | "AMBIENTAL" | "TURISMO" | "OTRO";

export type OrdenProyecto =
  | "nombre_asc"
  | "nombre_desc"
  | "creado_asc"
  | "creado_desc";

export type EstadoAvanceActividad = "PENDIENTE" | "COMPLETADA";

export type EstadoJornada =
  | "PLANIFICADA"
  | "EN_PROGRESO"
  | "COMPLETADA"
  | "CANCELADA";

export type EstadoFuncional =
  | "BORRADOR"
  | "CAPTURADO"
  | "SINCRONIZADO"
  | "EN_REVISION"
  | "APROBADO"
  | "RECHAZADO"
  | "EN_CORRECCION";

export type TipoJornada = "INDIVIDUAL" | "GRUPAL";

export type CategoriaRechazo =
  | "INFORMACION_INCOMPLETA"
  | "DOCUMENTO_INCORRECTO"
  | "FIRMA_FALTANTE"
  | "EVIDENCIA_FALTANTE"
  | "FOTOGRAFIA_INVALIDA"
  | "FOTOGRAFIA_BORROSA"
  | "UBICACION_INCORRECTA"
  | "BENEFICIARIO_INCORRECTO"
  | "ASOCIACION_INCORRECTA"
  | "INCONSISTENCIA_FORMULARIO_DOCUMENTO"
  | "OTRO";

export type EntidadRevisable = "JORNADA" | "DOCUMENTO" | "EVIDENCIA";

export type AccionAuditoria =
  | "CREATE"
  | "UPDATE"
  | "DELETE_LOGICAL"
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "RESUBMIT"
  | "GENERATE_DOCUMENT"
  | "CREATE_VERSION"
  | "SYNC";

export type EstadoEjecucionJornada = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA";

export interface BeneficiarioResumen {
  id: string;
  nombres: string;
  apellidos: string;
}

export interface AsociacionResumen {
  id: string;
  nombre: string;
}

export interface VeredaResumen {
  id: string;
  nombre: string;
  codigo?: string;
  latitud?: number;
  longitud?: number;
}

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoProyecto;
  estado: EstadoProyecto;
  fechaInicio?: string;
  fechaFin?: string;
  creadoEn: string;
  actualizadoEn: string;
  conteoBeneficiarios?: number;
  progresoPorcentaje?: number;
  beneficiarioPrincipal?: BeneficiarioResumen;
  beneficiarios?: BeneficiarioResumen[];
  asociacionPrincipal?: AsociacionResumen;
  asociaciones?: AsociacionResumen[];
  personal?: UsuarioResumen[];
  veredas?: VeredaResumen[];
}

export interface RespuestaPaginada<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface KpisDashboard {
  proyectosActivos: number;
  totalProyectos: number;
  jornadasRegistradas: number;
  indicadoresMonitoreados: number;
  proyectosRecientes: Proyecto[];
}

export interface CompletadaPor {
  id: string;
  nombreCompleto: string;
}

export interface MetaPeriodoPlan {
  id: string;
  anio: number;
  mes: number;
  cantidadPlaneada: number;
  ejecutado: number;
  progresoPorcentaje: number;
}

export interface MetaPlan {
  id: string;
  nombre: string;
  unidadMedida: string;
  cantidadTotal: number;
  orden: number;
  estaActivo: boolean;
  ejecutadoTotal: number;
  progresoPorcentaje: number;
  periodos?: MetaPeriodoPlan[];
}

export interface ProcesoPlan {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  estaActivo: boolean;
  progresoPorcentaje: number;
  metas?: MetaPlan[];
}

export interface SubactividadPlan {
  id: string;
  nombre: string;
  descripcion?: string;
  objetivo?: string;
  orden: number;
  estaActivo: boolean;
  estadoAvance: EstadoAvanceActividad;
  notaCompletado?: string;
  completadaEn?: string;
  completadaPor?: CompletadaPor;
  progresoPorcentaje: number;
  procesos?: ProcesoPlan[];
}

export interface ActividadPlan {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  estaActivo: boolean;
  estadoAvance: EstadoAvanceActividad;
  notaCompletado?: string;
  completadaEn?: string;
  completadaPor?: CompletadaPor;
  progresoPorcentaje: number;
  subactividades?: SubactividadPlan[];
}

export interface PlanProyecto {
  proyectoId: string;
  actividades: ActividadPlan[];
  progresoPorcentaje: number;
}

export interface ProgresoProyecto {
  proyectoId: string;
  progresoPorcentaje: number;
  actividadesTotal: number;
  actividadesCompletadas: number;
}

export interface EstadisticasProyecto {
  conteoBeneficiarios: number;
  conteoJornadas: number;
  conteoFormulariosEnviados: number;
  porcentajeAvanceIndicadores: number;
}

export interface JornadaActividadItem {
  id: string;
  actividad: { id: string; nombre: string };
  subactividad?: { id: string; nombre: string };
  estadoEjecucion: EstadoEjecucionJornada;
  nota?: string;
  orden: number;
}

export interface MetaResumenJornada {
  id: string;
  nombre: string;
  unidadMedida: string;
  cantidadTotal?: number;
  ejecutadoTotal?: number;
  procesoNombre?: string;
  subactividadNombre?: string;
  actividadNombre?: string;
}

export interface JornadaAsistente {
  id: string;
  nombreCompleto: string;
  documento?: string | null;
  firmaDataUrl?: string | null;
  firmadoEn?: string | null;
  orden: number;
}

export interface HermanoGrupoJornada {
  id: string;
  estado: EstadoJornada;
  tecnicoResponsable?: { id: string; nombre: string };
}

export interface Jornada {
  id: string;
  fecha: string;
  estado: EstadoJornada;
  estadoFuncional?: EstadoFuncional;
  requiereRevision?: boolean;
  tipo?: TipoJornada;
  nombre?: string | null;
  observaciones?: string;
  cantidadEjecutada?: number;
  proyecto?: { id: string; nombre: string };
  meta?: MetaResumenJornada;
  vereda?: { id: string; nombre: string };
  tecnicoResponsable?: { id: string; nombre: string };
  actividades?: JornadaActividadItem[];
  asistentes?: JornadaAsistente[];
  grupoJornadaId?: string | null;
  grupo?: HermanoGrupoJornada[];
}

export interface ContadoresAprobacion {
  borradores: number;
  enRevision: number;
  rechazadas: number;
  enCorreccion: number;
  aprobadas: number;
  pendientesRevision: number;
}

export interface RechazoAbiertoBandeja {
  id: string;
  entityType: EntidadRevisable;
  category: CategoriaRechazo;
  reason: string;
  requestedCorrection: string;
  rejectedAt: string;
  rejectedBy: string | null;
}

export interface ItemBandejaAprobacion {
  id: string;
  fecha: string;
  nombre?: string | null;
  tipo?: TipoJornada;
  estado: EstadoJornada;
  estadoFuncional: EstadoFuncional;
  proyecto: { id: string; nombre: string } | null;
  tecnicoResponsable: { id: string; nombre: string } | null;
  meta: { id: string; nombre: string } | null;
  vereda: { id: string; nombre: string } | null;
  editable: boolean;
  rechazosAbiertos: RechazoAbiertoBandeja[];
}

export interface BandejaAprobacion {
  vista: "tecnico" | "supervisor" | "coordinacion";
  contadores: ContadoresAprobacion;
  items: ItemBandejaAprobacion[];
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  field?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  action: AccionAuditoria;
  userId: string;
  userRole: string;
  createdAt: string;
  projectId: string;
  jornadaId?: string | null;
  documentId?: string | null;
  documentVersionId?: string | null;
  source?: string | null;
}

export interface DocumentoVersion {
  id: string;
  versionNumber: number;
  status: string;
  changeReason?: string | null;
  filePath?: string | null;
  previousVersionId?: string | null;
  createdAt: string;
  snapshot?: Record<string, unknown> | null;
}

export interface DocumentoJornada {
  id: string;
  tipo: string;
  titulo: string;
  estadoFuncional: EstadoFuncional;
  versionVigenteId?: string | null;
  versiones?: DocumentoVersion[];
  creadoEn: string;
}

export interface CrearJornadasResultado {
  grupoJornadaId: string | null;
  jornadas: Jornada[];
}

export interface Beneficiario {
  id: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  telefono?: string;
  correo?: string;
  genero?: Genero;
  fechaNacimiento?: string;
  estaActivo: boolean;
  vereda?: VeredaResumen;
}

export interface Asociacion {
  id: string;
  nombre: string;
  nit: string;
  nombreRepresentante: string;
  telefono?: string;
  correo?: string;
  estaActivo: boolean;
  vereda?: VeredaResumen;
}

export type TipoDocumento = "CC" | "CE" | "PASAPORTE" | "TI";
export type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

export interface CrearBeneficiarioPayload {
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  veredaId: string;
  telefono?: string;
  correo?: string;
  genero?: Genero;
  fechaNacimiento?: string;
}

export interface ActualizarBeneficiarioPayload {
  nombres?: string;
  apellidos?: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  veredaId?: string;
  telefono?: string;
  correo?: string;
  genero?: Genero;
  fechaNacimiento?: string;
}

export interface CrearAsociacionPayload {
  nombre: string;
  nit: string;
  nombreRepresentante: string;
  veredaId: string;
  telefono?: string;
  correo?: string;
}

export interface ActualizarAsociacionPayload {
  nombre?: string;
  nit?: string;
  nombreRepresentante?: string;
  veredaId?: string;
  telefono?: string;
  correo?: string;
}

export interface Vereda {
  id: string;
  nombre: string;
  codigo: string;
  municipioNombre?: string;
  corregimientoNombre?: string;
  departamentoNombre?: string;
  regionNombre?: string;
  latitud?: number;
  longitud?: number;
}

/** Nodo de la jerarquía territorial (admin). */
export interface NodoTerritorial {
  id: string;
  nombre: string;
  codigo: string;
  estaActivo: boolean;
  padreId?: string;
  conteoHijos?: number;
}

export interface CrearNodoTerritorialPayload {
  nombre: string;
  codigo?: string;
}

export interface ActualizarNodoTerritorialPayload {
  nombre?: string;
  codigo?: string;
  estaActivo?: boolean;
}

export type NivelTerritorial = "region" | "departamento" | "municipio" | "vereda";

export interface ResultadoBusquedaTerritorial {
  nivel: NivelTerritorial;
  id: string;
  nombre: string;
  codigo: string;
  estaActivo: boolean;
  ruta: string;
  regionId?: string;
  departamentoId?: string;
  municipioId?: string;
  veredaId?: string;
}

export interface ResolverVeredaPayload {
  nombreVereda: string;
  municipio?: string;
  departamento?: string;
  corregimiento?: string;
  placeId?: string;
  latitud?: number;
  longitud?: number;
}

export interface CrearUsuarioPayload {
  correo: string;
  contrasena: string;
  nombreCompleto: string;
  urlFoto?: string;
  rolIds: string[];
}

export interface ActualizarUsuarioPayload {
  correo?: string;
  contrasena?: string;
  nombreCompleto?: string;
  urlFoto?: string;
  estaActivo?: boolean;
  rolIds?: string[];
}

export interface CrearRolPayload {
  nombre: string;
  descripcion?: string;
  permisoIds?: string[];
}

export interface ActualizarRolPayload {
  nombre?: string;
  descripcion?: string;
  estaActivo?: boolean;
  permisoIds?: string[];
}

export interface CrearProyectoPayload {
  nombre: string;
  descripcion?: string;
  tipo: TipoProyecto;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ActualizarProyectoPayload extends Partial<CrearProyectoPayload> {}

export interface CrearActividadPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
}

export interface CrearSubactividadPayload {
  nombre: string;
  descripcion?: string;
  objetivo?: string;
  orden?: number;
}

export interface CrearProcesoPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
}

export interface CrearMetaPayload {
  nombre: string;
  unidadMedida: string;
  cantidadTotal: number;
  orden?: number;
}

export interface CrearMetaPeriodoPayload {
  anio: number;
  mes: number;
  cantidadPlaneada: number;
}

export interface AvancePeriodo {
  metaId: string;
  metaNombre: string;
  unidadMedida: string;
  anio: number;
  mes: number;
  cantidadPlaneada: number;
  ejecutado: number;
  progresoPorcentaje: number;
  acumuladoTotal: number;
  progresoAcumulado: number;
}

export interface CompletarNodoPayload {
  notaCompletado?: string;
}

export interface ActividadJornadaPayload {
  actividadId: string;
  subactividadId?: string;
}

export interface CrearJornadaPayload {
  fecha: string;
  nombre?: string;
  observaciones?: string;
  proyectoId: string;
  metaId: string;
  actividades?: ActividadJornadaPayload[];
  veredaId: string;
  tecnicoResponsableId?: string;
  tecnicoResponsableIds?: string[];
  tipo?: TipoJornada;
  requiereRevision?: boolean;
}

export interface ActualizarJornadaPayload {
  fecha?: string;
  nombre?: string;
  observaciones?: string;
  veredaId?: string;
  metaId?: string;
  cantidadEjecutada?: number;
  tipo?: TipoJornada;
}

export interface GuardarAsistenciaPayload {
  asistentes: Array<{
    id?: string;
    nombreCompleto: string;
    documento?: string;
    firmaDataUrl?: string | null;
  }>;
}

export interface CrearAsistentePayload {
  nombreCompleto: string;
  documento?: string;
}

export interface ActualizarAsistentePayload {
  nombreCompleto?: string;
  documento?: string | null;
  firmaDataUrl?: string | null;
}

export interface VinculoBeneficiarioPayload {
  beneficiarioId: string;
  esPrincipal?: boolean;
}

export interface VinculoAsociacionPayload {
  asociacionId: string;
  esPrincipal?: boolean;
}

export interface AsignacionBeneficiariosPayload {
  beneficiarios: VinculoBeneficiarioPayload[];
}

export interface AsignacionAsociacionesPayload {
  asociaciones: VinculoAsociacionPayload[];
}

export interface AsignacionPersonalPayload {
  usuarioIds: string[];
}

export type TipoCampoFormulario =
  | "TEXTO"
  | "NUMERO"
  | "FECHA"
  | "SI_NO"
  | "SELECCION_UNICA"
  | "SELECCION_MULTIPLE"
  | "GPS"
  | "FOTO"
  | "FIRMA"
  | "ARCHIVO"
  | "TABLA";

export type TipoCampoColumnaTabla =
  | "TEXTO"
  | "NUMERO"
  | "FECHA"
  | "SI_NO"
  | "SELECCION_UNICA"
  | "FIRMA";

export interface ColumnaCampoTabla {
  clave: string;
  etiqueta: string;
  tipoCampo: TipoCampoColumnaTabla;
  esObligatorio?: boolean;
  opciones?: { valores?: string[] };
}

export type TipoPlantillaFormulario = "INDIVIDUAL" | "GRUPAL";

export interface CampoFormulario {
  id: string;
  etiqueta: string;
  clave: string;
  tipoCampo: TipoCampoFormulario;
  esObligatorio: boolean;
  orden: number;
  opciones?:
    | { valores?: string[] }
    | { columnas?: ColumnaCampoTabla[] }
    | Record<string, unknown>;
  reglasValidacion?: Record<string, unknown>;
}

export interface PlantillaFormulario {
  id: string;
  nombre: string;
  descripcion?: string;
  version: number;
  estaActivo: boolean;
  tipoPlantilla?: TipoPlantillaFormulario;
  procesoIds: string[];
  subactividadIds: string[];
  usuarioIds: string[];
  campos?: CampoFormulario[];
}

export interface AsignacionPlantillasProceso {
  plantillaIndividual?: PlantillaFormulario | null;
  plantillaGrupal?: PlantillaFormulario | null;
}

export interface EnvioFormularioResumen {
  id: string;
  enviadoEn: string;
  jornadaId?: string;
  usuarioId: string;
  plantillaFormularioId?: string;
  indiceFila: number;
}

export interface RespuestaFormularioDetalle {
  id: string;
  claveCampo: string;
  etiquetaCampo?: string;
  tipoCampo?: TipoCampoFormulario;
  valorTexto?: string;
  valorNumero?: number;
  valorFecha?: string;
  valorBooleano?: boolean;
  valorJson?: unknown;
  urlArchivo?: string;
}

export interface EnviarFormularioPayload {
  jornadaId?: string;
  plantillaFormularioId: string;
  indiceFila?: number;
  respuestas: Array<{ claveCampo: string; valor: unknown }>;
}

export interface CampoFormularioPayload {
  id?: string;
  etiqueta: string;
  clave: string;
  tipoCampo: TipoCampoFormulario;
  esObligatorio?: boolean;
  orden?: number;
  opciones?: Record<string, unknown>;
  reglasValidacion?: Record<string, unknown>;
}

export interface CrearPlantillaFormularioPayload {
  nombre: string;
  descripcion?: string;
  tipoPlantilla?: TipoPlantillaFormulario;
  procesoIds?: string[];
  subactividadIds?: string[];
  usuarioIds?: string[];
  campos: CampoFormularioPayload[];
}

export interface ActualizarPlantillaFormularioPayload {
  nombre?: string;
  descripcion?: string;
  tipoPlantilla?: TipoPlantillaFormulario;
  procesoIds?: string[];
  subactividadIds?: string[];
  usuarioIds?: string[];
  campos?: CampoFormularioPayload[];
}

export interface AsignacionTerritoriosPayload {
  veredaIds: string[];
}

export type AccionCronologia =
  | "JORNADA_CREADA"
  | "JORNADA_ESTADO_CAMBIADO"
  | "JORNADA_CANCELADA"
  | "FORMULARIO_ENVIADO"
  | "ACTIVIDAD_COMPLETADA"
  | "SUBACTIVIDAD_COMPLETADA";

export interface EventoCronologia {
  id: string;
  actorId: string;
  actorNombre?: string;
  proyectoId: string;
  proyectoNombre?: string;
  accion: AccionCronologia | string;
  entidadTipo: string;
  entidadId: string | null;
  titulo: string;
  detalle: Record<string, unknown> | null;
  ocurridoEn: string;
}

export interface ResumenCronologiaProyecto {
  proyectoId: string;
  totalEventos: number;
  ultimaActividadEn: string | null;
  porAccion: Array<{ accion: string; total: number }>;
  porActor: Array<{ actorId: string; actorNombre: string; total: number }>;
}

export type FiltrosCronologia = {
  pagina?: number;
  limite?: number;
  actorId?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};
