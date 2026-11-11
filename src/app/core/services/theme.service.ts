import { Service, computed, effect, signal } from '@angular/core';

export type PreferenciaTema = 'dark' | 'light' | null;
export const THEME_STORAGE_KEY = 'biblio.theme';
const LEGACY_THEME_KEY = 'theme';

@Service()
export class ThemeService {
  private readonly _preferencia = signal<PreferenciaTema>(this.leerPreferenciaGuardada());

  readonly preferencia = this._preferencia.asReadonly();

  /**
   * Estado efectivo: 'dark' únicamente cuando la preferencia es 'dark';
   * tanto 'light' como null (neutro inicial) renderizan el tema claro (D-10).
   */
  readonly temaEfectivo = computed<'dark' | 'light'>(() =>
    this._preferencia() === 'dark' ? 'dark' : 'light'
  );

  readonly isDarkMode = computed<boolean>(() => this.temaEfectivo() === 'dark');

  /**
   * Desplazamiento vertical de la mitad crema en el SVG de dos paralelogramos (ref-1):
   * -32px (oscuro) | 0px (neutro) | +31px (claro).
   */
  readonly desplazamientoCremaPx = computed<number>(() => {
    const pref = this._preferencia();
    if (pref === 'dark') {
      return -32;
    }
    if (pref === 'light') {
      return 31;
    }
    return 0;
  });

  readonly estadoVisual = computed<'dark' | 'neutral' | 'light'>(() => {
    const pref = this._preferencia();
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    return 'neutral';
  });

  constructor() {
    this.limpiarClaveLegada();
    this.aplicarTemaAlDom(this.temaEfectivo());

    effect(() => {
      const efectivo = this.temaEfectivo();
      this.aplicarTemaAlDom(efectivo);
    });

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === THEME_STORAGE_KEY) {
          const nueva = this.validarValorPreferencia(event.newValue);
          this._preferencia.set(nueva);
          this.aplicarTemaAlDom(nueva === 'dark' ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Alterna entre modo claro y oscuro al hacer clic:
   * - Si el tema efectivo actual es claro (incluyendo neutro null) -> pasa a 'dark'.
   * - Si el tema efectivo actual es oscuro -> pasa a 'light'.
   */
  toggleTheme(): void {
    const siguiente: 'dark' | 'light' =
      this.temaEfectivo() === 'light' ? 'dark' : 'light';
    this.establecerPreferencia(siguiente);
  }

  establecerPreferencia(preferencia: 'dark' | 'light'): void {
    this._preferencia.set(preferencia);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preferencia);
    } catch {
      // Ignorar si localStorage no está disponible
    }
    this.aplicarTemaAlDom(preferencia);
  }

  restablecerNeutro(): void {
    this._preferencia.set(null);
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Ignorar
    }
    this.aplicarTemaAlDom('light');
  }

  private aplicarTemaAlDom(efectivo: 'dark' | 'light'): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    if (efectivo === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', efectivo === 'dark' ? '#131314' : '#f8fafc');
    }
  }

  private leerPreferenciaGuardada(): PreferenciaTema {
    try {
      const guardado = localStorage.getItem(THEME_STORAGE_KEY);
      return this.validarValorPreferencia(guardado);
    } catch {
      return null;
    }
  }

  private validarValorPreferencia(valor: string | null): PreferenciaTema {
    if (valor === 'dark' || valor === 'light') {
      return valor;
    }
    return null;
  }

  private limpiarClaveLegada(): void {
    try {
      localStorage.removeItem(LEGACY_THEME_KEY);
    } catch {
      // Ignorar
    }
  }
}
