import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiError, BackendErrorPayload } from '../models/api-error.model';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { sanitizarReturnUrl } from '../utils/return-url.util';

let manejandoExpiracion = false;

/**
 * Normaliza los errores HTTP al contrato ApiError { status, mensaje, detalles } (F-6, S-F4).
 * - 401 fuera de /auth/**: cierra sesión una sola vez, muestra aviso y redirige a /login?returnUrl=...
 * - 403: muestra aviso de permisos insuficientes sin cerrar la sesión.
 * - 0: error de red o CORS.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        const fallback: ApiError = {
          status: -1,
          mensaje: 'Ocurrió un error inesperado al procesar la solicitud.'
        };
        return throwError(() => fallback);
      }

      const esEndpointAuth =
        req.url.includes('/auth/login') || req.url.includes('/auth/register');
      const payload =extraerPayload(error.error);

      let mensaje =
        payload?.message ||
         obtenerMensajePorDefecto(error.status);

      if (error.status === 0) {
        mensaje =
          'No se pudo conectar con el servidor. Verifica que el backend esté activo.';
      } else if (error.status === 401 && !esEndpointAuth) {
        mensaje = 'Tu sesión expiró. Inicia sesión nuevamente para continuar.';
        if (!manejandoExpiracion) {
          manejandoExpiracion = true;
          authService.logout();
          notifications.show(mensaje, 'warning');
          const urlActual = sanitizarReturnUrl(router.url);
          if (!router.url.startsWith('/login')) {
            void router
              .navigate(['/login'], {
                queryParams: urlActual !== '/' ? { returnUrl: urlActual } : undefined
              })
              .finally(() => {
                manejandoExpiracion = false;
              });
          } else {
            manejandoExpiracion = false;
          }
        }
      } else if (error.status === 403) {
        mensaje =
          payload?.message || 'No tienes permiso para realizar esta operación.';
        notifications.show(mensaje, 'error');
      }

      const normalizado: ApiError = {
        status: error.status,
        mensaje,
        ...(payload?.details ? { detalles: payload.details } : {})
      };

      return throwError(() => normalizado);
    })
  );
};

function extraerPayload(body: unknown): BackendErrorPayload | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  return body as BackendErrorPayload;
}

function obtenerMensajePorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'Los datos enviados no son válidos. Revisa el formulario.';
    case 401:
      return 'Correo o contraseña incorrectos.';
    case 403:
      return 'No tienes permiso para acceder a este recurso.';
    case 404:
      return 'El recurso solicitado no existe o ya no está disponible.';
    case 500:
      return 'Error interno del servidor. Intenta de nuevo en unos momentos.';
    default:
      return 'No se pudo completar la operación solicitada.';
  }
}
