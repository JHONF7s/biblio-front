import { FormsModule } from "@angular/forms";
import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);


  onLogin() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const success = this.authService.login(this.email(), this.password());
    if (success) {
      this.router.navigate(['/home']);
    } else {
      this.errorMessage.set("Credenciales incorrectas");
      this.isLoading.set(false);
    }
  }
}

