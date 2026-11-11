import { DatePipe, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error.model';
import { EstadoReserva, Reserva } from '../../../../core/models/reserva.model';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  EvaluacionCancelacion,
  ReservasService,
  puedeCancelarReserva
} from '../../../../core/services/reservas.service';
import { UiStateService } from '../../../../core/services/ui-state.service';
import { BadgeComponent, BadgeVariant } from '../../../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { StatChipComponent } from '../../../../shared/ui/molecules/stat-chip/stat-chip.component';

export type FiltroEstadoPrestamo = 'TODAS' | EstadoReserva;
export type OrdenPrestamos =
  | 'inicio-desc'
  | 'inicio-asc'
  | 'entrega-asc'
  | 'entrega-desc';

@Component({
  selector: 'app-loans-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, BadgeComponent, ButtonComponent, StatChipComponent],
  templateUrl: './loans-page.component.html',
  styleUrl: './loans-page.component.scss'
})
export class LoansPageComponent implements OnInit {
  readonly reservasService = inject(ReservasService);
  private readonly uiState = inject(UiStateService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly vieneDeExpansion = signal<boolean>(false);
  readonly filtroEstado = signal<FiltroEstadoPrestamo>('TODAS');
  readonly busquedaTitulo = signal<string>('');
  readonly orden = signal<OrdenPrestamos>('inicio-desc');
  readonly reservaPorCancelar = signal<Reserva | null>(null);
  readonly cancelandoId = signal<number | null>(null);

  readonly reservasFiltradas = computed<readonly Reserva[]>(() => {
    const estado = this.filtroEstado();
    const termino = this.busquedaTitulo().trim().toLowerCase();
    const criterioOrden = this.orden();

    const filtradas = this.reservasService.reservas().filter((r) => {
      if (estado !== 'TODAS' && r.estadoReserva !== estado) {
        return false;
      }
      if (termino && !r.tituloLibro.toLowerCase().includes(termino)) {
        return false;
      }
      return true;
    });

    const copia = [...filtradas];
    copia.sort((a, b) => {
      switch (criterioOrden) {
        case 'inicio-asc':
          return a.fechaInicio.localeCompare(b.fechaInicio);
        case 'entrega-asc':
          return a.fechaEntrega.localeCompare(b.fechaEntrega);
        case 'entrega-desc':
          return b.fechaEntrega.localeCompare(a.fechaEntrega);
        case 'inicio-desc':
        default:
          return b.fechaInicio.localeCompare(a.fechaInicio);
      }
    });

    return copia;
  });

  ngOnInit(): void {
    this.vieneDeExpansion.set(this.uiState.consumirBanderaExpansion());
    this.reservasService.cargarMisReservas();
  }

  evaluarCancelacion(reserva: Reserva): EvaluacionCancelacion {
    return puedeCancelarReserva(reserva);
  }

  varianteEstado(estado: EstadoReserva): BadgeVariant {
    switch (estado) {
      case 'ACTIVA':
        return 'success';
      case 'FINALIZADA':
        return 'primary';
      case 'CANCELADA':
        return 'neutral';
    }
  }

  abrirConfirmacionCancelacion(reserva: Reserva): void {
    this.reservaPorCancelar.set(reserva);
  }

  cerrarConfirmacionCancelacion(): void {
    if (!this.cancelandoId()) {
      this.reservaPorCancelar.set(null);
    }
  }

  confirmarCancelacion(): void {
    const objetivo = this.reservaPorCancelar();
    if (!objetivo || this.cancelandoId()) {
      return;
    }

    this.cancelandoId.set(objetivo.idReserva);
    this.reservasService.cancelarReserva(objetivo.idReserva).subscribe({
      next: () => {
        this.cancelandoId.set(null);
        this.reservaPorCancelar.set(null);
        this.notifications.show(
          `Reserva #${objetivo.idReserva} cancelada exitosamente.`,
          'success'
        );
      },
      error: (err: Partial<ApiError>) => {
        this.cancelandoId.set(null);
        this.reservaPorCancelar.set(null);
        this.notifications.show(
          err?.mensaje || 'No se pudo cancelar la reserva.',
          'error'
        );
      }
    });
  }

  volver(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/catalog']);
    }
  }
}
