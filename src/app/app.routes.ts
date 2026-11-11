import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'

  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then((m) => m.HomePageComponent)

  },
  {
    path: 'book/:id',
    loadComponent: () =>
      import('./features/catalog/pages/book-detail-page/book-detail-page.component').then(
        (m) => m.BookDetailPageComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
