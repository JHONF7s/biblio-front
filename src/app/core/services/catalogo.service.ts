import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error.model';
import { LibroCatalogo } from '../models/libro.model';

export interface GeneroConConteo {
  readonly idGenero: number;
  readonly nombreGenero: string;
  readonly total: number;
}

export interface AutorConConteo {
  readonly idAutor: number;
  readonly nombreAutor: string;
  readonly total: number;
}

export interface RangoAniosCatalogo {
  readonly min: number;
  readonly max: number;
  readonly sinAnio: number;
}

export interface EstadisticasCatalogo {
  readonly totalTitulos: number;
  readonly copiasDisponiblesAhora: number;
  readonly totalEjemplares: number;
}

@Service()
export class CatalogoService {
  private readonly http = inject(HttpClient);

  private readonly _libros = signal<readonly LibroCatalogo[]>([]);
  private readonly _cargando = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _cargado = signal<boolean>(false);

  readonly libros = this._libros.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();
  readonly cargado = this._cargado.asReadonly();

  readonly generosConConteo = computed<readonly GeneroConConteo[]>(() => {
    const mapa = new Map<number, { nombreGenero: string; total: number }>();
    for (const libro of this._libros()) {
      const actual = mapa.get(libro.idGenero);
      if (actual) {
        actual.total += 1;
      } else {
        mapa.set(libro.idGenero, { nombreGenero: libro.nombreGenero, total: 1 });
      }
    }
    return Array.from(mapa.entries())
      .map(([idGenero, info]) => ({
        idGenero,
        nombreGenero: info.nombreGenero,
        total: info.total
      }))
      .sort((a, b) => a.nombreGenero.localeCompare(b.nombreGenero, 'es'));
  });

  readonly autoresConConteo = computed<readonly AutorConConteo[]>(() => {
    const mapa = new Map<number, { nombreAutor: string; total: number }>();
    for (const libro of this._libros()) {
      for (const autor of libro.autores) {
        const actual = mapa.get(autor.idAutor);
        if (actual) {
          actual.total += 1;
        } else {
          mapa.set(autor.idAutor, { nombreAutor: autor.nombreAutor, total: 1 });
        }
      }
    }
    return Array.from(mapa.entries())
      .map(([idAutor, info]) => ({
        idAutor,
        nombreAutor: info.nombreAutor,
        total: info.total
      }))
      .sort((a, b) => a.nombreAutor.localeCompare(b.nombreAutor, 'es'));
  });

  readonly rangoAnios = computed<RangoAniosCatalogo>(() => {
    let min = Infinity;
    let max = -Infinity;
    let sinAnio = 0;

    for (const libro of this._libros()) {
      if (typeof libro.anioPublicacion === 'number') {
        if (libro.anioPublicacion < min) min = libro.anioPublicacion;
        if (libro.anioPublicacion > max) max = libro.anioPublicacion;
      } else {
        sinAnio += 1;
      }
    }

    if (min === Infinity || max === -Infinity) {
      return { min: 1900, max: new Date().getFullYear(), sinAnio };
    }
    return { min, max, sinAnio };
  });

  readonly estadisticas = computed<EstadisticasCatalogo>(() => {
    let copiasDisponiblesAhora = 0;
    let totalEjemplares = 0;
    const lista = this._libros();

    for (const libro of lista) {
      copiasDisponiblesAhora += libro.ejemplaresDisponibles;
      totalEjemplares += libro.totalEjemplares;
    }

    return {
      totalTitulos: lista.length,
      copiasDisponiblesAhora,
      totalEjemplares
    };
  });

  readonly disponiblesAhora = computed<readonly LibroCatalogo[]>(() =>
    this._libros()
      .filter((libro) => libro.ejemplaresDisponibles > 0)
      .slice(0, 12)
  );

  cargarSiNecesario(): void {
    if (!this._cargado() && !this._cargando()) {
      this.refrescar();
    }
  }

  refrescar(): void {
    this._cargando.set(true);
    this._error.set(null);

    this.http.get<LibroCatalogo[]>(`${environment.apiUrl}/catalogo`).subscribe({
      next: (lista) => {
        this._libros.set(lista ?? []);
        this._cargado.set(true);
        this._cargando.set(false);
      },
      error: (err: Partial<ApiError>) => {
        this._error.set(
          err?.mensaje || 'No se pudo cargar el catálogo de libros en este momento.'
        );
        this._cargando.set(false);
      }
    });
  }

  obtenerPorId(idLibro: number): Observable<LibroCatalogo> {
    return this.http.get<LibroCatalogo>(`${environment.apiUrl}/catalogo/${idLibro}`).pipe(
      tap((libroActualizado) => {
        const actuales = this._libros();
        const idx = actuales.findIndex((l) => l.idLibro === libroActualizado.idLibro);
        if (idx >= 0) {
          const copia = [...actuales];
          copia[idx] = libroActualizado;
          this._libros.set(copia);
        }
      })
    );
  }
}
