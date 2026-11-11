import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { sanitizarReturnUrl } from '../utils/return-url.util';

/**
 * Redirige a '/' (o al returnUrl saneado) si el usuario ya tiene una sesión válida activa.
 */
export const guestGuard: CanActivateFn = (route): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.verificarSesionActiva()) {
    return true;
  }

  const rawReturn = route.queryParamMap.get('returnUrl');
  const destino = sanitizarReturnUrl(rawReturn);
  return router.parseUrl(destino);
};
