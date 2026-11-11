import { DatePipe } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { Reserva } from '../../../../core/models/reserva.model';
import {
  EvaluacionCancelacion,
  puedeCancelarReserva
} from '../../../../core/services/reservas.service';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-loan-drawer',
  standalone: true,
  imports: [DatePipe, BadgeComponent, ButtonComponent],
  templateUrl: './loan-drawer.component.html',
  styleUrl: './loan-drawer.component.scss'
})
export class LoanDrawerComponent implements OnDestroy {
  readonly abierto = input<boolean>(false);
  readonly expandiendo = input<boolean>(false);
  readonly reservasActivas = input<readonly Reserva[]>([]);
  readonly cargando = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly cancelandoId = input<number | null>(null);

  readonly cerrar = output<void>();
  readonly expandir = output<void>();
  readonly expansionTerminada = output<void>();
  readonly cancelarReserva = output<number>();
  readonly verLibro = output<number>();
  readonly irCatalogo = output<void>();
  readonly reintentar = output<void>();

  readonly confirmandoId = signal<number | null>(null);
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const estaAbierto = this.abierto();
      if (typeof document !== 'undefined') {
        document.body.style.overflow = estaAbierto ? 'hidden' : '';
      }
      if (!estaAbierto) {
        this.confirmandoId.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    this.limpiarFallbackTimer();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto() && !this.expandiendo()) {
      this.cerrar.emit();
    }
  }

  evaluarCancelacion(reserva: Reserva): EvaluacionCancelacion {
    return puedeCancelarReserva(reserva);
  }

  solicitarConfirmacionCancelar(idReserva: number): void {
    this.confirmandoId.set(idReserva);
  }

  abortarConfirmacionCancelar(): void {
    this.confirmandoId.set(null);
  }

  confirmarCancelacion(idReserva: number): void {
    this.confirmandoId.set(null);
    this.cancelarReserva.emit(idReserva);
  }

  iniciarExpansion(): void {
    if (this.expandiendo()) {
      return;
    }
    this.expandir.emit();

    const prefiereReducido =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const duracionMs = prefiereReducido ? 60 : 480;
    this.limpiarFallbackTimer();
    this.fallbackTimer = setTimeout(() => {
      this.finalizarTransicionExpansion();
    }, duracionMs);
  }

  onPanelTransitionEnd(event: TransitionEvent): void {
    if (!this.expandiendo()) {
      return;
    }
    if (event.propertyName === 'width' || event.propertyName === 'max-width') {
      this.finalizarTransicionExpansion();
    }
  }

  private finalizarTransicionExpansion(): void {
    this.limpiarFallbackTimer();
    this.expansionTerminada.emit();
  }

  private limpiarFallbackTimer(): void {
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}
