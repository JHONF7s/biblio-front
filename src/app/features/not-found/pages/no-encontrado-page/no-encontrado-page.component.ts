import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrado-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './no-encontrado-page.component.html',
  styleUrl: './no-encontrado-page.component.scss'
})
export class NoEncontradoPageComponent {
  private readonly router = inject(Router);

  readonly rutaSolicitada = computed<string>(() => this.router.url || '/');
}
