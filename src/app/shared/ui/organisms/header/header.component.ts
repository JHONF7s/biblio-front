import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Rol } from '../../../../core/models/auth.model';
import { BrandComponent } from '../../molecules/brand/brand.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, BrandComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnDestroy {
  readonly enInicio = input<boolean>(false);
  readonly enCatalogo = input<boolean>(false);
  readonly autenticado = input<boolean>(false);
  readonly nombreUsuario = input<string>('');
  readonly correoUsuario = input<string | null>(null);
  readonly rolUsuario = input<Rol | null>(null);
  readonly prestamosActivos = input<number>(0);
  readonly consultaInicial = input<string>('');

  readonly irInicio = output<void>();
  readonly buscar = output<string>();
  readonly cambioBusquedaVivo = output<string>();
  readonly abrirBusquedaAvanzada = output<void>();
  readonly abrirPrestamos = output<void>();
  readonly cerrarSesion = output<void>();

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly terminoBusqueda = signal<string>('');
  readonly menuUsuarioAbierto = signal<boolean>(false);
  readonly menuMovilAbierto = signal<boolean>(false);
  readonly busquedaMovilAbierta = signal<boolean>(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const valorExterno = this.consultaInicial();
      this.terminoBusqueda.set(valorExterno ?? '');
    });
  }

  ngOnDestroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.menuUsuarioAbierto()) {
        this.menuUsuarioAbierto.set(false);
      }
      if (this.menuMovilAbierto()) {
        this.menuMovilAbierto.set(false);
      }
      if (this.busquedaMovilAbierta()) {
        this.busquedaMovilAbierta.set(false);
      }
      return;
    }

    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName !== 'input' &&
        tagName !== 'textarea' &&
        tagName !== 'select' &&
        !target?.isContentEditable
      ) {
        event.preventDefault();
        this.enfocarBuscador();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (this.menuUsuarioAbierto() && !target.closest('.site-header__user-menu')) {
      this.menuUsuarioAbierto.set(false);
    }
  }

  enfocarBuscador(): void {
    this.searchInputRef?.nativeElement?.focus();
    this.searchInputRef?.nativeElement?.select();
  }

  onInputBusqueda(valor: string): void {
    this.terminoBusqueda.set(valor);
    if (this.enCatalogo()) {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.cambioBusquedaVivo.emit(this.terminoBusqueda());
      }, 200);
    }
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda.set('');
    if (this.enCatalogo()) {
      this.cambioBusquedaVivo.emit('');
    } else {
      this.enfocarBuscador();
    }
  }

  onSubmitBusqueda(event: Event): void {
    event.preventDefault();
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.buscar.emit(this.terminoBusqueda().trim());
    this.busquedaMovilAbierta.set(false);
  }

  onClickBusquedaAvanzada(): void {
    this.busquedaMovilAbierta.set(false);
    this.menuMovilAbierto.set(false);
    this.abrirBusquedaAvanzada.emit();
  }

  onClickMisPrestamos(): void {
    this.menuMovilAbierto.set(false);
    this.menuUsuarioAbierto.set(false);
    this.abrirPrestamos.emit();
  }

  alternarMenuUsuario(): void {
    this.menuUsuarioAbierto.update((abierto) => !abierto);
  }

  alternarMenuMovil(): void {
    this.menuMovilAbierto.update((abierto) => !abierto);
    if (this.menuMovilAbierto()) {
      this.busquedaMovilAbierta.set(false);
    }
  }

  alternarBusquedaMovil(): void {
    this.busquedaMovilAbierta.update((abierta) => !abierta);
    if (this.busquedaMovilAbierta()) {
      this.menuMovilAbierto.set(false);
      setTimeout(() => this.enfocarBuscador(), 50);
    }
  }

  onConfirmarLogout(): void {
    this.menuUsuarioAbierto.set(false);
    this.menuMovilAbierto.set(false);
    this.cerrarSesion.emit();
  }

  obtenerIniciales(): string {
    const nombre = this.nombreUsuario().trim();
    if (!nombre) {
      return 'U';
    }
    const partes = nombre.split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.slice(0, 2).toUpperCase();
  }
}
