import { Component, input, output } from '@angular/core';
import { Book } from '../../../../core/models/book.model';
import { BookCardComponent } from '../../molecules/book-card/book-card.component';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-book-grid',
  standalone: true,
  imports: [BookCardComponent, ButtonComponent],
  templateUrl: './book-grid.component.html',
  styleUrl: './book-grid.component.scss'
})
export class BookGridComponent {
  readonly books = input.required<Book[]>();
  readonly borrowedIds = input<string[]>([]);

  // Signals for communication with parent page
  readonly borrow = output<string>();
  readonly returnBook = output<string>();
  readonly selectBook = output<string>();
  readonly resetFilters = output<void>();

  isBorrowed(bookId: string): boolean {
    return this.borrowedIds().includes(bookId);
  }

  onBorrow(id: string): void {
    this.borrow.emit(id);
  }

  onReturn(id: string): void {
    this.returnBook.emit(id);
  }

  onSelect(id: string): void {
    this.selectBook.emit(id);
  }
}
