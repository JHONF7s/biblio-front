import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LibroCatalogo } from '../../../../core/models/libro.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { FavoritosService } from '../../../../core/services/favoritos.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReservasService } from '../../../../core/services/reservas.service';
import { UiStateService } from '../../../../core/services/ui-state.service';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { StatChipComponent } from '../../../../shared/ui/molecules/stat-chip/stat-chip.component';
import { BookGridComponent } from '../../../../shared/ui/organisms/book-grid/book-grid.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, ButtonComponent, StatChipComponent, BookGridComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly catalogoService = inject(CatalogoService);
  readonly reservasService = inject(ReservasService);
  readonly favoritosService = inject(FavoritosService);
  private readonly uiState = inject(UiStateService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.catalogoService.cargarSiNecesario();
  }

  onExplorarGenero(idGenero: number): void {
    void this.router.navigate(['/catalog'], {
      queryParams: { generos: String(idGenero) }
    });
  }

  onVerDetalleLibro(idLibro: number): void {
    void this.router.navigate(['/catalog', idLibro]);
  }

  onPedirPrestado(libro: LibroCatalogo): void {
    if (!this.authService.verificarSesionActiva()) {
      this.notifications.show(
        'Inicia sesión o crea tu cuenta para reservar este libro.',
        'info'
      );
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/catalog/${libro.idLibro}` }
      });
      return;
    }

    this.uiState.abrirModalReserva(libro);
  }

  onAlternarFavorito(idLibro: number): void {
    const agregado = this.favoritosService.alternarFavorito(idLibro);
    this.notifications.show(
      agregado ? 'Libro guardado en tus favoritos.' : 'Libro eliminado de tus favoritos.',
      'info',
      2200
    );
  }

  irACatalogoCompleto(): void {
    void this.router.navigate(['/catalog']);
  }
}
