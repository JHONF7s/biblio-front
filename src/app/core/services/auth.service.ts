import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegistroRequest,
  Rol,
  SesionActiva,
  Usuario
} from '../models/auth.model';

export const SESSION_STORAGE_KEY = 'biblio.session';
const LEGACY_TOKEN_KEY = 'token';

interface JwtPayload {
  readonly sub?: string;
  readonly rol?: string;
  readonly exp?: number;
  readonly iat?: number;
}

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _sesion = signal<SesionActiva | null>(this.restaurarSesionInicial());
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly sesion = this._sesion.asReadonly();

  readonly autenticado = computed<boolean>(() => {
    const actual = this._sesion();
    if (!actual) {
      return false;
    }
    return this.esTokenValidoYNoExpirado(actual.token, actual.exp);
  });

  readonly rol = computed<Rol | null>(() => (this.autenticado() ? this._sesion()!.rol : null));

  readonly correo = computed<string | null>(() =>
    this.autenticado() ? this._sesion()!.correo : null
  );

  readonly nombre = computed<string>(() => {
    const actual = this._sesion();
    if (!actual || !this.autenticado()) {
      return '';
    }
    return actual.nombreCompleto?.trim() || actual.correo.split('@')[0] || 'Usuario';
  });

  /** Conservado como alias reactivo para compatibilidad interna */
  readonly isLoggedIn = this.autenticado;

  constructor() {
    this.limpiarClaveLegada();
    const inicial = this._sesion();
    if (inicial) {
      this.programarExpiracion(inicial.exp);
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === SESSION_STORAGE_KEY) {
          const restaurada = this.restaurarSesionInicial();
          this._sesion.set(restaurada);
          if (restaurada) {
            this.programarExpiracion(restaurada.exp);
          } else {
            this.cancelarTemporizador();
          }
        }
      });
    }
  }

  login(correo: string, password: string): Observable<AuthResponse> {
    const body: LoginRequest = {
      correo: correo.trim().toLowerCase(),
      password
    };
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(tap((respuesta) => this.establecerSesionDesdeRespuesta(respuesta)));
  }

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    const payload: RegistroRequest = {
      documentoIdentidad: datos.documentoIdentidad.trim(),
      nombreCompleto: datos.nombreCompleto.trim(),
      correo: datos.correo.trim().toLowerCase(),
      password: datos.password
    };
    return this.http
      .post<Usuario>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(
        switchMap((usuarioCreado) =>
          this.login(payload.correo, payload.password).pipe(
            tap((resp) => {
              if (!resp.nombreCompleto && usuarioCreado?.nombreCompleto) {
                this.actualizarNombreSesion(usuarioCreado.nombreCompleto);
              }
            })
          )
        )
      );
  }

  logout(): void {
    this.cancelarTemporizador();
    this._sesion.set(null);
    this.eliminarSesionStorage();
  }

  /**
   * Verifica activamente que la sesión actual siga vigente; si expiró o fue manipulada
   * en localStorage, la limpia inmediatamente y retorna false.
   */
  verificarSesionActiva(): boolean {
    const enStorage = this.leerSesionStorage();
    if (!enStorage) {
      if (this._sesion() !== null) {
        this.logout();
      }
      return false;
    }

    if (!this.esTokenValidoYNoExpirado(enStorage.token, enStorage.exp)) {
      this.logout();
      return false;
    }

    if (this._sesion()?.token !== enStorage.token) {
      this._sesion.set(enStorage);
      this.programarExpiracion(enStorage.exp);
    }

    return true;
  }

  obtenerTokenValido(): string | null {
    return this.verificarSesionActiva() ? this._sesion()!.token : null;
  }

  esTokenValidoYNoExpirado(token: string, expMs?: number): boolean {
    const payload = this.decodificarPayloadJwt(token);
    if (!payload) {
      return false;
    }

    const ahora = Date.now();
    if (typeof payload.exp === 'number') {
      if (payload.exp * 1000 <= ahora) {
        return false;
      }
    } else if (typeof expMs === 'number') {
      if (expMs <= ahora) {
        return false;
      }
    } else {
      return false;
    }

    if (typeof expMs === 'number' && expMs <= ahora) {
      return false;
    }

    return true;
  }

  decodificarPayloadJwt(token: string): JwtPayload | null {
    if (!token || typeof token !== 'string') {
      return null;
    }
    const partes = token.split('.');
    if (partes.length !== 3) {
      return null;
    }
    const [headerB64, payloadB64, signatureB64] = partes;
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return null;
    }

    // Validar caracteres Base64URL en los 3 segmentos
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    if (
      !base64UrlRegex.test(headerB64) ||
      !base64UrlRegex.test(payloadB64) ||
      !base64UrlRegex.test(signatureB64)
    ) {
      return null;
    }

    try {
      const headerJson = this.decodificarBase64Url(headerB64);
      const payloadJson = this.decodificarBase64Url(payloadB64);
      const header = JSON.parse(headerJson) as Record<string, unknown>;
      const payload = JSON.parse(payloadJson) as JwtPayload;

      if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  private decodificarBase64Url(segmento: string): string {
    const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLength);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  private establecerSesionDesdeRespuesta(respuesta: AuthResponse): void {
    const payload = this.decodificarPayloadJwt(respuesta.token);
    const ahora = Date.now();
    const expDesdeJwt =
      payload && typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    const expCalculado =
      expDesdeJwt ?? ahora + (respuesta.expiraEnMs > 0 ? respuesta.expiraEnMs : 7_200_000);

    if (!this.esTokenValidoYNoExpirado(respuesta.token, expCalculado)) {
      this.logout();
      return;
    }

    const rolNormalizado: Rol = respuesta.rol === 'ADMIN' ? 'ADMIN' : 'USUARIO';
    const nombre =
      respuesta.nombreCompleto?.trim() || respuesta.correo.split('@')[0] || 'Usuario';

    const nuevaSesion: SesionActiva = {
      token: respuesta.token,
      correo: respuesta.correo.trim().toLowerCase(),
      rol: rolNormalizado,
      nombreCompleto: nombre,
      exp: expCalculado
    };

    this._sesion.set(nuevaSesion);
    this.guardarSesionStorage(nuevaSesion);
    this.programarExpiracion(expCalculado);
  }

  private actualizarNombreSesion(nombreCompleto: string): void {
    const actual = this._sesion();
    if (!actual) {
      return;
    }
    const actualizada: SesionActiva = {
      ...actual,
      nombreCompleto: nombreCompleto.trim()
    };
    this._sesion.set(actualizada);
    this.guardarSesionStorage(actualizada);
  }

  private restaurarSesionInicial(): SesionActiva | null {
    const guardada = this.leerSesionStorage();
    if (!guardada) {
      return null;
    }
    if (!this.esTokenValidoYNoExpirado(guardada.token, guardada.exp)) {
      this.eliminarSesionStorage();
      return null;
    }
    return guardada;
  }

  private leerSesionStorage(): SesionActiva | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<SesionActiva>;
      if (
        !parsed ||
        typeof parsed.token !== 'string' ||
        typeof parsed.correo !== 'string' ||
        (parsed.rol !== 'ADMIN' && parsed.rol !== 'USUARIO') ||
        typeof parsed.exp !== 'number'
      ) {
        return null;
      }
      return {
        token: parsed.token,
        correo: parsed.correo,
        rol: parsed.rol,
        nombreCompleto:
          typeof parsed.nombreCompleto === 'string' && parsed.nombreCompleto.trim()
            ? parsed.nombreCompleto.trim()
            : parsed.correo.split('@')[0],
        exp: parsed.exp
      };
    } catch {
      return null;
    }
  }

  private guardarSesionStorage(sesion: SesionActiva): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesion));
    } catch {
      // Si localStorage está bloqueado (modo privado estricto), la sesión vive en memoria
    }
  }

  private eliminarSesionStorage(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // Ignorar errores de almacenamiento restringido
    }
  }

  private limpiarClaveLegada(): void {
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // Ignorar
    }
  }

  private programarExpiracion(expMs: number): void {
    this.cancelarTemporizador();
    const restante = expMs - Date.now();
    if (restante <= 0) {
      this.logout();
      return;
    }
    this.expirationTimer = setTimeout(() => {
      this.logout();
    }, Math.min(restante, 2_147_483_647));
  }

  private cancelarTemporizador(): void {
    if (this.expirationTimer !== null) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }
}
