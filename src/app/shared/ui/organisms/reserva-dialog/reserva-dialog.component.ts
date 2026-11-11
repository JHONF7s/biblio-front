import {
  Component,
  HostListener,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Disponibilidad, LibroCatalogo } from '../../../../core/models/libro.model';
import { ReservaCreate } from '../../../../core/models/reserva.model';
import { ButtonComponent } from '../../atoms/button/button.component';

export function formatearFechaIsoLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = fecha.getFullYear();
  const mm = pad(fecha.getMonth() + 1);
  const dd = pad(fecha.getDate());
  const hh = pad(fecha.getHours());
  const min = pad(fecha.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
}

export function normalizarDatetimeLocalAIso(valorInput: string): string {
  const limpio = valorInput.trim();
  if (!limpio) {
    return '';
  }
  // Si viene como YYYY-MM-DDTHH:mm (16 chars), agregar :00
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(limpio)) {
    return `${limpio}:00`;
  }
  // Si ya trae segundos YYYY-MM-DDTHH:mm:ss, quitar cualquier sufijo de zona
  return limpio.replace(/(\.\d+)?(Z|[+-]\d{2}:\d{2})$/, '');
}

@Component({
  selector: 'app-reserva-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './reserva-dialog.component.html',
  styleUrl: './reserva-dialog.component.scss'
})
export class ReservaDialogComponent implements OnChanges, OnDestroy {
  readonly libro = input<LibroCatalogo | null>(null);
  readonly enviando = input<boolean>(false);
  readonly errorServidor = input<string | null>(null);
  readonly disponibilidad = input<Disponibilidad | null>(null);
  readonly consultandoDisponibilidad = input<boolean>(false);

  readonly cerrar = output<void>();
  readonly confirmar = output<ReservaCreate>();
  readonly consultarDisponibilidad = output<{ idLibro: number; fechaHora: string }>();

  readonly fechaInicio = signal<string>('');
  readonly fechaEntrega = signal<string>('');
  readonly intentadoEnviar = signal<boolean>(false);

  private disponibilidadTimer: ReturnType<typeof setTimeout> | null = null;

  readonly errorValidacion = computed<string | null>(() => {
    const inicioStr = this.fechaInicio();
    const entregaStr = this.fechaEntrega();

    if (!inicioStr || !entregaStr) {
      return 'Debes seleccionar tanto la fecha de inicio como la fecha de entrega.';
    }

    const inicioMs = new Date(inicioStr).getTime();
    const entregaMs = new Date(entregaStr).getTime();
    const ahoraMs = Date.now();

    if (Number.isNaN(inicioMs) || Number.isNaN(entregaMs)) {
      return 'El formato de las fechas seleccionadas no es válido.';
    }

    if (inicioMs <= ahoraMs) {
      return 'La fecha y hora de inicio debe ser estrictamente futura.';
    }

    if (entregaMs <= inicioMs) {
      return 'La fecha de entrega debe ser posterior a la fecha de inicio.';
    }

    return null;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['libro']) {
      const actual = this.libro();
      if (actual) {
        this.inicializarFechasPorDefecto(actual.idLibro);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.disponibilidadTimer !== null) {
      clearTimeout(this.disponibilidadTimer);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.libro() && !this.enviando()) {
      this.cerrar.emit();
    }
  }

  onCambioFechaInicio(valor: string): void {
    this.fechaInicio.set(valor);
    this.programarConsultaDisponibilidad();
  }

  onCambioFechaEntrega(valor: string): void {
    this.fechaEntrega.set(valor);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.intentadoEnviar.set(true);

    const actual = this.libro();
    if (!actual || this.enviando() || this.errorValidacion()) {
      return;
    }

    const payload: ReservaCreate = {
      idLibro: actual.idLibro,
      fechaInicio: normalizarDatetimeLocalAIso(this.fechaInicio()),
      fechaEntrega: normalizarDatetimeLocalAIso(this.fechaEntrega())
    };

    this.confirmar.emit(payload);
  }

  private inicializarFechasPorDefecto(idLibro: number): void {
    this.intentadoEnviar.set(false);
    const ahora = new Date();
    // Por defecto: inicio en +26 horas (permite cancelar con >24h de antelación) y entrega en +4 días
    const inicio = new Date(ahora.getTime() + 26 * 60 * 60 * 1000);
    inicio.setMinutes(0, 0, 0);

    const entrega = new Date(inicio.getTime() + 3 * 24 * 60 * 60 * 1000);

    const toInputFormat = (d: Date) => formatearFechaIsoLocal(d).slice(0, 16);
    this.fechaInicio.set(toInputFormat(inicio));
    this.fechaEntrega.set(toInputFormat(entrega));

    this.consultarDisponibilidad.emit({
      idLibro,
      fechaHora: formatearFechaIsoLocal(inicio)
    });
  }

  private programarConsultaDisponibilidad(): void {
    if (this.disponibilidadTimer !== null) {
      clearTimeout(this.disponibilidadTimer);
    }

    const actual = this.libro();
    const inicioStr = this.fechaInicio();
    if (!actual || !inicioStr) {
      return;
    }

    const inicioMs = new Date(inicioStr).getTime();
    if (Number.isNaN(inicioMs) || inicioMs <= Date.now()) {
      return;
    }

    this.disponibilidadTimer = setTimeout(() => {
      this.consultarDisponibilidad.emit({
        idLibro: actual.idLibro,
        fechaHora: normalizarDatetimeLocalAIso(inicioStr)
      });
    }, 250);
  }
}
