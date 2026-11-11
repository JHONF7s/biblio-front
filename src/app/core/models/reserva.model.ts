export type EstadoReserva = 'ACTIVA' | 'FINALIZADA' | 'CANCELADA';

export interface Reserva {
  readonly idReserva: number;
  readonly idUsuario: number;
  readonly nombreUsuario: string;
  readonly idEjemplar: number;
  readonly idLibro: number;
  readonly tituloLibro: string;
  readonly fechaSolicitud: string;
  readonly fechaInicio: string;
  readonly fechaEntrega: string;
  readonly estadoReserva: EstadoReserva;
}

export interface ReservaCreate {
  readonly idLibro: number;
  readonly fechaInicio: string;
  readonly fechaEntrega: string;
}
