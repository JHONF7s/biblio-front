import { Service, signal } from '@angular/core';
import { LibroCatalogo } from '../models/libro.model';

const SIDEBAR_STORAGE_KEY = 'biblio.catalog.sidebar';

@Service()
export class UiStateService {
  private readonly _panelPrestamosAbierto = signal<boolean>(false);
  private readonly _expandiendoPanelPrestamos = signal<boolean>(false);
  private readonly _vieneDeExpansionPanel = signal<boolean>(false);
  private readonly _sidebarCatalogoAbierto = signal<boolean>(this.leerEstadoSidebarInicial());
  private readonly _libroParaReservar = signal<LibroCatalogo | null>(null);

  readonly panelPrestamosAbierto = this._panelPrestamosAbierto.asReadonly();
  readonly expandiendoPanelPrestamos = this._expandiendoPanelPrestamos.asReadonly();
  readonly vieneDeExpansionPanel = this._vieneDeExpansionPanel.asReadonly();
  readonly sidebarCatalogoAbierto = this._sidebarCatalogoAbierto.asReadonly();
  readonly libroParaReservar = this._libroParaReservar.asReadonly();

  abrirPanelPrestamos(): void {
    this._expandiendoPanelPrestamos.set(false);
    this._panelPrestamosAbierto.set(true);
  }

  cerrarPanelPrestamos(): void {
    this._expandiendoPanelPrestamos.set(false);
    this._panelPrestamosAbierto.set(false);
  }

  iniciarExpansionPanel(): void {
    this._expandiendoPanelPrestamos.set(true);
    this._vieneDeExpansionPanel.set(true);
  }

  finalizarExpansionPanel(): void {
    this._expandiendoPanelPrestamos.set(false);
    this._panelPrestamosAbierto.set(false);
  }

  consumirBanderaExpansion(): boolean {
    const valor = this._vieneDeExpansionPanel();
    if (valor) {
      this._vieneDeExpansionPanel.set(false);
    }
    return valor;
  }

  alternarSidebarCatalogo(): void {
    this.establecerSidebarCatalogo(!this._sidebarCatalogoAbierto());
  }

  establecerSidebarCatalogo(abierto: boolean): void {
    this._sidebarCatalogoAbierto.set(abierto);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, abierto ? '1' : '0');
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }

  abrirModalReserva(libro: LibroCatalogo): void {
    this._libroParaReservar.set(libro);
  }

  cerrarModalReserva(): void {
    this._libroParaReservar.set(null);
  }

  private leerEstadoSidebarInicial(): boolean {
    try {
      const guardado = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (guardado === '0') {
        return false;
      }
      if (guardado === '1') {
        return true;
      }
    } catch {
      // Ignorar
    }
    return true;
  }
}
