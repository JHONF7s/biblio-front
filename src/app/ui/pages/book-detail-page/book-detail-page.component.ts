import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LibraryService } from '../../../core/services/library.service';
import { MainLayoutComponent } from '../../templates/main-layout/main-layout.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-book-detail-page',
  standalone: true,
  imports: [MainLayoutComponent, BadgeComponent, ButtonComponent, RouterLink],
  templateUrl: './book-detail-page.component.html',
  styleUrl: './book-detail-page.component.scss'
})
export class BookDetailPageComponent {
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);

  // Modern Route Parameter Binding via Signal Input!
  readonly id = input.required<string>();

  // Derived Reactive Signals
  readonly book = computed(() => this.libraryService.getBookById(this.id()));
  readonly isBorrowed = computed(() => this.libraryService.isBookBorrowed(this.id()));

  onBorrow(bookId: string): void {
    this.libraryService.borrowBook(bookId);
  }

  onReturn(bookId: string): void {
    this.libraryService.returnBook(bookId);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
