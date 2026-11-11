import { Component, input, output } from '@angular/core';
import { SITE_CONFIG } from '../../../../core/config/site.config';

@Component({
  selector: 'app-brand',
  standalone: true,
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.scss'
})
export class BrandComponent {
  readonly enInicio = input<boolean>(false);
  readonly variante = input<'header' | 'footer'>('header');

  readonly navegarInicio = output<void>();

  readonly config = SITE_CONFIG;

  onClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.enInicio()) {
      return;
    }
    this.navegarInicio.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.enInicio()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navegarInicio.emit();
    }
  }
}
