import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthResponse, Usuario } from '../models/auth.model';
import { AuthService, SESSION_STORAGE_KEY } from './auth.service';

function encodeBase64Url(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function crearJwtPrueba(payload: Record<string, unknown>): string {
  const header = encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
  const body = encodeBase64Url(payload);
  return `${header}.${body}.firma_valida_base64url_12345`;
}

describe('AuthService (F-5 / S-F2)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('S-F2: rechaza tokens vacíos, malformados, de 2 segmentos, con base64 inválido o expirados', () => {
    const expPasado = Math.floor((Date.now() - 60_000) / 1000);
    const expFuturo = Math.floor((Date.now() + 3_600_000) / 1000);

    const tokenExpirado = crearJwtPrueba({ sub: 'ana@eam.edu.co', rol: 'USUARIO', exp: expPasado });
    const tokenValido = crearJwtPrueba({ sub: 'ana@eam.edu.co', rol: 'USUARIO', exp: expFuturo });

    expect(service.esTokenValidoYNoExpirado('')).toBe(false);
    expect(service.esTokenValidoYNoExpirado('abc')).toBe(false);
    expect(service.esTokenValidoYNoExpirado('seg1.seg2')).toBe(false);
    expect(service.esTokenValidoYNoExpirado('@@@.###.$$$')).toBe(false);
    expect(service.esTokenValidoYNoExpirado(tokenExpirado)).toBe(false);
    expect(service.esTokenValidoYNoExpirado(tokenValido)).toBe(true);
  });

  it('realiza login contra POST /auth/login y persiste la sesión en localStorage', () => {
    const expFuturo = Math.floor((Date.now() + 7_200_000) / 1000);
    const token = crearJwtPrueba({ sub: 'ana.gomez@biblioteca.com', rol: 'USUARIO', exp: expFuturo });

    const mockResponse: AuthResponse = {
      token,
      tipoToken: 'Bearer',
      expiraEnMs: 7_200_000,
      correo: 'ana.gomez@biblioteca.com',
      rol: 'USUARIO',
      nombreCompleto: 'Ana María Gómez'
    };

    service.login('Ana.Gomez@biblioteca.com ', 'Lectura2026*').subscribe((resp) => {
      expect(resp.correo).toBe('ana.gomez@biblioteca.com');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      correo: 'ana.gomez@biblioteca.com',
      password: 'Lectura2026*'
    });
    req.flush(mockResponse);

    expect(service.autenticado()).toBe(true);
    expect(service.rol()).toBe('USUARIO');
    expect(service.nombre()).toBe('Ana María Gómez');
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain('ana.gomez@biblioteca.com');
  });

  it('realiza registro en POST /auth/register y encadena login automático', () => {
    const expFuturo = Math.floor((Date.now() + 7_200_000) / 1000);
    const token = crearJwtPrueba({ sub: 'nuevo@eam.edu.co', rol: 'USUARIO', exp: expFuturo });

    const usuarioCreado: Usuario = {
      idUsuario: 15,
      documentoIdentidad: '1094999888',
      nombreCompleto: 'Carlos Restrepo',
      correo: 'nuevo@eam.edu.co',
      rol: 'USUARIO',
      estado: true
    };

    const loginResp: AuthResponse = {
      token,
      tipoToken: 'Bearer',
      expiraEnMs: 7_200_000,
      correo: 'nuevo@eam.edu.co',
      rol: 'USUARIO',
      nombreCompleto: 'Carlos Restrepo'
    };

    service
      .registrar({
        documentoIdentidad: '1094999888',
        nombreCompleto: 'Carlos Restrepo',
        correo: 'nuevo@eam.edu.co',
        password: 'Password123*'
      })
      .subscribe();

    const reqReg = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(reqReg.request.method).toBe('POST');
    reqReg.flush(usuarioCreado, { status: 201, statusText: 'Created' });

    const reqLogin = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(reqLogin.request.method).toBe('POST');
    reqLogin.flush(loginResp);

    expect(service.autenticado()).toBe(true);
    expect(service.nombre()).toBe('Carlos Restrepo');
  });

  it('limpia la sesión en logout() y responde al evento storage entre pestañas', () => {
    const expFuturo = Math.floor((Date.now() + 7_200_000) / 1000);
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

    expect(service.verificarSesionActiva()).toBe(true);
    expect(service.autenticado()).toBe(true);

    // Simular cierre de sesión en otra pestaña
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_STORAGE_KEY, newValue: null }));

    expect(service.autenticado()).toBe(false);
    expect(service.sesion()).toBeNull();
  });
});
