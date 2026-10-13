"use client";

import {
  onIdTokenChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { obtenerUsuarioActual } from "@/lib/api";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";
import type { Usuario } from "@/lib/types";

interface AuthContextValue {
  cargando: boolean;
  usuarioFirebase: User | null;
  usuario: Usuario | null;
  token: string | null;
  cerrarSesion: () => Promise<void>;
  refrescarToken: () => Promise<string | null>;
  refrescarUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuarioFirebase, setUsuarioFirebase] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const usuarioCargado = useRef(false);

  useEffect(() => {
    if (!firebaseConfigurado()) {
      setCargando(false);
      return;
    }

    const auth = obtenerAuth();
    let cancelado = false;
    const cancelar = onIdTokenChanged(auth, async (firebaseUser) => {
      if (cancelado) return;
      setUsuarioFirebase(firebaseUser);

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          if (cancelado) return;
          setToken(idToken);
          if (!usuarioCargado.current) {
            const datos = await obtenerUsuarioActual(idToken);
            if (cancelado) return;
            usuarioCargado.current = true;
            setUsuario(datos);
          }
        } catch {
          if (!cancelado && !usuarioCargado.current) {
            setUsuario(null);
            setToken(null);
          }
        }
      } else {
        usuarioCargado.current = false;
        setUsuario(null);
        setToken(null);
      }

      if (!cancelado) setCargando(false);
    });

    return () => {
      cancelado = true;
      cancelar();
    };
  }, []);

  const cerrarSesion = useCallback(async () => {
    usuarioCargado.current = false;
    if (firebaseConfigurado()) {
      await signOut(obtenerAuth());
    }
    setUsuario(null);
    setToken(null);
  }, []);

  const refrescarToken = useCallback(async () => {
    if (!usuarioFirebase) return null;
    const idToken = await usuarioFirebase.getIdToken(true);
    setToken(idToken);
    return idToken;
  }, [usuarioFirebase]);

  const refrescarUsuario = useCallback(async () => {
    if (!usuarioFirebase) return;
    const idToken = await usuarioFirebase.getIdToken();
    setToken(idToken);
    const datos = await obtenerUsuarioActual(idToken);
    setUsuario(datos);
  }, [usuarioFirebase]);

  const value = useMemo(
    () => ({
      cargando,
      usuarioFirebase,
      usuario,
      token,
      cerrarSesion,
      refrescarToken,
      refrescarUsuario,
    }),
    [
      cargando,
      usuarioFirebase,
      usuario,
      token,
      cerrarSesion,
      refrescarToken,
      refrescarUsuario,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
