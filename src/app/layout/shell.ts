import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CartStore } from '../core/cart.store';
import { iniciales } from '../core/format';
import { Keycap } from '../shared/keycap';

@Component({
  selector: 'dg-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Keycap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" routerLink="/" aria-label="DevGear Store, ir al inicio">
          <dg-keycap texto="DG" tono="cobalt" tamano="sm" />
          <span class="brand-name">DevGear</span>
        </a>

        <nav class="nav" aria-label="Principal">
          <a routerLink="/catalogo" routerLinkActive="activo">Catálogo</a>
          <a routerLink="/ordenes" routerLinkActive="activo">Mis órdenes</a>
          @if (auth.hasRole('DESPACHADOR', 'ADMIN')) {
            <a routerLink="/despachos" routerLinkActive="activo">Despachos</a>
          }
        </nav>

        <div class="topbar-actions">
          <a
            class="cart-link"
            routerLink="/carrito"
            routerLinkActive="activo"
            [attr.aria-label]="'Carrito, ' + cart.count() + ' productos'"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
              <path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20.9 8H6.2" />
            </svg>
            <span>Carrito</span>
            @if (cart.count() > 0) {
              <span class="cart-count">{{ cart.count() }}</span>
            }
          </a>

          <a class="user-chip" routerLink="/perfil" routerLinkActive="activo" aria-label="Mi perfil">
            <span class="avatar" aria-hidden="true">{{ inicialesUsuario() }}</span>
            <span class="user-name">{{ auth.nombre() }}</span>
          </a>

          <button class="btn btn-quiet btn-sm" type="button" (click)="auth.logout()">
            Cerrar sesión
          </button>
        </div>
      </div>

      @if (auth.hasRole('ADMIN')) {
        <div class="subbar">
          <nav class="subbar-inner" aria-label="Administración">
            <span class="subbar-title">Administración</span>
            <a routerLink="/admin/productos" routerLinkActive="activo">Productos</a>
            <a routerLink="/admin/ordenes" routerLinkActive="activo">Todas las órdenes</a>
            <a routerLink="/admin/correo" routerLinkActive="activo">Enviar correo</a>
          </nav>
        </div>
      }
    </header>

    <main class="page">
      <router-outlet />
    </main>
  `,
})
export class Shell implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartStore);

  protected readonly inicialesUsuario = computed(() => iniciales(this.auth.nombre()));

  ngOnInit(): void {
    // Carga el carrito una vez para que el contador del encabezado sea correcto desde el inicio.
    this.cart.refresh().subscribe({ error: () => undefined });
  }
}
