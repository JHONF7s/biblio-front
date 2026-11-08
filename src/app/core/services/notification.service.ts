import { Injectable, signal } from '@angular/core';
import { NotificationMessage } from '../models/book.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly _activeNotification = signal<NotificationMessage | null>(null);
  private timeoutId: any = null;

  // Read-only signal exposure for consumers (encapsulation)
  readonly activeNotification = this._activeNotification.asReadonly();

  show(text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', durationMs = 3500): void {
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
