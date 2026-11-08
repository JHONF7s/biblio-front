import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly roluter = inject(Router);
  private readonly _isAuthenticated = signal<boolean>(this.hasToken());
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private hasToken() {
    return !!localStorage.getItem('auth_token');
  }

  login(email: string, pass: string): boolean {
    if (email === "jhonf5202@gmail.com" && pass === "barto123") {
      this._isAuthenticated.set(true);
      localStorage.setItem('auth_token', 'token_token')
      return true;
    }
    return false;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this._isAuthenticated.set(false);
    this.roluter.navigate(['/login']);
  }
}
