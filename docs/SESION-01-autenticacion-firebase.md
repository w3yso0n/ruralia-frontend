# Ruralia Frontend — Documentación de sesión 01

> **Fecha:** 25 de junio de 2026  
> **Sesión:** Autenticación Firebase + integración con backend

---

## Resumen

Primera iteración del frontend web. Se configuró Next.js con Tailwind y se implementó el flujo de autenticación contra Firebase Auth, con verificación opcional del usuario en el backend NestJS.

---

## Dependencias

```bash
pnpm add firebase
```

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `lib/firebase.ts` | Inicialización del SDK web de Firebase |
| `lib/api.ts` | `obtenerUsuarioActual(token)` → `GET /autenticacion/yo` |
| `lib/types.ts` | Tipos `Usuario`, `Rol` |
| `components/auth-panel.tsx` | UI de login con pestañas iniciar/registrar |
| `app/page.tsx` | Renderiza `AuthPanel` |
| `.env.example` | Variables `NEXT_PUBLIC_FIREBASE_*` y `NEXT_PUBLIC_API_URL` |

---

## Flujo de autenticación

1. Usuario ingresa correo y contraseña
2. `signInWithEmailAndPassword` (Firebase Auth)
3. `onAuthStateChanged` detecta sesión activa
4. Botón "Probar backend" llamaba a `GET /autenticacion/yo` con el ID token

---

## Conexión con backend (sesión 02)

El backend verifica el token Firebase con Admin SDK y devuelve el usuario de PostgreSQL (roles incluidos). Ver [`ruralia-backend/docs/SESION-02-autenticacion-firebase.md`](../../ruralia-backend/docs/SESION-02-autenticacion-firebase.md).

---

## Estado al cierre de sesión 01

- Login y registro público funcionales (Firebase)
- Pantalla post-login de prueba con JSON del usuario
- Paleta visual verde esmeralda alineada con `ruralia-mobile`

---

## Supersedido en sesión 02

- Registro público eliminado (solo usuarios internos)
- Pantalla de prueba reemplazada por dashboard con KPIs
