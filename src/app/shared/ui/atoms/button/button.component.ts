import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly pill = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  // Modern Output Signal
  readonly clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
