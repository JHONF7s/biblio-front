export type TipoNotificacion = 'success' | 'info' | 'warning' | 'error';

export interface NotificationMessage {
  readonly id: string;
  readonly type: TipoNotificacion;
  readonly text: string;
}
