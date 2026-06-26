export interface Rol {
  id: string;
  nombre: string;
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
}
