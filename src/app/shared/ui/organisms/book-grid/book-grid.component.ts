import { Component, input, output } from '@angular/core';
import { LibroCatalogo } from '../../../../core/models/libro.model';
import { ButtonComponent } from '../../atoms/button/button.component';
import { BookCardComponent } from '../../molecules/book-card/book-card.component';

@Component({
  selector: 'app-book-grid',
  standalone: true,
  imports: [BookCardComponent, ButtonComponent],
  templateUrl: './book-grid.component.html',
  styleUrl: './book-grid.component.scss'
})
export class BookGridComponent {
  readonly libros = input.required<readonly LibroCatalogo[]>();
  readonly favoritosIds = input<readonly number[]>([]);
  readonly tituloVacio = input<string>('No encontramos libros con esos filtros');
  readonly descripcionVacia = input<string>(
    'Prueba limpiando los filtros activos o buscando con otros términos.'
  );
  readonly textoAccionVacia = input<string>('Limpiar filtros');

  readonly pedirPrestado = output<LibroCatalogo>();
  readonly verDetalles = output<number>();
  readonly alternarFavorito = output<number>();
  readonly limpiarFiltros = output<void>();

  esFavorito(idLibro: number): boolean {
    return this.favoritosIds().includes(idLibro);
  }
}
