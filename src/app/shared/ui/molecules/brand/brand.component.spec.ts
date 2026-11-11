import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import {
  calcularFortalezaPassword,
  passwordsCoincidenValidator
} from '../../../../features/auth/pages/login-page/login-page.component';
import { BrandComponent } from './brand.component';

describe('BrandComponent (F-14 / R4) & Validadores de Auth (F-24)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandComponent]
    }).compileComponents();
  });

  it('BrandComponent está deshabilitado en "/" (enInicio=true): aria-disabled="true" y no emite navegarInicio', () => {
    const fixture = TestBed.createComponent(BrandComponent);
    fixture.componentRef.setInput('enInicio', true);
    fixture.detectChanges();

    let emitido = false;
    fixture.componentInstance.navegarInicio.subscribe(() => {
      emitido = true;
    });

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
    expect(anchor.getAttribute('aria-current')).toBe('page');

    anchor.click();
    expect(emitido).toBe(false);
  });

  it('BrandComponent emite navegarInicio cuando enInicio=false', () => {
    const fixture = TestBed.createComponent(BrandComponent);
    fixture.componentRef.setInput('enInicio', false);
    fixture.detectChanges();

    let emitido = false;
    fixture.componentInstance.navegarInicio.subscribe(() => {
      emitido = true;
    });

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('aria-disabled')).toBeNull();

    anchor.click();
    expect(emitido).toBe(true);
  });

  it('passwordsCoincidenValidator y calcularFortalezaPassword validan contraseñas de registro', () => {
    const grupoInvalido = new FormGroup(
      {
        password: new FormControl('Lectura2026*'),
        confirmarPassword: new FormControl('OtraClave123*')
      },
      { validators: passwordsCoincidenValidator }
    );
    expect(grupoInvalido.errors).toEqual({ passwordsNoCoinciden: true });

    const grupoValido = new FormGroup(
      {
        password: new FormControl('Lectura2026*'),
        confirmarPassword: new FormControl('Lectura2026*')
      },
      { validators: passwordsCoincidenValidator }
    );
    expect(grupoValido.errors).toBeNull();

    expect(calcularFortalezaPassword('').nivel).toBe(0);
    expect(calcularFortalezaPassword('abcdefgh').nivel).toBe(1);
    expect(calcularFortalezaPassword('Abcdefgh').nivel).toBe(2);
    expect(calcularFortalezaPassword('Lectura2026*').nivel).toBe(3);
  });
});
