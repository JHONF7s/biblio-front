import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-chip',
  standalone: true,
  templateUrl: './stat-chip.component.html',
  styleUrl: './stat-chip.component.scss'
})
export class StatChipComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly variant = input<'primary' | 'success' | 'warning' | 'neutral'>('neutral');
}
