import { Component, computed, input, output } from '@angular/core';
import { Book } from '../../../../core/models/book.model';
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
  readonly book = input.required<Book>();
  readonly isBorrowed = input<boolean>(false);

  // Modern Output Signals
  readonly borrow = output<string>();
  readonly returnBook = output<string>();
  readonly viewDetails = output<string>();

  // Computed availability indicator
  readonly availabilityStatus = computed(() => {
    if (this.isBorrowed()) {
      return { text: 'En tu posesión', class: 'status--borrowed' };
    }
    const copies = this.book().availableCopies;
    if (copies > 0) {
      return { text: `${copies} disponibles`, class: 'status--available' };
    }
    return { text: 'Sin copias', class: 'status--unavailable' };
  });

  onBorrow(): void {
    this.borrow.emit(this.book().id);
  }

  onReturn(): void {
    this.returnBook.emit(this.book().id);
  }

  onSelect(): void {
    this.viewDetails.emit(this.book().id);
  }
}
