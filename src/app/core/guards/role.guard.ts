import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Rol } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { sanitizarReturnUrl } from '../utils/return-url.util';

/**
 * Fábrica de guard por rol (F-7, S-F12).
 * Verifica primero que exista sesión activa y luego que el rol del usuario
 * esté incluido en la lista de roles autorizados.
 */
export function roleGuard(rolesPermitidos: readonly Rol[]): CanActivateFn {
  return (_route, state: RouterStateSnapshot): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notifications = inject(NotificationService);

    if (!authService.verificarSesionActiva()) {
      const returnUrl = sanitizarReturnUrl(state.url);
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl }
      });
    }

    const rolActual = authService.rol();
    if (rolActual && rolesPermitidos.includes(rolActual)) {
      return true;
    }

    notifications.show('No tienes permisos para acceder a esta sección.', 'error');
    return router.createUrlTree(['/']);
  };
}
