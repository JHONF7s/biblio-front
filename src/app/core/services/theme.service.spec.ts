import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService — Tema tri-estado (F-13 / D-10 / ref-1)', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
  });

  it('inicia en estado neutro (preferencia null, tema efectivo claro, desplazamiento 0px)', () => {
    expect(service.preferencia()).toBeNull();
    expect(service.estadoVisual()).toBe('neutral');
    expect(service.temaEfectivo()).toBe('light');
    expect(service.desplazamientoCremaPx()).toBe(0);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
  });

  it('alterna de neutro -> oscuro (-32px) -> claro (+31px) y persiste en localStorage["biblio.theme"]', () => {
    service.toggleTheme();
    expect(service.preferencia()).toBe('dark');
    expect(service.estadoVisual()).toBe('dark');
    expect(service.temaEfectivo()).toBe('dark');
    expect(service.desplazamientoCremaPx()).toBe(-32);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);

    service.toggleTheme();
    expect(service.preferencia()).toBe('light');
    expect(service.estadoVisual()).toBe('light');
    expect(service.temaEfectivo()).toBe('light');
    expect(service.desplazamientoCremaPx()).toBe(31);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
  });

  it('sincroniza el tema cuando llega un StorageEvent desde otra pestaña', () => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: THEME_STORAGE_KEY,
        newValue: 'dark'
      })
    );
    expect(service.preferencia()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
  });
});
