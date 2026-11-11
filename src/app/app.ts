import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { ButtonComponent } from './shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly themeService = inject(ThemeService);
}
