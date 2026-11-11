import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  private readonly notificationService = inject(NotificationService);

  readonly notif = this.notificationService.activeNotification;

  close(): void {
    this.notificationService.clear();
  }
}
