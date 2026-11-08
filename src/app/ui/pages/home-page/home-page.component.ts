import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibraryService } from '../../../core/services/library.service';
import { MainLayoutComponent } from '../../templates/main-layout/main-layout.component';
import { SearchBarComponent } from '../../molecules/search-bar/search-bar.component';
import { StatChipComponent } from '../../molecules/stat-chip/stat-chip.component';
import { BookGridComponent } from '../../organisms/book-grid/book-grid.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    MainLayoutComponent,
    SearchBarComponent,
    StatChipComponent,
    BookGridComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);

  // Directly bind Signals from LibraryService (Zero boilerplate reactivity!)
  readonly books = this.libraryService.filteredBooks;
  readonly borrowedIds = this.libraryService.borrowedBookIds;
  readonly categories = this.libraryService.categories;
  readonly selectedCategory = this.libraryService.selectedCategory;
  readonly searchQuery = this.libraryService.searchQuery;
  readonly stats = this.libraryService.libraryStats;

  onSearchChange(term: string): void {
    this.libraryService.setSearchQuery(term);
  }

  onSearchSubmit(term: string): void {
    this.libraryService.setSearchQuery(term);
  }

  onSelectCategory(category: string): void {
    this.libraryService.setSelectedCategory(category);
  }

  onBorrowBook(bookId: string): void {
    this.libraryService.borrowBook(bookId);
  }

  onReturnBook(bookId: string): void {
    this.libraryService.returnBook(bookId);
  }

  onViewBookDetail(bookId: string): void {
    this.router.navigate(['/book', bookId]);
  }

  onResetFilters(): void {
    this.libraryService.setSearchQuery('');
    this.libraryService.setSelectedCategory('All');
  }
}
