import { Injectable, computed, inject, signal } from '@angular/core';
import { Book, BookCategory } from '../models/book.model';
import { NotificationService } from './notification.service';

const INITIAL_BOOKS: Book[] = [
  {
    id: 'clean-code',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    category: 'Technology',
    year: 2008,
    isbn: '978-0132350884',
    pages: 464,
    rating: 4.7,
    availableCopies: 3,
    description: 'Incluso el mal código puede funcionar. Pero si el código no está limpio, puede poner de rodillas a una empresa de desarrollo. Una guía de referencia para escribir software mantenible y elegante.',
    coverGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
  },
  {
    id: 'pragmatic-programmer',
    title: 'The Pragmatic Programmer: Your Journey to Mastery',
    author: 'David Thomas, Andrew Hunt',
    category: 'Technology',
    year: 2019,
    isbn: '978-0135957059',
    pages: 352,
    rating: 4.9,
    availableCopies: 2,
    description: 'Uno de los libros de programación más influyentes de todos los tiempos. Examina las mejores prácticas y las principales trampas del desarrollo de software moderno.',
    coverGradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)'
  },
  {
    id: 'sapiens',
    title: 'Sapiens: De animales a dioses',
    author: 'Yuval Noah Harari',
    category: 'History',
    year: 2014,
    isbn: '978-8499926223',
    pages: 496,
    rating: 4.8,
    availableCopies: 4,
    description: 'Un recorrido apasionante por la historia de nuestra especie, desde los primeros homínidos hasta las revoluciones cognitiva, agrícola y científica.',
    coverGradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)'
  },
  {
    id: 'dune',
    title: 'Dune',
    author: 'Frank Herbert',
    category: 'Fiction',
    year: 1965,
    isbn: '978-0441172719',
    pages: 688,
    rating: 4.8,
    availableCopies: 5,
    description: 'Ambientada en el desértico planeta Arrakis, Dune es la historia del joven Paul Atreides mientras navega por intrigas políticas, religión y el control de la especia Melange.',
    coverGradient: 'linear-gradient(135deg, #831843 0%, #ec4899 100%)'
  },
  {
    id: 'cosmos',
    title: 'Cosmos',
    author: 'Carl Sagan',
    category: 'Science',
    year: 1980,
    isbn: '978-0345331359',
    pages: 365,
    rating: 4.9,
    availableCopies: 1,
    description: 'El clásico de Carl Sagan que explora los 15 mil millones de años de evolución cósmica que transformaron la materia en conciencia.',
    coverGradient: 'linear-gradient(135deg, #312e81 0%, #8b5cf6 100%)'
  },
  {
    id: 'meditations',
    title: 'Meditaciones',
    author: 'Marco Aurelio',
    category: 'Philosophy',
    year: 180,
    isbn: '978-8424937072',
    pages: 208,
    rating: 4.8,
    availableCopies: 4,
    description: 'Reflexiones íntimas del emperador filósofo romano sobre la autodisciplina, la ética estoica, la impermanencia y la serenidad mental.',
    coverGradient: 'linear-gradient(135deg, #374151 0%, #9ca3af 100%)'
  }
];

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private readonly notificationService = inject(NotificationService);

  // Core Reactive State with Signals
  private readonly _books = signal<Book[]>(INITIAL_BOOKS);
  private readonly _borrowedBookIds = signal<string[]>([]);
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedCategory = signal<string>('All');
  private readonly _isDrawerOpen = signal<boolean>(false);

  // Read-only Exposed Signals
  readonly books = this._books.asReadonly();
  readonly borrowedBookIds = this._borrowedBookIds.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly isDrawerOpen = this._isDrawerOpen.asReadonly();

  // Computed Derived Signals
  readonly categories = computed(() => {
    const list = this._books();
    const unique = Array.from(new Set(list.map((b) => b.category)));
    return ['All', ...unique];
  });

  readonly borrowedBooks = computed(() => {
    const ids = new Set(this._borrowedBookIds());
    return this._books().filter((b) => ids.has(b.id));
  });

  readonly totalLoansCount = computed(() => this._borrowedBookIds().length);

  readonly filteredBooks = computed(() => {
    const query = this._searchQuery().trim().toLowerCase();
    const cat = this._selectedCategory();
    const all = this._books();

    return all.filter((book) => {
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.includes(query);

      const matchesCat = cat === 'All' || book.category === cat;

      return matchesSearch && matchesCat;
    });
  });

  readonly libraryStats = computed(() => {
    const totalTitles = this._books().length;
    const activeLoans = this._borrowedBookIds().length;
    const totalAvailableCopies = this._books().reduce(
      (acc, b) => acc + (b.availableCopies > 0 ? b.availableCopies : 0),
      0
    );

    return {
      totalTitles,
      activeLoans,
      totalAvailableCopies
    };
  });

  // State Mutators
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setSelectedCategory(category: string): void {
    this._selectedCategory.set(category);
  }

  toggleDrawer(): void {
    this._isDrawerOpen.update((open) => !open);
  }

  openDrawer(): void {
    this._isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this._isDrawerOpen.set(false);
  }

  isBookBorrowed(bookId: string): boolean {
    return this._borrowedBookIds().includes(bookId);
  }

  getBookById(id: string): Book | undefined {
    return this._books().find((b) => b.id === id);
  }

  borrowBook(bookId: string): boolean {
    const book = this.getBookById(bookId);
    if (!book) return false;

    if (this._borrowedBookIds().includes(bookId)) {
      this.notificationService.show(`Ya tienes prestado "${book.title}"`, 'warning');
      return false;
    }

    if (book.availableCopies <= 0) {
      this.notificationService.show(`No hay copias disponibles de "${book.title}"`, 'error');
      return false;
    }

    // Decrement available copies in book list & add to borrowed ids
    this._books.update((books) =>
      books.map((b) =>
        b.id === bookId ? { ...b, availableCopies: b.availableCopies - 1 } : b
      )
    );

    this._borrowedBookIds.update((ids) => [...ids, bookId]);
    this.notificationService.show(`¡Has pedido prestado "${book.title}" con éxito!`, 'success');
    return true;
  }

  returnBook(bookId: string): boolean {
    const book = this.getBookById(bookId);
    if (!book || !this._borrowedBookIds().includes(bookId)) return false;

    // Increment available copies & remove from borrowed ids
    this._books.update((books) =>
      books.map((b) =>
        b.id === bookId ? { ...b, availableCopies: b.availableCopies + 1 } : b
      )
    );

    this._borrowedBookIds.update((ids) => ids.filter((id) => id !== bookId));
    this.notificationService.show(`Has devuelto "${book.title}". Gracias.`, 'info');
    return true;
  }

  returnAllBooks(): void {
    const borrowed = this._borrowedBookIds();
    if (borrowed.length === 0) return;

    const idsSet = new Set(borrowed);
    this._books.update((books) =>
      books.map((b) =>
        idsSet.has(b.id) ? { ...b, availableCopies: b.availableCopies + 1 } : b
      )
    );

    this._borrowedBookIds.set([]);
    this.notificationService.show('Se han devuelto todos los libros en préstamo.', 'info');
  }
}
