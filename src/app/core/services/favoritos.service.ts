import { Service, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

const FAVORITOS_PREFIX = 'biblio.favoritos.';
const FAVORITOS_ANON_KEY = 'biblio.favoritos.anon';

@Service()
export class FavoritosService {
  private readonly authService = inject(AuthService);
  private readonly _favoritosIds = signal<readonly number[]>([]);

  readonly favoritosIds = this._favoritosIds.asReadonly();
  readonly totalFavoritos = computed<number>(() => this._favoritosIds().length);

  constructor() {
    effect(() => {
      const correo = this.authService.correo();
      this.sincronizarConUsuario(correo);
    });
  }

  esFavorito(idLibro: number): boolean {
    return this._favoritosIds().includes(idLibro);
  }

  alternarFavorito(idLibro: number): boolean {
    const actuales = this._favoritosIds();
    const existe = actuales.includes(idLibro);
    const nuevos = existe
      ? actuales.filter((id) => id !== idLibro)
      : [...actuales, idLibro];

    this._favoritosIds.set(nuevos);
    this.guardarLista(this.obtenerClaveActual(), nuevos);
    return !existe;
  }

  private sincronizarConUsuario(correo: string | null): void {
    if (!correo) {
      this._favoritosIds.set(this.leerLista(FAVORITOS_ANON_KEY));
      return;
    }

    const claveUsuario = `${FAVORITOS_PREFIX}${correo.toLowerCase()}`;
    const deAnonimo = this.leerLista(FAVORITOS_ANON_KEY);
    const deUsuario = this.leerLista(claveUsuario);

    if (deAnonimo.length > 0) {
      const fusionados = Array.from(new Set([...deUsuario, ...deAnonimo]));
      this.guardarLista(claveUsuario, fusionados);
      this.eliminarClave(FAVORITOS_ANON_KEY);
      this._favoritosIds.set(fusionados);
    } else {
      this._favoritosIds.set(deUsuario);
    }
  }

  private obtenerClaveActual(): string {
    const correo = this.authService.correo();
    return correo ? `${FAVORITOS_PREFIX}${correo.toLowerCase()}` : FAVORITOS_ANON_KEY;
  }

  private leerLista(clave: string): number[] {
    try {
      const raw = localStorage.getItem(clave);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return Array.from(
        new Set(
          parsed.filter(
            (item): item is number => typeof item === 'number' && Number.isInteger(item) && item > 0
          )
        )
      );
    } catch {
      return [];
    }
  }

  private guardarLista(clave: string, ids: readonly number[]): void {
    try {
      localStorage.setItem(clave, JSON.stringify(ids));
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }

  private eliminarClave(clave: string): void {
    try {
      localStorage.removeItem(clave);
    } catch {
      // Ignorar
    }
  }
}
