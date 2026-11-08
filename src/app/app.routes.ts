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
      import('./ui/pages/login-page/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./ui/pages/home-page/home-page.component').then((m) => m.HomePageComponent)

  },
  {
    path: 'book/:id',
    loadComponent: () =>
      import('./ui/pages/book-detail-page/book-detail-page.component').then(
        (m) => m.BookDetailPageComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
