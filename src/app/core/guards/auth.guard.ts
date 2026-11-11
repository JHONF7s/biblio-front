import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  CanMatchFn,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { sanitizarReturnUrl } from '../utils/return-url.util';

function evaluarAutenticacion(urlDestino: string): boolean | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.verificarSesionActiva()) {
    return true;
  }

  const returnUrl = sanitizarReturnUrl(urlDestino);
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl }
  });
}

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  return evaluarAutenticacion(state.url);
};

export const authMatchGuard: CanMatchFn = (
  _route: Route,
  segments: UrlSegment[]
): boolean | UrlTree => {
  const path = '/' + segments.map((s) => s.path).join('/');
  return evaluarAutenticacion(path);
};
