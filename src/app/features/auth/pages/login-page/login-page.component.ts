import {
  Component,
  ElementRef,
   computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { sanitizarReturnUrl } from '../../../../core/utils/return-url.util';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';

export type ModoAutenticacion = 'login' | 'registro';

export const passwordsCoincidenValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const pass = group.get('password')?.value ?? '';
  const confirm = group.get('confirmarPassword')?.value ?? '';
  if (!confirm) {
    return null;
  }
  return pass === confirm ? null : { passwordsNoCoinciden: true };
};

export function calcularFortalezaPassword(password: string): {
  nivel: 0 | 1 | 2 | 3;
  etiqueta: string;
} {
  if (!password) {
    return { nivel: 0, etiqueta: '' };
  }
  let puntos = 0;
  if (password.length >= 8) puntos += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) puntos += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) puntos += 1;

  if (puntos <= 1) return { nivel: 1, etiqueta: 'Básica' };
  if (puntos === 2) return { nivel: 2, etiqueta: 'Media' };
  return { nivel: 3, etiqueta: 'Fuerte' };
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Query parameters recibidos mediante withComponentInputBinding() */
  readonly modo = input<string | undefined>(undefined);
  readonly returnUrl = input<string | undefined>(undefined);

  readonly modoActivo = signal<ModoAutenticacion>('login');
  readonly mostrarPasswordLogin = signal<boolean>(false);
  readonly mostrarPasswordRegistro = signal<boolean>(false);
  readonly enviando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly passwordRegistroActual = signal<string>('');

  readonly fortalezaPassword = computed(() =>
    calcularFortalezaPassword(this.passwordRegistroActual())
  );

  readonly loginForm = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.maxLength(60)]]
  });

  readonly registroForm = this.fb.nonNullable.group(
    {
      documentoIdentidad: [
        '',
        [Validators.required, Validators.maxLength(20), Validators.pattern(/^\S+.*$/)]
      ],
      nombreCompleto: [
        '',
        [Validators.required, Validators.maxLength(150), Validators.pattern(/^\S+.*$/)]
      ],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(60)]
      ],
      confirmarPassword: ['', [Validators.required]]
    },
    { validators: passwordsCoincidenValidator }
  );

  constructor() {
    effect(() => {
      const paramModo = this.modo();
      const nuevoModo: ModoAutenticacion = paramModo === 'registro' ? 'registro' : 'login';
      this.modoActivo.set(nuevoModo);
      this.errorGeneral.set(null);
    });
  }

  cambiarModo(nuevoModo: ModoAutenticacion): void {
    if (this.modoActivo() === nuevoModo || this.enviando()) {
      return;
    }
    this.modoActivo.set(nuevoModo);
    this.errorGeneral.set(null);
    void this.router.navigate(['/login'], {
      queryParams: {
        modo: nuevoModo === 'registro' ? 'registro' : null,
        returnUrl: this.returnUrl() || null
      },
      replaceUrl: true
    });
  }

  onInputPasswordRegistro(event: Event): void {
    const val = (event.target as HTMLInputElement).value ?? '';
    this.passwordRegistroActual.set(val);
  }

  onSubmitLogin(): void {
    if (this.enviando()) {
      return;
    }
    this.errorGeneral.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.enfocarPrimerCampoInvalido();
      return;
    }

    const { correo, password } = this.loginForm.getRawValue();
    this.enviando.set(true);

    this.authService.login(correo, password).subscribe({
      next: () => {
        this.enviando.set(false);
        this.notifications.show(`Bienvenido, ${this.authService.nombre()}`, 'success');
        const destino = sanitizarReturnUrl(this.returnUrl());
        void this.router.navigateByUrl(destino);
      },
      error: (err: Partial<ApiError>) => {
        this.enviando.set(false);
        if (err?.status === 401) {
          this.errorGeneral.set('Correo o contraseña incorrectos.');
        } else {
          this.errorGeneral.set(
            err?.mensaje || 'No fue posible iniciar sesión. Intenta nuevamente.'
          );
        }
      }
    });
  }

  onSubmitRegistro(): void {
    if (this.enviando()) {
      return;
    }
    this.errorGeneral.set(null);

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      this.enfocarPrimerCampoInvalido();
      return;
    }

    const valores = this.registroForm.getRawValue();
    this.enviando.set(true);

    this.authService
      .registrar({
        documentoIdentidad: valores.documentoIdentidad,
        nombreCompleto: valores.nombreCompleto,
        correo: valores.correo,
        password: valores.password
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.notifications.show(
            `Cuenta creada exitosamente. ¡Bienvenido, ${this.authService.nombre()}!`,
            'success'
          );
          const destino = sanitizarReturnUrl(this.returnUrl());
          void this.router.navigateByUrl(destino);
        },
        error: (err: Partial<ApiError>) => {
          this.enviando.set(false);
          this.mapearErroresRegistro(err);
        }
      });
  }

  private mapearErroresRegistro(err: Partial<ApiError>): void {
    let asignadoACampo = false;

    if (err?.detalles) {
      for (const [campo, mensaje] of Object.entries(err.detalles)) {
        const control = this.registroForm.get(campo);
        if (control) {
          control.setErrors({ servidor: mensaje });
          control.markAsTouched();
          asignadoACampo = true;
        }
      }
    }

    const msg = err?.mensaje || '';
    const msgLower = msg.toLowerCase();

    if (msgLower.includes('correo')) {
      const ctrlCorreo = this.registroForm.controls.correo;
      ctrlCorreo.setErrors({ servidor: msg });
      ctrlCorreo.markAsTouched();
      asignadoACampo = true;
    }

    if (msgLower.includes('documento')) {
      const ctrlDoc = this.registroForm.controls.documentoIdentidad;
      ctrlDoc.setErrors({ servidor: msg });
      ctrlDoc.markAsTouched();
      asignadoACampo = true;
    }

    if (!asignadoACampo) {
      this.errorGeneral.set(msg || 'No fue posible completar el registro.');
    } else {
      this.enfocarPrimerCampoInvalido();
    }
  }

  private enfocarPrimerCampoInvalido(): void {
    setTimeout(() => {
      const invalido = this.hostEl.nativeElement.querySelector<HTMLElement>(
        'input.ng-invalid, select.ng-invalid'
      );
      invalido?.focus();
    }, 10);
  }
}
