import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  // Modern Two-Way Signal Model Binding
  readonly value = model<string>('');

  readonly placeholder = input<string>('Buscar...');
  readonly type = input<string>('text');
  readonly clearable = input<boolean>(true);

  isFocused = false;

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }

  clear(): void {
    this.value.set('');
  }
}
