import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).homePath() },
      {
        path: 'catalogo',
        loadComponent: () => import('./pages/catalogo').then((m) => m.CatalogoPage),
      },
      {
        path: 'carrito',
        loadComponent: () => import('./pages/carrito').then((m) => m.CarritoPage),
      },
      {
        path: 'ordenes',
        loadComponent: () => import('./pages/ordenes').then((m) => m.OrdenesPage),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil').then((m) => m.PerfilPage),
      },
      {
        path: 'despachos',
        canActivate: [roleGuard('DESPACHADOR', 'ADMIN')],
        loadComponent: () => import('./pages/despachos').then((m) => m.DespachosPage),
      },
      {
        path: 'admin/productos',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./pages/admin-productos').then((m) => m.AdminProductosPage),
      },
      {
        path: 'admin/ordenes',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/admin-ordenes').then((m) => m.AdminOrdenesPage),
      },
      {
        path: 'admin/correo',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/admin-correo').then((m) => m.AdminCorreoPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
