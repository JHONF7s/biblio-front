import { Component, computed, input, output } from '@angular/core';
import { LibroCatalogo } from '../../../../core/models/libro.model';
import { EstiloPortadaLibro, generarEstiloPortada } from '../../../../core/utils/portada';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent],
  templateUrl: './book-card.component.html',
  styleUrl: './book-card.component.scss'
})
export class BookCardComponent {
  readonly libro = input.required<LibroCatalogo>();
  readonly esFavorito = input<boolean>(false);

  readonly pedirPrestado = output<LibroCatalogo>();
  readonly verDetalles = output<number>();
  readonly alternarFavorito = output<number>();

  readonly portada = computed<EstiloPortadaLibro>(() =>
    generarEstiloPortada(this.libro().idGenero, this.libro().titulo)
  );

  readonly nombresAutores = computed<string>(() => {
    const lista = this.libro().autores;
    if (!lista || lista.length === 0) {
      return 'Autor institucional';
    }
    return lista.map((a) => a.nombreAutor).join(', ');
  });

  readonly estadoDisponibilidad = computed<{
    texto: string;
    clase: string;
    disponible: boolean;
  }>(() => {
    const disp = this.libro().ejemplaresDisponibles;
    const total = this.libro().totalEjemplares;
    if (disp > 0) {
      return {
        texto:
          disp === 1
            ? `1 disponible ahora (de ${total})`
            : `${disp} disponibles ahora (de ${total})`,
        clase: 'status--available',
        disponible: true
      };
    }
    return {
      texto: 'Sin copias disponibles ahora',
      clase: 'status--unavailable',
      disponible: false
    };
  });

  onPedirPrestado(): void {
    this.pedirPrestado.emit(this.libro());
  }

  onVerDetalles(): void {
    this.verDetalles.emit(this.libro().idLibro);
  }

  onAlternarFavorito(event: MouseEvent): void {
    event.stopPropagation();
    this.alternarFavorito.emit(this.libro().idLibro);
  }
}
