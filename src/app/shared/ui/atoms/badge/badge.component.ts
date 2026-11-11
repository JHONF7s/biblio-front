import { Component, input } from '@angular/core';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss'
})
export class BadgeComponent {
  readonly text = input.required<string>();
  readonly variant = input<BadgeVariant>('neutral');
  readonly pill = input<boolean>(false);
}
