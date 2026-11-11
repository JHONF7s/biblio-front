import { Location } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LibroCatalogo } from '../../../../core/models/libro.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { FavoritosService } from '../../../../core/services/favoritos.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UiStateService } from '../../../../core/services/ui-state.service';
import { generarEstiloPortada } from '../../../../core/utils/portada';
import { BadgeComponent } from '../../../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-book-detail-page',
  standalone: true,
  imports: [RouterLink, BadgeComponent, ButtonComponent],
  templateUrl: './book-detail-page.component.html',
  styleUrl: './book-detail-page.component.scss'
})
export class BookDetailPageComponent {
  private readonly catalogoService = inject(CatalogoService);
  readonly favoritosService = inject(FavoritosService);
  private readonly authService = inject(AuthService);
  private readonly uiState = inject(UiStateService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly id = input.required<number, unknown>({ transform: numberAttribute });

  readonly libroRemoto = signal<LibroCatalogo | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly noEncontrado = signal<boolean>(false);

  readonly libro = computed<LibroCatalogo | null>(() => {
    const idActual = this.id();
    if (Number.isNaN(idActual) || idActual <= 0) {
      return null;
    }
    const enLista = this.catalogoService
      .libros()
      .find((item) => item.idLibro === idActual);
    return this.libroRemoto() ?? enLista ?? null;
  });

  readonly portada = computed(() => {
    const l = this.libro();
    if (!l) {
      return generarEstiloPortada(1, 'LB');
    }
    return generarEstiloPortada(l.idGenero, l.titulo);
  });

  readonly nombresAutores = computed<string>(() => {
    const l = this.libro();
    if (!l || l.autores.length === 0) {
      return 'Autor institucional';
    }
    return l.autores.map((a) => a.nombreAutor).join(', ');
  });

  readonly esFavorito = computed<boolean>(() => {
    const l = this.libro();
    return l ? this.favoritosService.esFavorito(l.idLibro) : false;
  });

  constructor() {
    effect(() => {
      const idLibro = this.id();
      if (Number.isNaN(idLibro) || idLibro <= 0) {
        this.cargando.set(false);
        this.noEncontrado.set(true);
        this.libroRemoto.set(null);
        return;
      }

      this.cargando.set(true);
      this.noEncontrado.set(false);

      this.catalogoService.obtenerPorId(idLibro).subscribe({
        next: (data) => {
          this.libroRemoto.set(data);
          this.cargando.set(false);
          this.noEncontrado.set(false);
        },
        error: () => {
          this.libroRemoto.set(null);
          this.cargando.set(false);
          this.noEncontrado.set(true);
        }
      });
    });
  }

  onPedirPrestado(): void {
    const actual = this.libro();
    if (!actual) {
      return;
    }

    if (!this.authService.verificarSesionActiva()) {
      this.notifications.show(
        'Inicia sesión para reservar un ejemplar de este libro.',
        'info'
      );
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/catalog/${actual.idLibro}` }
      });
      return;
    }

    this.uiState.abrirModalReserva(actual);
  }

  onAlternarFavorito(): void {
    const actual = this.libro();
    if (!actual) {
      return;
    }
    const agregado = this.favoritosService.alternarFavorito(actual.idLibro);
    this.notifications.show(
      agregado ? 'Libro guardado en tus favoritos.' : 'Libro eliminado de tus favoritos.',
      'info',
      2200
    );
  }

  volverAlCatalogo(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/catalog']);
    }
  }
}
