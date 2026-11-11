import { Component, input, output, signal } from '@angular/core';
import { InputComponent } from '../../atoms/input/input.component';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [InputComponent, ButtonComponent],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  readonly placeholder = input<string>('Buscar por título, autor o ISBN...');
  readonly initialValue = input<string>('');

  // Two communication channels: realtime change and submit
  readonly queryChange = output<string>();
  readonly searchSubmit = output<string>();

  // Local state signal synchronized with parent/atom
  readonly currentTerm = signal<string>('');

  ngOnInit(): void {
    if (this.initialValue()) {
      this.currentTerm.set(this.initialValue());
    }
  }

  onTermChange(newVal: string): void {
    this.currentTerm.set(newVal);
    this.queryChange.emit(newVal);
  }

  onSearchSubmit(): void {
    this.searchSubmit.emit(this.currentTerm());
  }
}
