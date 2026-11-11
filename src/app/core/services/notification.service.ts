import { Service, signal } from '@angular/core';
import { NotificationMessage, TipoNotificacion } from '../models/notificacion.model';

@Service()
export class NotificationService {
  private readonly _activeNotification = signal<NotificationMessage | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly activeNotification = this._activeNotification.asReadonly();

  show(text: string, type: TipoNotificacion = 'info', durationMs = 3500): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this._activeNotification.set({
      id: Math.random().toString(36).substring(2, 9),
      type,
      text
    });

    this.timeoutId = setTimeout(() => {
      this.clear();
    }, durationMs);
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._activeNotification.set(null);
  }
}
