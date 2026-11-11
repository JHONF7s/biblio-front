import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta el encabezado Authorization: Bearer <token> únicamente a peticiones
 * dirigidas a environment.apiUrl (S-F3). Nunca filtra el token a dominios externos.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.obtenerTokenValido();

  if (!token) {
    return next(req);
  }

  const clonada = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonada);
};
