import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, computed, effect, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error.model';
import { Disponibilidad } from '../models/libro.model';
import { Reserva, ReservaCreate } from '../models/reserva.model';
import { AuthService } from './auth.service';
import { CatalogoService } from './catalogo.service';

export interface EvaluacionCancelacion {
  readonly puede: boolean;
  readonly motivo?: string;
}

const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

/**
 * Evalúa si una reserva puede cancelarse por el usuario según la regla de negocio RFN19:
 * debe estar ACTIVA y faltar estrictamente más de 24 horas para la fecha de inicio.
 */
export function puedeCancelarReserva(
  reserva: Pick<Reserva, 'estadoReserva' | 'fechaInicio'>,
  ahoraMs: number = Date.now()
): EvaluacionCancelacion {
  if (reserva.estadoReserva !== 'ACTIVA') {
    return {
      puede: false,
      motivo: `La reserva ya se encuentra en estado ${reserva.estadoReserva.toLowerCase()}.`
    };
  }

  const inicioMs = new Date(reserva.fechaInicio).getTime();
  if (Number.isNaN(inicioMs)) {
    return {
      puede: false,
      motivo: 'Fecha de inicio inválida.'
    };
  }

  const limiteCancelacionMs = inicioMs - VEINTICUATRO_HORAS_MS;
  if (ahoraMs >= limiteCancelacionMs) {
    return {
      puede: false,
      motivo: 'Solo se puede cancelar hasta 24 horas antes del inicio del préstamo.'
    };
  }

  return { puede: true };
}

@Service()
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly catalogoService = inject(CatalogoService);

  private readonly _reservas = signal<readonly Reserva[]>([]);
  private readonly _cargando = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly reservas = this._reservas.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activas = computed<readonly Reserva[]>(() =>
    this._reservas().filter((r) => r.estadoReserva === 'ACTIVA')
  );

  readonly finalizadas = computed<readonly Reserva[]>(() =>
    this._reservas().filter((r) => r.estadoReserva === 'FINALIZADA')
  );

  readonly canceladas = computed<readonly Reserva[]>(() =>
    this._reservas().filter((r) => r.estadoReserva === 'CANCELADA')
  );

  readonly conteoActivas = computed<number>(() => this.activas().length);

  readonly proximaEntrega = computed<string | null>(() => {
    const activasOrdenadas = [...this.activas()].sort((a, b) =>
      a.fechaEntrega.localeCompare(b.fechaEntrega)
    );
    return activasOrdenadas.length > 0 ? activasOrdenadas[0].fechaEntrega : null;
  });

  constructor() {
    effect(() => {
      const autenticado = this.authService.autenticado();
      if (autenticado) {
        this.cargarMisReservas();
      } else {
        this._reservas.set([]);
        this._error.set(null);
        this._cargando.set(false);
      }
    });
  }

  cargarMisReservas(): void {
    if (!this.authService.autenticado()) {
      this._reservas.set([]);
      return;
    }

    this._cargando.set(true);
    this._error.set(null);

    this.http.get<Reserva[]>(`${environment.apiUrl}/reservas/mis-reservas`).subscribe({
      next: (lista) => {
        this._reservas.set(lista ?? []);
        this._cargando.set(false);
      },
      error: (err: Partial<ApiError>) => {
        this._error.set(err?.mensaje || 'No se pudieron consultar tus préstamos.');
        this._cargando.set(false);
      }
    });
  }

  crearReserva(payload: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(`${environment.apiUrl}/reservas`, payload).pipe(
      tap(() => {
        this.cargarMisReservas();
        this.catalogoService.refrescar();
      })
    );
  }

  cancelarReserva(idReserva: number): Observable<Reserva> {
    return this.http
      .patch<Reserva>(`${environment.apiUrl}/reservas/${idReserva}/cancelar`, {})
      .pipe(
        tap(() => {
          this.cargarMisReservas();
          this.catalogoService.refrescar();
        })
      );
  }

  consultarDisponibilidad(idLibro: number, fechaHoraIso: string): Observable<Disponibilidad> {
    const params = new HttpParams().set('fechaHora', fechaHoraIso);
    return this.http.get<Disponibilidad>(
      `${environment.apiUrl}/libros/${idLibro}/disponibilidad`,
      { params }
    );
  }

  evaluarCancelacion(reserva: Reserva, ahoraMs: number = Date.now()): EvaluacionCancelacion {
    return puedeCancelarReserva(reserva, ahoraMs);
  }
}
