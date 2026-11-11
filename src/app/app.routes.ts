import { Routes } from '@angular/router';
import { authGuard, authMatchGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { MainLayoutComponent } from './shared/ui/templates/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Inicio · BiblioTech',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent
          )
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        title: 'Iniciar sesión · BiblioTech',
        loadComponent: () =>
          import('./features/auth/pages/login-page/login-page.component').then(
            (m) => m.LoginPageComponent
          )
      },
      {
        path: 'register',
        redirectTo: () => '/login?modo=registro',
        pathMatch: 'full'
      },
      {
        path: 'catalog',
        title: 'Catálogo · BiblioTech',
        loadComponent: () =>
          import('./features/catalog/pages/catalog-page/catalog-page.component').then(
            (m) => m.CatalogPageComponent
          )
      },
      {
        path: 'catalog/:id',
        title: 'Detalle del libro · BiblioTech',
        loadComponent: () =>
          import('./features/catalog/pages/book-detail-page/book-detail-page.component').then(
            (m) => m.BookDetailPageComponent
          )
      },
      {
        path: 'book/:id',
        redirectTo: (route) => `/catalog/${route.params['id']}`,
        pathMatch: 'full'
      },
      {
        path: 'loans',
        canMatch: [authMatchGuard],
        canActivate: [authGuard],
        title: 'Mis préstamos · BiblioTech',
        loadComponent: () =>
          import('./features/loans/pages/loans-page/loans-page.component').then(
            (m) => m.LoansPageComponent
          )
      },
      {
        path: '**',
        title: 'Página no encontrada · BiblioTech',
        loadComponent: () =>
          import('./features/not-found/pages/no-encontrado-page/no-encontrado-page.component').then(
            (m) => m.NoEncontradoPageComponent
          )
      }
    ]
  }
];
