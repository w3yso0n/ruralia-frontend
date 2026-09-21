export function codigoErrorFirebase(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }
  return "desconocido";
}

export function mensajeErrorFirebase(codigo: string): string {
  switch (codigo) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/missing-email":
      return "Escribe tu correo electrónico.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/user-disabled":
      return "Esta cuenta está desactivada. Contacta a un administrador.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión con el servidor. Revisa tu red.";
    case "auth/expired-action-code":
      return "El enlace expiró. Solicita uno nuevo.";
    case "auth/invalid-action-code":
      return "El enlace no es válido o ya se usó. Solicita uno nuevo.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Usa al menos 6 caracteres.";
    default:
      return "No se pudo completar la autenticación.";
  }
}
