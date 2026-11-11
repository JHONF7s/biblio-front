import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ApiError } from '../../../../core/models/api-error.model';
import { Disponibilidad } from '../../../../core/models/libro.model';
import { ReservaCreate } from '../../../../core/models/reserva.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReservasService } from '../../../../core/services/reservas.service';
import { UiStateService } from '../../../../core/services/ui-state.service';
import { sanitizarReturnUrl } from '../../../../core/utils/return-url.util';
import { ThemeToggleComponent } from '../../atoms/theme-toggle/theme-toggle.component';
import { ToastComponent } from '../../molecules/toast/toast.component';
import { HeaderComponent } from '../../organisms/header/header.component';
import { LoanDrawerComponent } from '../../organisms/loan-drawer/loan-drawer.component';
import { ReservaDialogComponent } from '../../organisms/reserva-dialog/reserva-dialog.component';
import { SiteFooterComponent } from '../../organisms/site-footer/site-footer.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    SiteFooterComponent,
    ThemeToggleComponent,
    LoanDrawerComponent,
    ReservaDialogComponent,
    ToastComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly catalogoService = inject(CatalogoService);
  readonly reservasService = inject(ReservasService);
  readonly uiState = inject(UiStateService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url || '/')
    ),
    { initialValue: this.router.url || '/' }
  );

  readonly enInicio = computed<boolean>(() => {
    const path = this.urlActual().split('?')[0].split('#')[0];
    return path === '' || path === '/';
  });

  readonly enCatalogo = computed<boolean>(() => {
    const path = this.urlActual().split('?')[0];
    return path === '/catalog';
  });

  readonly consultaUrlQ = computed<string>(() => {
    const url = this.urlActual();
    const qIndex = url.indexOf('?');
    if (qIndex < 0) {
      return '';
    }
    const params = new URLSearchParams(url.slice(qIndex + 1));
    return params.get('q') ?? '';
  });

  readonly enviandoReserva = signal<boolean>(false);
  readonly errorReserva = signal<string | null>(null);
  readonly disponibilidadModal = signal<Disponibilidad | null>(null);
  readonly consultandoDisponibilidad = signal<boolean>(false);
  readonly cancelandoReservaId = signal<number | null>(null);

  ngOnInit(): void {
    this.catalogoService.cargarSiNecesario();
  }

  irAlInicio(): void {
    if (!this.enInicio()) {
      void this.router.navigate(['/']);
    }
  }

  onBuscarDesdeHeader(termino: string): void {
    const limpio = termino.trim();
    void this.router.navigate(['/catalog'], {
      queryParams: { q: limpio || null },
      queryParamsHandling: 'merge'
    });
  }

  onCambioBusquedaVivo(termino: string): void {
    if (!this.enCatalogo()) {
      return;
    }
    const limpio = termino.trim();
    void this.router.navigate(['/catalog'], {
      queryParams: { q: limpio || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onAbrirBusquedaAvanzada(): void {
    this.uiState.establecerSidebarCatalogo(true);
    if (!this.enCatalogo()) {
      void this.router.navigate(['/catalog']);
    }
  }

  onAbrirMisPrestamos(): void {
    if (!this.authService.verificarSesionActiva()) {
      this.notifications.show('Inicia sesión para ver tus préstamos', 'info');
      const returnUrl = sanitizarReturnUrl(this.router.url);
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl }
      });
      return;
    }

    this.reservasService.cargarMisReservas();
    this.uiState.abrirPanelPrestamos();
  }

  onIniciarExpansionPanel(): void {
    this.uiState.iniciarExpansionPanel();
  }

  onExpansionPanelTerminada(): void {
    void this.router.navigate(['/loans']).then(() => {
      this.uiState.finalizarExpansionPanel();
    });
  }

  onVerLibroDesdePanel(idLibro: number): void {
    this.uiState.cerrarPanelPrestamos();
    void this.router.navigate(['/catalog', idLibro]);
  }

  onIrCatalogoDesdePanel(): void {
    this.uiState.cerrarPanelPrestamos();
    void this.router.navigate(['/catalog']);
  }

  onCancelarReservaDesdePanel(idReserva: number): void {
    this.cancelandoReservaId.set(idReserva);
    this.reservasService.cancelarReserva(idReserva).subscribe({
      next: () => {
        this.cancelandoReservaId.set(null);
        this.notifications.show('Reserva cancelada correctamente.', 'success');
      },
      error: (err: Partial<ApiError>) => {
        this.cancelandoReservaId.set(null);
        this.notifications.show(
          err?.mensaje || 'No fue posible cancelar la reserva.',
          'error'
        );
      }
    });
  }

  onCerrarModalReserva(): void {
    this.errorReserva.set(null);
    this.disponibilidadModal.set(null);
    this.uiState.cerrarModalReserva();
  }

  onConsultarDisponibilidadModal(evento: { idLibro: number; fechaHora: string }): void {
    if (!this.authService.verificarSesionActiva()) {
      return;
    }
    this.consultandoDisponibilidad.set(true);
    this.reservasService.consultarDisponibilidad(evento.idLibro, evento.fechaHora).subscribe({
      next: (disp) => {
        this.disponibilidadModal.set(disp);
        this.consultandoDisponibilidad.set(false);
      },
      error: () => {
        this.disponibilidadModal.set(null);
        this.consultandoDisponibilidad.set(false);
      }
    });
  }

  onConfirmarReservaModal(payload: ReservaCreate): void {
    this.enviandoReserva.set(true);
    this.errorReserva.set(null);

    this.reservasService.crearReserva(payload).subscribe({
      next: (creada) => {
        this.enviandoReserva.set(false);
        this.onCerrarModalReserva();
        this.notifications.show(
          `Préstamo registrado para «${creada.tituloLibro}» (Ejemplar #${creada.idEjemplar}).`,
          'success'
        );
      },
      error: (err: Partial<ApiError>) => {
        this.enviandoReserva.set(false);
        this.errorReserva.set(
          err?.mensaje || 'No fue posible registrar la reserva para el rango seleccionado.'
        );
      }
    });
  }

  onCerrarSesion(): void {
    const estabaEnRutaProtegida = this.urlActual().startsWith('/loans');
    this.uiState.cerrarPanelPrestamos();
    this.uiState.cerrarModalReserva();
    this.authService.logout();
    this.notifications.show('Has cerrado sesión correctamente.', 'info');
    if (estabaEnRutaProtegida) {
      void this.router.navigate(['/']);
    }
  }
}
