import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from './auth.service';
import { crearJwtPrueba } from './auth.service.spec';
import { CatalogoService } from './catalogo.service';
import { FavoritosService } from './favoritos.service';
import { ReservasService, puedeCancelarReserva } from './reservas.service';

describe('Servicios de datos: CatalogoService, ReservasService y FavoritosService', () => {
  let httpMock: HttpTestingController;
  let catalogoService: CatalogoService;
  let reservasService: ReservasService;
  let favoritosService: FavoritosService;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        CatalogoService,
        ReservasService,
        FavoritosService
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    catalogoService = TestBed.inject(CatalogoService);
    reservasService = TestBed.inject(ReservasService);
    favoritosService = TestBed.inject(FavoritosService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('CatalogoService calcula estadísticas reales, géneros, autores y rango de años desde GET /catalogo', () => {
    catalogoService.refrescar();
    const req = httpMock.expectOne(`${environment.apiUrl}/catalogo`);
    expect(req.request.method).toBe('GET');

    req.flush([
      {
        idLibro: 1,
        isbn: '978-1',
        titulo: 'Cien Años de Soledad',
        idGenero: 10,
        nombreGenero: 'Novela',
        autores: [{ idAutor: 100, nombreAutor: 'Gabriel García Márquez' }],
        anioPublicacion: 1967,
        totalEjemplares: 3,
        ejemplaresDisponibles: 2
      },
      {
        idLibro: 2,
        isbn: '978-2',
        titulo: 'El Amor en los Tiempos del Cólera',
        idGenero: 10,
        nombreGenero: 'Novela',
        autores: [{ idAutor: 100, nombreAutor: 'Gabriel García Márquez' }],
        anioPublicacion: 1985,
        totalEjemplares: 2,
        ejemplaresDisponibles: 0
      }
    ]);

    expect(catalogoService.estadisticas()).toEqual({
      totalTitulos: 2,
      copiasDisponiblesAhora: 2,
      totalEjemplares: 5
    });
    expect(catalogoService.generosConConteo()[0].total).toBe(2);
    expect(catalogoService.autoresConConteo()[0].total).toBe(2);
    expect(catalogoService.rangoAnios()).toEqual({ min: 1967, max: 1985, sinAnio: 0 });
    expect(catalogoService.disponiblesAhora().length).toBe(1);
  });

  it('puedeCancelarReserva verifica estrictamente la regla de 24 horas antes de fechaInicio (RFN19)', () => {
    const ahora = new Date('2026-11-20T10:00:00').getTime();

    // Faltan 25 horas -> se puede cancelar
    expect(
      puedeCancelarReserva(
        { estadoReserva: 'ACTIVA', fechaInicio: '2026-11-21T11:00:00' },
        ahora
      ).puede
    ).toBe(true);

    // Faltan exactamente 24 horas -> NO se puede cancelar
    expect(
      puedeCancelarReserva(
        { estadoReserva: 'ACTIVA', fechaInicio: '2026-11-21T10:00:00' },
        ahora
      ).puede
    ).toBe(false);

    // Faltan 12 horas -> NO se puede cancelar
    expect(
      puedeCancelarReserva(
        { estadoReserva: 'ACTIVA', fechaInicio: '2026-11-20T22:00:00' },
        ahora
      ).puede
    ).toBe(false);

    // Ya cancelada -> NO se puede cancelar
    expect(
      puedeCancelarReserva(
        { estadoReserva: 'CANCELADA', fechaInicio: '2026-11-25T10:00:00' },
        ahora
      ).puede
    ).toBe(false);
  });

  it('FavoritosService guarda en biblio.favoritos.anon y fusiona en biblio.favoritos.<correo> al iniciar sesión (D-4)', () => {
    expect(favoritosService.esFavorito(7)).toBe(false);
    favoritosService.alternarFavorito(7);
    favoritosService.alternarFavorito(12);
    expect(favoritosService.favoritosIds()).toEqual([7, 12]);
    expect(localStorage.getItem('biblio.favoritos.anon')).toBe('[7,12]');

    // Pre-cargar un favorito previo del usuario
    localStorage.setItem('biblio.favoritos.ana@eam.edu.co', '[3,7]');

    // Iniciar sesión como ana@eam.edu.co
    const expFuturo = Math.floor((Date.now() + 3_600_000) / 1000);
    const token = crearJwtPrueba({ sub: 'ana@eam.edu.co', rol: 'USUARIO', exp: expFuturo });
    authService.login('ana@eam.edu.co', 'Clave123*').subscribe();

    const reqLogin = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    reqLogin.flush({
      token,
      tipoToken: 'Bearer',
      expiraEnMs: 3_600_000,
      correo: 'ana@eam.edu.co',
      rol: 'USUARIO',
      nombreCompleto: 'Ana'
    });

    // El effect de ReservasService dispara GET /reservas/mis-reservas al autenticarse
    TestBed.flushEffects();
    const reqReservas = httpMock.match(`${environment.apiUrl}/reservas/mis-reservas`);
    for (const r of reqReservas) {
      r.flush([]);
    }

    expect(favoritosService.favoritosIds()).toEqual([3, 7, 12]);
    expect(localStorage.getItem('biblio.favoritos.anon')).toBeNull();
    expect(localStorage.getItem('biblio.favoritos.ana@eam.edu.co')).toBe('[3,7,12]');
    expect(reservasService.conteoActivas()).toBe(0);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy();
  });
});
