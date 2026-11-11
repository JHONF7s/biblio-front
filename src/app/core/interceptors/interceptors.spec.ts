import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error.model';
import { AuthService, SESSION_STORAGE_KEY } from '../services/auth.service';
import { crearJwtPrueba } from '../services/auth.service.spec';
import { NotificationService } from '../services/notification.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('authInterceptor & errorInterceptor (S-F3 / S-F4)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;
  let notifications: NotificationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        NotificationService
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('S-F3: adjunta Authorization: Bearer <token> hacia environment.apiUrl pero NUNCA hacia dominios externos', () => {
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
    authService.verificarSesionActiva();

    http.get(`${environment.apiUrl}/reservas/mis-reservas`).subscribe();
    const reqInterna = httpMock.expectOne(`${environment.apiUrl}/reservas/mis-reservas`);
    expect(reqInterna.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    reqInterna.flush([]);

    http.get('https://otro.com/x').subscribe();
    const reqExterna = httpMock.expectOne('https://otro.com/x');
    expect(reqExterna.request.headers.has('Authorization')).toBe(false);
    reqExterna.flush({});
  });

  it('S-F4: ante 401 fuera de /auth/** cierra sesión y redirige a /login; ante 403 mantiene sesión activa', () => {
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
    authService.verificarSesionActiva();

    // 403 no debe cerrar la sesión
    let errorCapturado403: ApiError | undefined;
    http.get(`${environment.apiUrl}/libros/1`).subscribe({
      error: (err: ApiError) => {
        errorCapturado403 = err;
      }
    });

    const req403 = httpMock.expectOne(`${environment.apiUrl}/libros/1`);
    req403.flush(
      { message: 'Acceso denegado: no tiene permisos suficientes' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(errorCapturado403?.status).toBe(403);
    expect(authService.autenticado()).toBe(true);
    expect(notifications.activeNotification()?.type).toBe('error');

    // 401 fuera de /auth/** sí debe cerrar sesión
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    let errorCapturado401: ApiError | undefined;

    http.get(`${environment.apiUrl}/reservas/mis-reservas`).subscribe({
      error: (err: ApiError) => {
        errorCapturado401 = err;
      }
    });

    const req401 = httpMock.expectOne(`${environment.apiUrl}/reservas/mis-reservas`);
    req401.flush({ message: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorCapturado401?.status).toBe(401);
    expect(authService.autenticado()).toBe(false);
    expect(navSpy).toHaveBeenCalled();
  });
});
