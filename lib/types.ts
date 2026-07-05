export interface Rol {
  id: string;
  nombre: string;
}

export type NombreRol =
  | "ADMINISTRADOR"
  | "COORDINADOR"
  | "TECNICO"
  | "VISUALIZADOR";

export interface Usuario {
  id: string;
  firebaseUid: string;
  correo: string;
  nombreCompleto: string;
  urlFoto: string | null;
  estaActivo: boolean;
  creadoEn: string;
  roles: Rol[];
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

export interface Jornada {
  id: string;
  fecha: string;
  estado: EstadoJornada;
  observaciones?: string;
  proyecto?: { id: string; nombre: string };
  vereda?: { id: string; nombre: string };
  tecnicoResponsable?: { id: string; nombre: string };
  actividades?: JornadaActividadItem[];
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
  roles: NombreRol[];
}

export interface ActualizarUsuarioPayload {
  correo?: string;
  contrasena?: string;
  nombreCompleto?: string;
  urlFoto?: string;
  estaActivo?: boolean;
  roles?: NombreRol[];
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

export interface CompletarNodoPayload {
  notaCompletado?: string;
}

export interface ActividadJornadaPayload {
  actividadId: string;
  subactividadId?: string;
}

export interface CrearJornadaPayload {
  fecha: string;
  observaciones?: string;
  proyectoId: string;
  actividades: ActividadJornadaPayload[];
  veredaId: string;
  tecnicoResponsableId?: string;
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

export interface AsignacionTerritoriosPayload {
  veredaIds: string[];
}
