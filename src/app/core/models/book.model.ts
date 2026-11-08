export type BookCategory = 'Fiction' | 'Science' | 'Technology' | 'Philosophy' | 'History';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  year: number;
  isbn: string;
  pages: number;
  rating: number;
  availableCopies: number;
  description: string;
  coverGradient: string;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}
