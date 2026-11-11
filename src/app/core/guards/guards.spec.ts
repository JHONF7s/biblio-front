import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
  provideRouter
} from '@angular/router';
import { AuthService, SESSION_STORAGE_KEY } from '../services/auth.service';
import { crearJwtPrueba } from '../services/auth.service.spec';
import { NotificationService } from '../services/notification.service';
import { authGuard, authMatchGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { roleGuard } from './role.guard';

describe('Guards de navegación (authGuard, guestGuard, roleGuard)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        NotificationService
      ]
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('authGuard y authMatchGuard redirigen a /login?returnUrl=/loans si no hay sesión', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/loans' } as RouterStateSnapshot;

    const resActivate = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(resActivate instanceof UrlTree).toBe(true);
    expect((resActivate as UrlTree).toString()).toBe('/login?returnUrl=%2Floans');

    const resMatch = TestBed.runInInjectionContext(() =>
      authMatchGuard(
        { path: 'loans' },
        [new UrlSegment('loans', {})],
        {} as Parameters<typeof authMatchGuard>[2]
      )
    );
    expect(resMatch instanceof UrlTree).toBe(true);
  });

  it('authGuard permite el paso cuando hay un token válido y no expirado', () => {
    const expFuturo = Math.floor((Date.now() + 3_600_000) / 1000);
    const token = crearJwtPrueba({ sub: 'ana@eam.edu.co', rol: 'USUARIO', exp: expFuturo });
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token,
        correo: 'ana@eam.edu.co',
        rol: 'USUARIO',
        nombreCompleto: 'Ana',
        exp: expFuturo * 1000
      })
    );

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/loans' } as RouterStateSnapshot;
    const res = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(res).toBe(true);
  });

  it('guestGuard permite entrar a /login a visitantes anónimos y redirige a "/" a usuarios con sesión', () => {
    const route = {
      queryParamMap: { get: () => null }
    } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/login' } as RouterStateSnapshot;

    expect(TestBed.runInInjectionContext(() => guestGuard(route, state))).toBe(true);

    const expFuturo = Math.floor((Date.now() + 3_600_000) / 1000);
    const token = crearJwtPrueba({ sub: 'ana@eam.edu.co', rol: 'USUARIO', exp: expFuturo });
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token,
        correo: 'ana@eam.edu.co',
        rol: 'USUARIO',
        nombreCompleto: 'Ana',
        exp: expFuturo * 1000
      })
    );

    const resConSesion = TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(resConSesion instanceof UrlTree).toBe(true);
    expect((resConSesion as UrlTree).toString()).toBe('/');
  });

  it('roleGuard valida el rol del usuario autenticado', () => {
    const expFuturo = Math.floor((Date.now() + 3_600_000) / 1000);
    const token = crearJwtPrueba({ sub: 'ana@eam.edu.co', rol: 'USUARIO', exp: expFuturo });
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token,
        correo: 'ana@eam.edu.co',
        rol: 'USUARIO',
        nombreCompleto: 'Ana',
        exp: expFuturo * 1000
      })
    );

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/admin' } as RouterStateSnapshot;

    const guardSoloAdmin = roleGuard(['ADMIN']);
    const resDenegado = TestBed.runInInjectionContext(() => guardSoloAdmin(route, state));
    expect(resDenegado instanceof UrlTree).toBe(true);

    const guardUsuario = roleGuard(['USUARIO', 'ADMIN']);
    const resPermitido = TestBed.runInInjectionContext(() => guardUsuario(route, state));
    expect(resPermitido).toBe(true);
  });
});
