import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibraryService } from '../../../../core/services/library.service';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-loan-drawer',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './loan-drawer.component.html',
  styleUrl: './loan-drawer.component.scss'
})
export class LoanDrawerComponent {
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);

  readonly isOpen = this.libraryService.isDrawerOpen;
  readonly borrowedBooks = this.libraryService.borrowedBooks;
  readonly totalCount = this.libraryService.totalLoansCount;

  close(): void {
    this.libraryService.closeDrawer();
  }

  returnBook(id: string): void {
    this.libraryService.returnBook(id);
  }

  returnAll(): void {
    this.libraryService.returnAllBooks();
  }

  goToBook(id: string): void {
    this.close();
    this.router.navigate(['/book', id]);
  }
}
