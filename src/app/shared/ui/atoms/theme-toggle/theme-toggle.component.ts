import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);

  readonly etiquetaAccesible = computed<string>(() =>
    this.themeService.isDarkMode() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
  );

  readonly estiloDesplazamiento = computed<string>(
    () => `${this.themeService.desplazamientoCremaPx()}px`
  );

  alternar(): void {
    this.themeService.toggleTheme();
  }
}
